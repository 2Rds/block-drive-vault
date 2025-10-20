import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use the service role key to read subscription data
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });

    let userEmail: string | null = null;
    let userId: string | null = null;

    // Try to authenticate as a regular user first
    try {
      const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
      if (!userError && userData.user) {
        userEmail = userData.user.email;
        userId = userData.user.id;
        logStep("Regular user authenticated", { email: userEmail, userId });
      }
    } catch (error) {
      logStep("Standard auth failed, checking for Dynamic SDK user", { error });
    }

    // If regular auth failed, this might be a Dynamic SDK user or wallet user
    if (!userEmail) {
      // First, try to find by wallet auth tokens - this is the most common case for wallet users
      const { data: walletToken, error: walletError } = await supabaseService
        .from('wallet_auth_tokens')
        .select('wallet_address, user_id')
        .eq('auth_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (walletToken) {
        // Use the wallet address directly as the identifier
        userId = walletToken.user_id || token;
        
        // Set email format based on what we have
        if (walletToken.user_id) {
          userEmail = `${walletToken.user_id}@blockdrive.wallet`;
        } else {
          userEmail = `${walletToken.wallet_address}@blockdrive.wallet`;
        }
        
        logStep("Wallet user authenticated via token", { 
          email: userEmail, 
          userId, 
          walletAddress: walletToken.wallet_address 
        });
      } else {
        // If we couldn't find by wallet_auth_tokens, try other methods
        
        // Try by wallet address directly if token looks like a wallet address
        // This handles the case where token is directly a wallet address
        const { data: walletSignup, error: walletSignupError } = await supabaseService
          .from('user_signups')
          .select('email, subscription_tier')
          .eq('wallet_address', token)
          .maybeSingle();
          
        if (walletSignup) {
          userEmail = walletSignup.email || `${token}@blockdrive.wallet`;
          userId = token;
          logStep("Found wallet user via wallet address in user_signups", { 
            email: userEmail, 
            walletAddress: token,
            subscriptionTier: walletSignup.subscription_tier
          });
        } else {
          // Try with blockdrive.wallet email format
          const possibleEmails = [
            `${token}@blockdrive.wallet`,
          ];
          
          for (const email of possibleEmails) {
            const { data: signup, error: signupError } = await supabaseService
              .from('user_signups')
              .select('email, subscription_tier')
              .eq('email', email)
              .maybeSingle();
              
            if (signup) {
              userEmail = email;
              userId = token;
              logStep("Dynamic SDK user found via signup", { 
                email: userEmail, 
                userId,
                subscriptionTier: signup.subscription_tier 
              });
              break;
            }
          }
          
          if (!userEmail) {
            // Last resort: check if token looks like an email or if there are any subscribers with this pattern
            if (token.includes('@')) {
              userEmail = token;
              userId = token;
              logStep("Using token as email directly", { email: userEmail });
            } else {
              // Try to find any subscriber with this token
              const { data: directSubscriber, error: directSubscriberError } = await supabaseService
                .from('subscribers')
                .select('*')
                .eq('user_id', token)
                .maybeSingle();
                
              if (directSubscriber) {
                userEmail = directSubscriber.email;
                userId = token;
                logStep("Found subscriber directly with user_id", { 
                  email: userEmail, 
                  userId,
                  subscription: directSubscriber.subscription_tier
                });
              } else {
                throw new Error("Unable to authenticate user");
              }
            }
          }
        }
      }
    }

    if (!userEmail) {
      throw new Error("Unable to determine user email");
    }

    // Try to find subscriber by exact email match first
    let subscriber = null;
    let subscriberError = null;
    
    // If we have a Dynamic SDK user, check if there are any subscribers with that exact email
    const { data: subscriberByEmail, error: emailSubscriberError } = await supabaseService
      .from('subscribers')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (emailSubscriberError) {
      logStep("Error querying subscriber by email", emailSubscriberError);
      subscriberError = emailSubscriberError;
    } else if (subscriberByEmail) {
      subscriber = subscriberByEmail;
      logStep("Found subscriber by exact email match", { email: userEmail });
    } else {
      // If no exact match, try alternative email formats
      // For Dynamic SDK users, check if there are subscribers with regular email format
      if (userEmail.endsWith('@blockdrive.wallet') && userId) {
        // Check if there are any real email subscribers for this user
        const { data: realEmailSubscribers, error: realEmailError } = await supabaseService
          .from('user_signups')
          .select('email')
          .eq('wallet_address', userId)
          .maybeSingle();
        
        if (!realEmailError && realEmailSubscribers?.email) {
          // Try to find subscriber with this real email
          const { data: subscriberByRealEmail, error: realEmailSubscriberError } = await supabaseService
            .from('subscribers')
            .select('*')
            .eq('email', realEmailSubscribers.email)
            .maybeSingle();
          
          if (!realEmailSubscriberError && subscriberByRealEmail) {
            subscriber = subscriberByRealEmail;
            logStep("Found subscriber by real email from user_signups", { 
              walletAddress: userId,
              realEmail: realEmailSubscribers.email 
            });
          }
        }
      }
    }

    if (subscriberError) {
      logStep("Error querying subscriber", subscriberError);
      throw new Error(`Database error: ${subscriberError.message}`);
    }

    // Default limits for unsubscribed users
    const defaultLimits = {
      storage: 1,
      bandwidth: 1,
      seats: 1
    };

    // Tier-based limits
    const tierLimits = {
      'starter': { storage: 50, bandwidth: 50, seats: 1 },
      'pro': { storage: 250, bandwidth: 250, seats: 1 },
      'growth': { storage: 500, bandwidth: 500, seats: 3 },
      'scale': { storage: 1000, bandwidth: 1000, seats: 999 },
      'free trial': { storage: 50, bandwidth: 50, seats: 1 }
    };

    if (!subscriber) {
      logStep("No subscriber record found");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        limits: defaultLimits
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if subscription has expired
    const now = new Date();
    const subscriptionEnd = subscriber.subscription_end ? new Date(subscriber.subscription_end) : null;
    const isExpired = subscriptionEnd && subscriptionEnd < now;

    if (isExpired) {
      logStep("Subscription expired", { 
        subscriptionEnd: subscriber.subscription_end, 
        now: now.toISOString() 
      });

      // Update subscriber record to reflect expired status
      await supabaseService
        .from('subscribers')
        .update({ 
          subscribed: false,
          subscription_tier: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_end: subscriber.subscription_end,
        limits: defaultLimits,
        expired: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const tierKey = subscriber.subscription_tier?.toLowerCase() || '';
    const limits = tierLimits[tierKey] || defaultLimits;

    const response = {
      subscribed: subscriber.subscribed || false,
      subscription_tier: subscriber.subscription_tier,
      subscription_end: subscriber.subscription_end,
      limits
    };

    logStep("Subscription status retrieved", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      subscribed: false,
      subscription_tier: null,
      subscription_end: null,
      limits: { storage: 1, bandwidth: 1, seats: 1 }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});