import { vi } from 'vitest';

// Configurable mock responses
let invokeResponse: { data: any; error: any } = { data: null, error: null };
let sessionResponse: { data: { session: any }; error: any } = {
  data: { session: null },
  error: null,
};

export function setMockInvokeResponse(data: any, error: any = null) {
  invokeResponse = { data, error };
}

export function setMockSessionResponse(session: any, error: any = null) {
  sessionResponse = { data: { session }, error };
}

export function resetMockSupabase() {
  invokeResponse = { data: null, error: null };
  sessionResponse = { data: { session: null }, error: null };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => invokeResponse),
    },
    auth: {
      getSession: vi.fn(async () => sessionResponse),
    },
  },
}));
