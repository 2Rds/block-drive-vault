import { supabase } from "@/integrations/supabase/client";

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  size: number;
  url_private: string;
  created: string;
  user_id: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export interface SlackTeamInfo {
  id: string;
  name: string;
  domain: string;
}

export class SecureSlackService {
  private clientId = "7000743189300.9094403349587"; // Public client ID is safe

  async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
    const scopes = [
      "channels:read",
      "files:read", 
      "files:write",
      "chat:write",
      "users:read",
      "team:read"
    ].join(",");

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      response_type: "code",
      ...(state && { state })
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('slack-oauth', {
      body: { code, redirectUri }
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async checkConnection(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('slack-oauth', {
      method: 'GET'
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async makeSlackAPICall(endpoint: string, method = 'GET', body?: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke('slack-api', {
      body: { endpoint, method, body }
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const result = await this.makeSlackAPICall('auth.test');
      return result.ok === true;
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }

  async getTeamInfo(): Promise<SlackTeamInfo | null> {
    try {
      const result = await this.makeSlackAPICall('team.info');
      
      if (!result.ok) {
        console.error('Failed to fetch team info:', result.error);
        return null;
      }
      
      return result.team;
    } catch (error) {
      console.error('Error fetching team info:', error);
      return null;
    }
  }

  async getChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.makeSlackAPICall('conversations.list?types=public_channel,private_channel');
      
      if (!result.ok) {
        throw new Error(`Failed to fetch channels: ${result.error}`);
      }

      return result.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getFiles(limit: number = 100): Promise<SlackFile[]> {
    try {
      const result = await this.makeSlackAPICall(`files.list?count=${limit}`);
      
      if (!result.ok) {
        throw new Error(`Failed to fetch files: ${result.error}`);
      }

      return result.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  async uploadFileToSlack(file: File, channels: string[], title?: string, initialComment?: string): Promise<any> {
    // Note: File uploads need special handling via FormData, may need separate endpoint
    const formData = new FormData();
    formData.append("file", file);
    formData.append("channels", channels.join(","));
    if (title) formData.append("title", title);
    if (initialComment) formData.append("initial_comment", initialComment);

    // This would need a special endpoint for file uploads that handles FormData
    throw new Error("File upload via Edge Function not yet implemented - requires FormData handling");
  }

  async postMessage(channel: string, text: string, blocks?: any[]): Promise<any> {
    try {
      const payload: any = { channel, text };
      if (blocks) payload.blocks = blocks;

      const result = await this.makeSlackAPICall('chat.postMessage', 'POST', payload);
      
      if (!result.ok) {
        throw new Error(`Failed to post message: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  }

  async isTokenValid(): Promise<boolean> {
    return this.verifyConnection();
  }
}

export const secureSlackService = new SecureSlackService();