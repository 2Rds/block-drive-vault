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

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
}

export class BlockDriveSlack {
  private clientId = "7000743189300.9094403349587"; // Public client ID is safe
  private baseUrl = "https://slack.com/api";
  
  constructor() {
    console.warn('BlockDriveSlack is deprecated for security. Use secureSlackService instead.');
  }

  async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
    console.log('Generating OAuth URL with:', { redirectUri, state });
    
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

    const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    console.log('Generated OAuth URL:', authUrl);
    return authUrl;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    // Deprecated for security - client secret exposure
    throw new Error('Direct OAuth exchange disabled for security. Use secureSlackService instead.');

      console.log('Token exchange response status:', response.status);
      const data = await response.json();
      console.log('Token exchange response:', { 
        ok: data.ok, 
        error: data.error,
        warning: data.warning,
        hasAccessToken: !!data.access_token 
      });
      
      if (!response.ok || !data.ok) {
        const errorMsg = `OAuth exchange failed: ${data.error || data.warning || 'Unknown error'}`;
        console.error(errorMsg, data);
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  async verifyConnection(accessToken: string): Promise<boolean> {
    console.log('Verifying Slack connection...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      console.log('Connection verification result:', { ok: data.ok, error: data.error });
      return data.ok === true;
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }

  async getTeamInfo(accessToken: string): Promise<SlackTeamInfo | null> {
    console.log('Fetching team info...');
    
    try {
      const response = await fetch(`${this.baseUrl}/team.info`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      console.log('Team info response:', { ok: data.ok, error: data.error });
      
      if (!data.ok) {
        console.error('Failed to fetch team info:', data.error);
        return null;
      }
      
      return data.team;
    } catch (error) {
      console.error('Error fetching team info:', error);
      return null;
    }
  }

  async getChannels(accessToken: string): Promise<SlackChannel[]> {
    console.log('Fetching channels...');
    
    try {
      const response = await fetch(`${this.baseUrl}/conversations.list?types=public_channel,private_channel`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      console.log('Channels response:', { ok: data.ok, error: data.error, count: data.channels?.length || 0 });
      
      if (!data.ok) {
        throw new Error(`Failed to fetch channels: ${data.error}`);
      }

      return data.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getFiles(accessToken: string, limit: number = 100): Promise<SlackFile[]> {
    console.log('Fetching files...');
    
    try {
      const response = await fetch(`${this.baseUrl}/files.list?count=${limit}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      console.log('Files response:', { ok: data.ok, error: data.error, count: data.files?.length || 0 });
      
      if (!data.ok) {
        throw new Error(`Failed to fetch files: ${data.error}`);
      }

      return data.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  async uploadFileToSlack(accessToken: string, file: File, channels: string[], title?: string, initialComment?: string): Promise<any> {
    console.log('Uploading file to Slack:', { fileName: file.name, channels, title });
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("channels", channels.join(","));
      if (title) formData.append("title", title);
      if (initialComment) formData.append("initial_comment", initialComment);

      const response = await fetch(`${this.baseUrl}/files.upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('File upload response:', { ok: data.ok, error: data.error });
      
      if (!data.ok) {
        throw new Error(`Upload failed: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async downloadFileFromSlack(accessToken: string, fileUrl: string): Promise<Blob> {
    console.log('Downloading file from Slack:', fileUrl);
    
    try {
      const response = await fetch(fileUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async syncSlackFiles(accessToken: string, userId: string): Promise<void> {
    console.log('Syncing Slack files to Supabase...');
    
    try {
      const files = await this.getFiles(accessToken);
      console.log('Files to sync:', files.length);
      
      for (const file of files) {
        const { error } = await supabase
          .from('BlockDrive-Slack' as any)
          .upsert({
            id: file.id,
            name: file.name,
            title: file.title || file.name,
            mimetype: file.mimetype,
            size: file.size,
            url_private: file.url_private,
            created: file.created,
            user_id: userId
          } as any);

        if (error) {
          console.error("Error syncing file:", error);
        }
      }
      
      console.log('File sync completed');
    } catch (error) {
      console.error("Error syncing Slack files:", error);
      throw error;
    }
  }

  async postMessage(accessToken: string, channel: string, text: string, blocks?: any[]): Promise<any> {
    console.log('Posting message to Slack:', { channel, text: text.substring(0, 50) + '...' });
    
    try {
      const payload: any = {
        channel,
        text
      };

      if (blocks) {
        payload.blocks = blocks;
      }

      const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Message post response:', { ok: data.ok, error: data.error });
      
      if (!data.ok) {
        throw new Error(`Failed to post message: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  }

  private async handleRateLimit(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      console.log(`Rate limited. Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    return this.verifyConnection(accessToken);
  }
}

export const blockdriveSlack = new BlockDriveSlack();
