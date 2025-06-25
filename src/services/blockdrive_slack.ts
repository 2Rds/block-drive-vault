
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

export class BlockDriveSlack {
  private clientId = "7000743189300.9094403349587";
  private appToken = "xapp-1-A092SBVA9H9-9087091029207-c53b2f4026ce3b9cebdf84fdb37754e63c83ab6aea110c528d453b2992d6b269";
  private baseUrl = "https://slack.com/api";

  async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
    const scopes = [
      "channels:read",
      "files:read",
      "files:write",
      "chat:write",
      "users:read"
    ].join(",");

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      ...(state && { state })
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/oauth.v2.access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${this.appToken}`
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code,
        redirect_uri: redirectUri
      })
    });

    return response.json();
  }

  async getChannels(accessToken: string): Promise<SlackChannel[]> {
    const response = await fetch(`${this.baseUrl}/conversations.list`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return data.channels || [];
  }

  async getFiles(accessToken: string): Promise<SlackFile[]> {
    const response = await fetch(`${this.baseUrl}/files.list`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return data.files || [];
  }

  async uploadFileToSlack(accessToken: string, file: File, channels: string[], title?: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("channels", channels.join(","));
    if (title) formData.append("title", title);

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      },
      body: formData
    });

    return response.json();
  }

  async downloadFileFromSlack(accessToken: string, fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    return response.blob();
  }

  async syncSlackFiles(accessToken: string, userId: string): Promise<void> {
    try {
      const files = await this.getFiles(accessToken);
      
      for (const file of files) {
        const { error } = await supabase
          .from("BlockDrive-Slack")
          .upsert({
            id: file.id,
            name: file.name,
            title: file.title,
            mimetype: file.mimetype,
            size: file.size,
            url_private: file.url_private,
            created: file.created,
            user_id: userId
          });

        if (error) {
          console.error("Error syncing file:", error);
        }
      }
    } catch (error) {
      console.error("Error syncing Slack files:", error);
      throw error;
    }
  }

  async postMessage(accessToken: string, channel: string, text: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel,
        text
      })
    });

    return response.json();
  }
}

export const blockdriveSlack = new BlockDriveSlack();
