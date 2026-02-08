
export const isDevelopmentMode = () => {
  return window.location.hostname === 'localhost' || window.location.hostname.includes('lovableproject.com');
};

export const createMockUser = () => ({
  id: 'dev-user-123',
  email: 'dev@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: { wallet_address: 'dev-wallet-address' }
});
