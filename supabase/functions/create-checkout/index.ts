import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, WALLET_ADDRESS_PATTERNS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";
import { getStripeCustomerByEmail, createCheckoutSession } from "../_shared/stripe.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('CREATE-CHECKOUT');

// Legacy payment links to price ID mapping (deprecated)
const PAYMENT_LINK_TO_PRICE_ID: Record<string, string> = {};

// Valid Stripe price IDs (created 2026-02-04)
const VALID_PRICE_IDS = [
  // Pro tier
  'price_1SxJG0CXWi8NqmFCwwspKiz5', // Pro Monthly $9
  'price_1SxJG0CXWi8NqmFCBCgGULcp', // Pro Quarterly $24
  'price_1SxJG0CXWi8NqmFCT5dNX0or', // Pro Annual $89
  // Power tier
  'price_1SxJG1CXWi8NqmFCP3CJ1SSA', // Power Monthly $49
  'price_1SxJG1CXWi8NqmFCYgrLZOwT', // Power Quarterly $134
  'price_1SxJG1CXWi8NqmFCLaDwUoUY', // Power Annual $499
  // Scale tier (per seat)
  'price_1SxJG2CXWi8NqmFCKYtf8mRC', // Scale Monthly $29/seat
  'price_1SxJG2CXWi8NqmFCCWJLv7Ed', // Scale Quarterly $79/seat
  'price_1SxJG2CXWi8NqmFCk7yinOnh', // Scale Annual $299/seat
];

const PRO_TRIAL_DAYS = 7;
const SCALE_MIN_SEATS = 2;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log("Function started");

    // Parse request body first to check for Clerk user ID
    const body = await req.json();
    const { priceId, tier, hasTrial, clerkUserId } = body;

    let userEmail: string;
    let userId: string;

    // If Clerk user ID is provided in body, use it (for Clerk-authenticated users)
    if (clerkUserId) {
      userId = clerkUserId;
      // Clerk users will provide email during Stripe checkout
      // Use a placeholder that will be updated by Stripe
      userEmail = `${clerkUserId}@clerk.placeholder`;
      log("Clerk user ID provided", { userId, clerkUserId });
    } else {
      // Fall back to token-based authentication
      const token = extractBearerToken(req);
      if (!token) {
        log("No authorization header found and no Clerk user ID");
        return errorResponse("No authorization provided", HTTP_STATUS.UNAUTHORIZED);
      }

      log("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });
      userId = token;

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
    }
    log("Request body parsed", { priceId, tier, hasTrial });

    const actualPriceId = PAYMENT_LINK_TO_PRICE_ID[priceId] || priceId;

    // Price validation - allow any price ID that starts with 'price_' (Stripe format)
    // This allows new prices to work without redeploying the edge function
    if (!actualPriceId.startsWith('price_')) {
      log("Invalid price ID format", { priceId, actualPriceId });
      return errorResponse(`Invalid price ID format: ${actualPriceId}`, HTTP_STATUS.BAD_REQUEST);
    }
    log("Price ID validated", { priceId: actualPriceId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("Stripe secret key not configured");
      return errorResponse("Stripe configuration error", HTTP_STATUS.INTERNAL_ERROR);
    }

    const isWalletUser = userEmail.endsWith('@blockdrive.wallet');
    const isClerkUser = userEmail.endsWith('@clerk.placeholder');
    const supabaseService = getSupabaseServiceClient();
    let customerId: string | undefined;

    // For regular users (not wallet or Clerk), try to find existing Stripe customer
    if (!isWalletUser && !isClerkUser) {
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
    } else if (isClerkUser) {
      log("Clerk user detected, will collect email during checkout");
    } else {
      log("Wallet user detected, will collect email during checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Scale tier requires minimum 2 seats
    const isScaleTier = tier?.toLowerCase() === 'scale';
    const quantity = isScaleTier ? SCALE_MIN_SEATS : 1;
    if (isScaleTier) {
      log("Scale tier detected, enforcing minimum seats", { quantity: SCALE_MIN_SEATS });
    }

    const sessionData = new URLSearchParams({
      'line_items[0][price]': actualPriceId,
      'line_items[0][quantity]': String(quantity),
      'mode': 'subscription',
      'success_url': `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${origin}/pricing`,
      'allow_promotion_codes': 'true',
      // Session metadata (for verification)
      'metadata[user_id]': userId,
      'metadata[tier]': tier,
      'metadata[wallet_user]': isWalletUser ? 'true' : 'false',
      // Subscription metadata (persists with the subscription)
      'subscription_data[metadata][tier]': tier,
      'subscription_data[metadata][user_id]': userId,
    });

    if (customerId) {
      sessionData.append('customer', customerId);
    } else if (isWalletUser || isClerkUser) {
      // For wallet and Clerk users, let Stripe collect email during checkout
      sessionData.append('billing_address_collection', 'required');
    } else {
      sessionData.append('customer_email', userEmail);
    }

    if (hasTrial && tier === 'Pro') {
      sessionData.append('subscription_data[trial_period_days]', String(PRO_TRIAL_DAYS));
      log("Added trial period for Pro tier", { days: PRO_TRIAL_DAYS });
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
