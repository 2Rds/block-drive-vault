import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, TIME_MS, SECURITY_EVENT_THRESHOLD } from '../_shared/constants.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface SecurityLogRequest {
  eventType: string;
  details: Record<string, unknown>;
  severity: Severity;
}

const VALID_SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const ESCALATION_EVENT_TYPES = ['rate_limit_exceeded', 'invalid_wallet_validation', 'session_hijacking_detected'];

function getClientInfo(req: Request): { ip: string; userAgent: string; referer: string } {
  return {
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    referer: req.headers.get('referer') || 'none'
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { eventType, details, severity }: SecurityLogRequest = await req.json();

    if (!eventType || !details || !severity) {
      return errorResponse('Missing required fields', HTTP_STATUS.BAD_REQUEST);
    }

    if (!VALID_SEVERITIES.includes(severity)) {
      return errorResponse('Invalid severity level', HTTP_STATUS.BAD_REQUEST);
    }

    const clientInfo = getClientInfo(req);
    const identifier = (details.userId as string) || clientInfo.ip;

    const enhancedDetails = {
      ...details,
      client_ip: clientInfo.ip,
      server_timestamp: new Date().toISOString(),
      user_agent: clientInfo.userAgent,
      referer: clientInfo.referer
    };

    const { error: logError } = await supabase
      .from('security_logs')
      .insert({
        event_type: eventType,
        identifier,
        details: enhancedDetails,
        severity,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error inserting security log:', logError);
      return errorResponse('Failed to log security event', HTTP_STATUS.INTERNAL_ERROR);
    }

    if (severity === 'critical') {
      console.error(`[CRITICAL SECURITY EVENT] ${eventType}:`, enhancedDetails);
    }

    if (ESCALATION_EVENT_TYPES.includes(eventType)) {
      const oneHourAgo = new Date(Date.now() - TIME_MS.HOUR).toISOString();

      const { data: recentEvents, error: countError } = await supabase
        .from('security_logs')
        .select('id')
        .eq('event_type', eventType)
        .eq('identifier', identifier)
        .gte('created_at', oneHourAgo);

      if (!countError && recentEvents && recentEvents.length >= SECURITY_EVENT_THRESHOLD) {
        await supabase
          .from('security_logs')
          .insert({
            event_type: 'repeated_security_violations',
            identifier,
            details: {
              original_event: eventType,
              occurrence_count: recentEvents.length,
              time_window: '1 hour',
              escalated_at: new Date().toISOString()
            },
            severity: 'critical',
            created_at: new Date().toISOString()
          });

        console.error(`[ESCALATED SECURITY THREAT] Repeated ${eventType} from ${identifier}`);
      }
    }

    return jsonResponse({ success: true, logged: true });

  } catch (error) {
    console.error('Security logging error:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
