import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, SUBSCRIPTION_TIERS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, extractBearerToken } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('CHECK-SUBSCRIPTION');

const TIER_LIMITS: Record<string, { storage: number; bandwidth: number; seats: number }> = {
  starter: SUBSCRIPTION_TIERS.STARTER,
  pro: SUBSCRIPTION_TIERS.PRO,
  growth: SUBSCRIPTION_TIERS.GROWTH,
  scale: SUBSCRIPTION_TIERS.SCALE,
  'free trial': SUBSCRIPTION_TIERS.FREE_TRIAL,
  free_trial: SUBSCRIPTION_TIERS.FREE_TRIAL,
};

function getLimitsForTier(tier: string | null): { storage: number; bandwidth: number; seats: number } {
  if (!tier) return SUBSCRIPTION_TIERS.DEFAULT;
  return TIER_LIMITS[tier.toLowerCase()] || SUBSCRIPTION_TIERS.DEFAULT;
}

async function findUserEmail(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  token: string
): Promise<{ email: string | null; userId: string | null }> {
  const { data: walletToken } = await supabase
    .from('wallet_auth_tokens')
    .select('wallet_address, user_id')
    .eq('auth_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (walletToken) {
    const userId = walletToken.user_id || token;
    const email = walletToken.user_id
      ? `${walletToken.user_id}@blockdrive.wallet`
      : `${walletToken.wallet_address}@blockdrive.wallet`;
    log("Wallet user authenticated via token", { email, userId, walletAddress: walletToken.wallet_address });
    return { email, userId };
  }

  const { data: walletSignup } = await supabase
    .from('user_signups')
    .select('email, subscription_tier')
    .eq('wallet_address', token)
    .maybeSingle();

  if (walletSignup) {
    const email = walletSignup.email || `${token}@blockdrive.wallet`;
    log("Found wallet user via wallet address in user_signups", { email, walletAddress: token });
    return { email, userId: token };
  }

  const { data: directSubscriber } = await supabase
    .from('subscribers')
    .select('email')
    .eq('user_id', token)
    .maybeSingle();

  if (directSubscriber) {
    log("Found subscriber directly with user_id", { email: directSubscriber.email, userId: token });
    return { email: directSubscriber.email, userId: token };
  }

  if (token.includes('@')) {
    log("Using token as email directly", { email: token });
    return { email: token, userId: token };
  }

  throw new Error("Unable to authenticate user");
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log("Function started");

    const supabaseService = getSupabaseServiceClient();
    const token = extractBearerToken(req);

    if (!token) {
      throw new Error("No authorization header provided");
    }

    log("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });

    let userEmail: string | null = null;
    let userId: string | null = null;

    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (!userError && userData.user) {
      userEmail = userData.user.email ?? null;
      userId = userData.user.id;
      log("Regular user authenticated", { email: userEmail, userId });
    } else {
      const result = await findUserEmail(supabaseService, token);
      userEmail = result.email;
      userId = result.userId;
    }

    if (!userEmail) {
      throw new Error("Unable to determine user email");
    }

    const { data: subscriber, error: subscriberError } = await supabaseService
      .from('subscribers')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (subscriberError) {
      log("Error querying subscriber", subscriberError);
      throw new Error(`Database error: ${subscriberError.message}`);
    }

    if (!subscriber && userEmail.endsWith('@blockdrive.wallet') && userId) {
      const { data: realEmailSignup } = await supabaseService
        .from('user_signups')
        .select('email')
        .eq('wallet_address', userId)
        .maybeSingle();

      if (realEmailSignup?.email) {
        const { data: realSubscriber } = await supabaseService
          .from('subscribers')
          .select('*')
          .eq('email', realEmailSignup.email)
          .maybeSingle();

        if (realSubscriber) {
          log("Found subscriber by real email from user_signups", { walletAddress: userId, realEmail: realEmailSignup.email });
          return buildResponse(realSubscriber, userEmail, supabaseService);
        }
      }
    }

    if (!subscriber) {
      log("No subscriber record found");
      return jsonResponse({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        limits: SUBSCRIPTION_TIERS.DEFAULT
      });
    }

    return buildResponse(subscriber, userEmail, supabaseService);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return jsonResponse({
      error: errorMessage,
      subscribed: false,
      subscription_tier: null,
      subscription_end: null,
      limits: SUBSCRIPTION_TIERS.DEFAULT
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});

async function buildResponse(
  subscriber: Record<string, unknown>,
  userEmail: string,
  supabase: ReturnType<typeof getSupabaseServiceClient>
): Promise<Response> {
  const now = new Date();
  const subscriptionEnd = subscriber.subscription_end ? new Date(subscriber.subscription_end as string) : null;
  const isExpired = subscriptionEnd && subscriptionEnd < now;

  if (isExpired) {
    log("Subscription expired", { subscriptionEnd: subscriber.subscription_end, now: now.toISOString() });

    await supabase
      .from('subscribers')
      .update({
        subscribed: false,
        subscription_tier: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail);

    return jsonResponse({
      subscribed: false,
      subscription_tier: null,
      subscription_end: subscriber.subscription_end,
      limits: SUBSCRIPTION_TIERS.DEFAULT,
      expired: true
    });
  }

  const limits = getLimitsForTier(subscriber.subscription_tier as string | null);

  const response = {
    subscribed: subscriber.subscribed || false,
    subscription_tier: subscriber.subscription_tier,
    subscription_end: subscriber.subscription_end,
    limits
  };

  log("Subscription status retrieved", response);
  return jsonResponse(response);
}
