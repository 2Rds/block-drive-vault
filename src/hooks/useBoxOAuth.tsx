import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useBoxOAuth = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('useBoxOAuth: useEffect triggered');
    console.log('useBoxOAuth: Current URL:', window.location.href);
    
    // Handle OAuth callback when landing on dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('box_oauth_state');
    
    console.log('useBoxOAuth: URL params check:', { 
      code: code ? 'present' : 'missing', 
      state: state ? 'present' : 'missing',
      storedState: storedState ? 'present' : 'missing',
      stateMatch: state === storedState
    });
    
    if (code && state && state === storedState) {
      console.log('useBoxOAuth: OAuth callback detected, processing...');
      handleOAuthCallback(code);
      return;
    }

    // Check if user is already connected to Box
    const boxAccessToken = localStorage.getItem('box_access_token');
    console.log('useBoxOAuth: Existing token check:', boxAccessToken ? 'found' : 'not found');
    if (boxAccessToken) {
      console.log('useBoxOAuth: Setting connected to true');
      setIsConnected(true);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    console.log('useBoxOAuth: Processing Box OAuth callback with code:', code);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('useBoxOAuth: Calling box-integration edge function...');
      const { data, error } = await supabase.functions.invoke('box-integration', {
        body: { action: 'exchange_code', code }
      });

      console.log('useBoxOAuth: Edge function response:', { data, error });

      if (error) {
        console.error('useBoxOAuth: Edge function error:', error);
        throw error;
      }

      if (!data?.access_token) {
        console.error('useBoxOAuth: No access token in response:', data);
        throw new Error('No access token received');
      }

      console.log('useBoxOAuth: Storing access token and cleaning up...');
      localStorage.setItem('box_access_token', data.access_token);
      localStorage.removeItem('box_oauth_state');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setIsConnected(true);
      console.log('useBoxOAuth: Connection successful!');
      
      toast({
        title: "Connected to Box",
        description: "Successfully connected to your Box account. You can now access your Box files.",
      });
      
    } catch (error) {
      console.error('useBoxOAuth: OAuth callback error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to complete Box connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('box_access_token');
    setIsConnected(false);
    
    toast({
      title: "Disconnected from Box",
      description: "Successfully disconnected from your Box account.",
    });
  };

  return {
    isConnected,
    loading,
    disconnect
  };
};