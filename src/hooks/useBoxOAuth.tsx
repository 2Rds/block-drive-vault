import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useBoxOAuth = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already connected to Box
    const boxAccessToken = localStorage.getItem('box_access_token');
    if (boxAccessToken) {
      setIsConnected(true);
      return;
    }

    // Handle OAuth callback when landing on dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('box_oauth_state');
    
    if (code && state && state === storedState) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    console.log('Processing Box OAuth callback...');
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('box-integration', {
        body: { action: 'exchange_code', code }
      });

      if (error) throw error;

      localStorage.setItem('box_access_token', data.access_token);
      localStorage.removeItem('box_oauth_state');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setIsConnected(true);
      
      toast({
        title: "Connected to Box",
        description: "Successfully connected to your Box account. You can now access your Box files.",
      });
      
    } catch (error) {
      console.error('Box OAuth callback error:', error);
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