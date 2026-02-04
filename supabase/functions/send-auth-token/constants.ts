export { corsHeaders } from '../_shared/cors.ts';

export function generateToken(): string {
  return 'sbt_' + Math.random().toString(36).substr(2, 32) + '_' + Date.now().toString(36);
}
