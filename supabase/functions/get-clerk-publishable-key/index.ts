import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const publishableKey = Deno.env.get("VITE_CLERK_PUBLISHABLE_KEY");

  if (!publishableKey) {
    return errorResponse("VITE_CLERK_PUBLISHABLE_KEY not set", HTTP_STATUS.INTERNAL_ERROR);
  }

  return jsonResponse({ publishableKey });
});
