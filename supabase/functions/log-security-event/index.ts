import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityLogRequest {
  eventType: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const { eventType, details, severity }: SecurityLogRequest = await req.json();

    // Validate request
    if (!eventType || !details || !severity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate severity level
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return new Response(
        JSON.stringify({ error: 'Invalid severity level' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get client IP for additional context
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Enhanced details with server-side context
    const enhancedDetails = {
      ...details,
      client_ip: clientIP,
      server_timestamp: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || 'unknown',
      referer: req.headers.get('referer') || 'none'
    };

    // Log to security_logs table
    const { error: logError } = await supabase
      .from('security_logs')
      .insert({
        event_type: eventType,
        identifier: details.userId || clientIP,
        details: enhancedDetails,
        severity,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error inserting security log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to log security event' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // For critical events, also log to console for immediate attention
    if (severity === 'critical') {
      console.error(`[CRITICAL SECURITY EVENT] ${eventType}:`, enhancedDetails);
    }

    // Check if this is a pattern of suspicious activity
    if (['rate_limit_exceeded', 'invalid_wallet_validation', 'session_hijacking_detected'].includes(eventType)) {
      // Check for repeated events from same identifier in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentEvents, error: countError } = await supabase
        .from('security_logs')
        .select('id')
        .eq('event_type', eventType)
        .eq('identifier', details.userId || clientIP)
        .gte('created_at', oneHourAgo);

      if (!countError && recentEvents && recentEvents.length >= 5) {
        // Log escalated security event
        await supabase
          .from('security_logs')
          .insert({
            event_type: 'repeated_security_violations',
            identifier: details.userId || clientIP,
            details: {
              original_event: eventType,
              occurrence_count: recentEvents.length,
              time_window: '1 hour',
              escalated_at: new Date().toISOString()
            },
            severity: 'critical',
            created_at: new Date().toISOString()
          });

        console.error(`[ESCALATED SECURITY THREAT] Repeated ${eventType} from ${details.userId || clientIP}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, logged: true }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Security logging error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});