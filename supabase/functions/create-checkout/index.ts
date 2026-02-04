import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, WALLET_ADDRESS_PATTERNS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";
import { getStripeCustomerByEmail, createCheckoutSession } from "../_shared/stripe.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('CREATE-CHECKOUT');

const PAYMENT_LINK_TO_PRICE_ID: Record<string, string> = {
  'https://pay.blockdrive.co/b/00wbJ0261fixdp59YG2VG07': 'price_1RfquDCXWi8NqmFCLUCGHtkZ',
  'https://pay.blockdrive.co/b/00waIQeAKaLqx82Fzq8bM3': 'price_1Rfr9KCXWi8NqmFCoglqEMRH',
  'https://pay.blockdrive.co/b/00waIQeAKaLqx82Fzr9cM4': 'price_1RfrEICXWi8NqmFChG0fYrRy',
  'https://pay.blockdrive.co/b/00waIQeAKaLqx82Fzs0dM5': 'price_1RfrzdCXWi8NqmFCzAJZnHjF',
};

const VALID_PRICE_IDS = [
  'price_1RfquDCXWi8NqmFCLUCGHtkZ',
  'price_1Rfr9KCXWi8NqmFCoglqEMRH',
  'price_1RfrEICXWi8NqmFChG0fYrRy',
  'price_1RfrzdCXWi8NqmFCzAJZnHjF',
];

const STARTER_TRIAL_DAYS = 7;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log("Function started");

    const token = extractBearerToken(req);
    if (!token) {
      log("No authorization header found");
      return errorResponse("No authorization header provided", HTTP_STATUS.UNAUTHORIZED);
    }

    log("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });

    let userEmail: string;
    let userId = token;

    if (WALLET_ADDRESS_PATTERNS.UUID.test(token)) {
      log("Wallet authentication detected", { userId });
      userEmail = `${userId}@blockdrive.wallet`;
    } else {
      const supabaseClient = getSupabaseClient();
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError || !userData.user) {
        log("Standard auth failed, treating as wallet auth", { error: userError?.message });
        userEmail = `${userId}@blockdrive.wallet`;
      } else {
        userId = userData.user.id;
        userEmail = userData.user.email || `${userId}@blockdrive.wallet`;
        log("Standard authentication successful", { userId, email: userEmail });
      }
    }

    const { priceId, tier, hasTrial } = await req.json();
    log("Request body parsed", { priceId, tier, hasTrial });

    const actualPriceId = PAYMENT_LINK_TO_PRICE_ID[priceId] || priceId;

    if (!VALID_PRICE_IDS.includes(actualPriceId)) {
      log("Invalid price ID", { priceId, actualPriceId });
      return errorResponse(`Invalid price ID: ${actualPriceId}`, HTTP_STATUS.BAD_REQUEST);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("Stripe secret key not configured");
      return errorResponse("Stripe configuration error", HTTP_STATUS.INTERNAL_ERROR);
    }

    const isWalletUser = userEmail.endsWith('@blockdrive.wallet');
    const supabaseService = getSupabaseServiceClient();
    let customerId: string | undefined;

    if (!isWalletUser) {
      const { customerId: foundCustomerId, fromSync } = await getStripeCustomerByEmail(
        supabaseService,
        userEmail,
        stripeKey
      );

      if (foundCustomerId) {
        customerId = foundCustomerId;
        log("Existing customer found", { customerId, fromSync });
      } else {
        log("No existing customer, will create during checkout");
      }
    } else {
      log("Wallet user detected, will collect email during checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const sessionData = new URLSearchParams({
      'line_items[0][price]': actualPriceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${origin}/pricing`,
      'metadata[user_id]': userId,
      'metadata[tier]': tier,
      'metadata[wallet_user]': isWalletUser ? 'true' : 'false',
    });

    if (customerId) {
      sessionData.append('customer', customerId);
    } else if (isWalletUser) {
      sessionData.append('billing_address_collection', 'required');
    } else {
      sessionData.append('customer_email', userEmail);
    }

    if (hasTrial && tier === 'Starter') {
      sessionData.append('subscription_data[trial_period_days]', String(STARTER_TRIAL_DAYS));
      log("Added trial period for Starter tier", { days: STARTER_TRIAL_DAYS });
    }

    const session = await createCheckoutSession(stripeKey, sessionData);
    log("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR in create-checkout", { message: errorMessage });
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
