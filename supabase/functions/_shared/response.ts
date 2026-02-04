import { corsHeaders } from './cors.ts';

export type ResponseData = Record<string, unknown> | unknown[];

export function jsonResponse(data: ResponseData, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message, success: false }, status);
}

export function successResponse(data: ResponseData = {}): Response {
  return jsonResponse({ success: true, ...data });
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
