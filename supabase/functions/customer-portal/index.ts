import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, extractBearerToken } from "../_shared/auth.ts";
import { getStripeCustomerByEmail, createBillingPortalSession } from "../_shared/stripe.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('CUSTOMER-PORTAL');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = getSupabaseServiceClient();

    const token = extractBearerToken(req);
    if (!token) throw new Error("No authorization header provided");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    log("User authenticated", { userId: user.id, email: user.email });

    const { customerId, fromSync } = await getStripeCustomerByEmail(
      supabaseClient,
      user.email,
      stripeKey
    );

    if (!customerId) {
      throw new Error("No Stripe customer found for this user");
    }

    log("Found Stripe customer", { customerId, fromSync });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await createBillingPortalSession(stripeKey, customerId, `${origin}/dashboard`);

    log("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR in customer-portal", { message: errorMessage });
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
