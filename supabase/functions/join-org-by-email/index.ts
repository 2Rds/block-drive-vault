import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import { getSupabaseServiceClient, getClerkUserId, getClerkUserEmail } from '../_shared/auth.ts';
import { HTTP_STATUS } from '../_shared/constants.ts';

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const clerkUserId = getClerkUserId(req);
    const email = getClerkUserEmail(req);

    if (!email) {
      return errorResponse('No email found in authentication token', HTTP_STATUS.BAD_REQUEST);
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return errorResponse('Invalid email format', HTTP_STATUS.BAD_REQUEST);
    }

    // Find an organization with this verified email domain
    const { data: domainRow, error: domainErr } = await supabase
      .from('organization_email_domains')
      .select('organization_id, default_role')
      .eq('domain', domain)
      .maybeSingle();

    if (domainErr) {
      console.error('[join-org-by-email] Domain lookup error:', domainErr);
      return errorResponse('Failed to check email domain', HTTP_STATUS.INTERNAL_ERROR);
    }

    if (!domainRow) {
      return successResponse({ joined: false, reason: 'no_matching_domain' });
    }

    // Get organization details
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, subdomain')
      .eq('id', domainRow.organization_id)
      .single();

    if (orgErr || !org) {
      console.error('[join-org-by-email] Org lookup error:', orgErr);
      return errorResponse('Organization not found', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', org.id)
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    const role = domainRow.default_role || 'member';

    if (existingMember) {
      return successResponse({
        joined: true,
        alreadyMember: true,
        organization: { id: org.id, name: org.name, subdomain: org.subdomain },
        role,
      });
    }

    // Add user to the organization
    const { error: insertErr } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        clerk_user_id: clerkUserId,
        role,
        join_method: 'email_domain_auto',
      });

    if (insertErr) {
      console.error('[join-org-by-email] Member insert error:', insertErr);
      return errorResponse('Failed to join organization', HTTP_STATUS.INTERNAL_ERROR);
    }

    return successResponse({
      joined: true,
      alreadyMember: false,
      organization: { id: org.id, name: org.name, subdomain: org.subdomain },
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[join-org-by-email] Error:', message);
    return errorResponse(message, HTTP_STATUS.BAD_REQUEST);
  }
});
