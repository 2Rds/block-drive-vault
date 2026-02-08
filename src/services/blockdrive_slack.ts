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
    return authUrl;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    // Deprecated for security - client secret exposure
    throw new Error('Direct OAuth exchange disabled for security. Use secureSlackService instead.');
  }

  async verifyConnection(accessToken: string): Promise<boolean> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct token verification disabled for security. Use secureSlackService instead.');
  }

  async getTeamInfo(accessToken: string): Promise<SlackTeamInfo | null> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct API access disabled for security. Use secureSlackService instead.');
  }

  async getChannels(accessToken: string): Promise<SlackChannel[]> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct API access disabled for security. Use secureSlackService instead.');
  }

  async getFiles(accessToken: string, limit: number = 100): Promise<SlackFile[]> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct API access disabled for security. Use secureSlackService instead.');
  }

  async uploadFileToSlack(accessToken: string, file: File, channels: string[], title?: string, initialComment?: string): Promise<any> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct file upload disabled for security. Use secureSlackService instead.');
  }

  async downloadFileFromSlack(accessToken: string, fileUrl: string): Promise<Blob> {
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct file download disabled for security. Use secureSlackService instead.');
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
    // Deprecated - tokens should not be stored client-side
    throw new Error('Direct message posting disabled for security. Use secureSlackService instead.');
  }

  private async handleRateLimit(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    return this.verifyConnection(accessToken);
  }
}

export const blockdriveSlack = new BlockDriveSlack();