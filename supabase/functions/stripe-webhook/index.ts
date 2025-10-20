import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature || !webhookSecret) {
      logStep("No signature or webhook secret found");
      return new Response(JSON.stringify({ error: "Webhook signature missing" }), {
        status: 400,
      });
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
      });
    }

    // Initialize Supabase client with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          trialEnd: subscription.trial_end
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const customerEmail = customer.email;
        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Determine tier from price
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        
        let subscriptionTier = "Starter";
        if (amount <= 999) {
          subscriptionTier = "Starter";
        } else if (amount <= 2999) {
          subscriptionTier = "Pro";
        } else if (amount <= 5999) {
          subscriptionTier = "Growth";
        } else {
          subscriptionTier = "Scale";
        }

        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';

        // Update subscriber record
        const { error: updateError } = await supabaseService
          .from('subscribers')
          .upsert({
            email: customerEmail,
            stripe_customer_id: subscription.customer as string,
            subscribed: isActive,
            subscription_tier: isActive ? subscriptionTier : null,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        if (updateError) {
          logStep("Error updating subscriber", updateError);
        } else {
          logStep("Subscriber updated successfully", { 
            email: customerEmail, 
            tier: subscriptionTier,
            isActive 
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription deletion", { subscriptionId: subscription.id });

        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const customerEmail = customer.email;
        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Mark subscription as inactive
        const { error: updateError } = await supabaseService
          .from('subscribers')
          .update({
            subscribed: false,
            subscription_tier: null,
            updated_at: new Date().toISOString(),
          })
          .eq('email', customerEmail);

        if (updateError) {
          logStep("Error updating subscriber", updateError);
        } else {
          logStep("Subscription deactivated", { email: customerEmail });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id });

        if (!invoice.subscription) {
          logStep("No subscription associated with invoice");
          break;
        }

        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const customerEmail = customer.email;
        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Ensure subscription is marked as active
        const { error: updateError } = await supabaseService
          .from('subscribers')
          .update({
            subscribed: true,
            can_upload_files: true,
            updated_at: new Date().toISOString(),
          })
          .eq('email', customerEmail);

        if (updateError) {
          logStep("Error updating subscriber", updateError);
        } else {
          logStep("Payment confirmed, subscription active", { email: customerEmail });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });

        if (!invoice.subscription) {
          logStep("No subscription associated with invoice");
          break;
        }

        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if (customer.deleted) {
          logStep("Customer was deleted, skipping");
          break;
        }

        const customerEmail = customer.email;
        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Optionally disable access after payment failure
        // For now, we'll just log it - Stripe will retry and eventually cancel
        logStep("Payment failed for customer", { email: customerEmail });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
