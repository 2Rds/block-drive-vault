
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const generateToken = (): string => {
  return 'sbt_' + Math.random().toString(36).substr(2, 32) + '_' + Date.now().toString(36);
};
