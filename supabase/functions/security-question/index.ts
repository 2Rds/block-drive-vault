import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getClerkUserId(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');
  const token = authHeader.replace('Bearer ', '');
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.sub;
  if (!userId) throw new Error('Invalid token: no sub claim');
  return userId;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clerkUserId = getClerkUserId(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'setup') {
      const { question, answer } = body;
      if (!question || !answer) {
        throw new Error('Question and answer are required');
      }

      const answerHash = await sha256Hex(answer.trim().toLowerCase());

      const { error } = await supabase
        .from('security_questions')
        .upsert({
          clerk_user_id: clerkUserId,
          question,
          answer_hash: answerHash,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id' });

      if (error) throw new Error(`Database error: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { answer } = body;
      if (!answer) throw new Error('Answer is required');

      const answerHash = await sha256Hex(answer.trim().toLowerCase());

      const { data, error } = await supabase
        .from('security_questions')
        .select('answer_hash')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (error) throw new Error(`Database error: ${error.message}`);
      if (!data) throw new Error('No security question set up');

      const verified = data.answer_hash === answerHash;

      return new Response(
        JSON.stringify({ success: true, verified }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get') {
      const { data, error } = await supabase
        .from('security_questions')
        .select('question')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (error) throw new Error(`Database error: ${error.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          hasQuestion: !!data,
          question: data?.question || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset') {
      const { new_question, new_answer } = body;
      if (!new_question || !new_answer) {
        throw new Error('New question and answer are required');
      }

      // Phase 1: simple reset (no token verification yet — recovery flow TBD)
      const answerHash = await sha256Hex(new_answer.trim().toLowerCase());

      const { error } = await supabase
        .from('security_questions')
        .upsert({
          clerk_user_id: clerkUserId,
          question: new_question,
          answer_hash: answerHash,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id' });

      if (error) throw new Error(`Database error: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
