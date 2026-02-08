export function createLogger(prefix: string) {
  return function log(step: string, details?: unknown): void {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[${prefix}] ${step}${detailsStr}`);
  };
}
