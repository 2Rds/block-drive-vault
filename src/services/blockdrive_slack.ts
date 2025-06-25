
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
  private clientId = "7000743189300.9094403349587";
  private clientSecret = "27eac3369ca9e7bd0184c6f1b0ab1ec5";
  private baseUrl = "https://slack.com/api";

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
    try {
      const response = await fetch(`${this.baseUrl}/oauth.v2.access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`OAuth exchange failed: ${data.error || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  async verifyConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }

  async getTeamInfo(accessToken: string): Promise<SlackTeamInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/team.info`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      return data.ok ? data.team : null;
    } catch (error) {
      console.error('Error fetching team info:', error);
      return null;
    }
  }

  async getChannels(accessToken: string): Promise<SlackChannel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations.list?types=public_channel,private_channel`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
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
    try {
      const response = await fetch(`${this.baseUrl}/files.list?count=${limit}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      
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
    try {
      const files = await this.getFiles(accessToken);
      
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
    } catch (error) {
      console.error("Error syncing Slack files:", error);
      throw error;
    }
  }

  async postMessage(accessToken: string, channel: string, text: string, blocks?: any[]): Promise<any> {
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
      
      if (!data.ok) {
        throw new Error(`Failed to post message: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  }

  // Helper method to handle rate limiting
  private async handleRateLimit(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      console.log(`Rate limited. Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Utility method to check if token is still valid
  async isTokenValid(accessToken: string): Promise<boolean> {
    return this.verifyConnection(accessToken);
  }
}

export const blockdriveSlack = new BlockDriveSlack();
