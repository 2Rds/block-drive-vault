import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createLogger } from './logger.ts';

const log = createLogger('STRIPE');

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export async function getStripeCustomerByEmail(
  supabase: SupabaseClient,
  email: string,
  stripeKey: string
): Promise<{ customerId: string | null; fromSync: boolean }> {
  try {
    const { data: syncedCustomer, error } = await supabase
      .rpc('get_stripe_customer_by_email', { customer_email: email });

    if (!error && syncedCustomer && syncedCustomer.length > 0) {
      log("Customer loaded from sync table", { email, customerId: syncedCustomer[0].id });
      return { customerId: syncedCustomer[0].id, fromSync: true };
    }

    log("Customer not in sync table, checking Stripe API", { email });
  } catch (err) {
    log("Sync table query failed, falling back to API", { error: err });
  }

  const response = await fetch(
    `${STRIPE_API_BASE}/customers?email=${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    log("Stripe API error during customer lookup", { status: response.status });
    return { customerId: null, fromSync: false };
  }

  const customersData = await response.json();
  if (customersData.data.length > 0) {
    log("Customer found via Stripe API", { customerId: customersData.data[0].id });
    return { customerId: customersData.data[0].id, fromSync: false };
  }

  return { customerId: null, fromSync: false };
}

export async function createCheckoutSession(
  stripeKey: string,
  params: URLSearchParams
): Promise<{ id: string; url: string }> {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Stripe checkout error: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

export async function createBillingPortalSession(
  stripeKey: string,
  customerId: string,
  returnUrl: string
): Promise<{ id: string; url: string }> {
  const response = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Stripe portal error: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}
