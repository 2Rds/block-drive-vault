import Intercom from '@intercom/messenger-js-sdk';
import { supabase } from '@/integrations/supabase/client';

const APP_ID = 'jdnu2ajy';

export interface IntercomUser {
  userId?: string;
  email?: string;
  name?: string;
  createdAt?: number;
}

interface JWTResponse {
  jwt: string;
  user_id: string;
  expires_at: number;
}

class IntercomService {
  private isInitialized = false;
  private currentJWT: string | null = null;
  private jwtExpiration: number | null = null;

  private async generateJWT(): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-intercom-jwt');
      
      if (error) {
        console.error('Failed to generate Intercom JWT:', error);
        return null;
      }

      const jwtData = data as JWTResponse;
      this.currentJWT = jwtData.jwt;
      this.jwtExpiration = jwtData.expires_at;
      
      console.log('Generated Intercom JWT successfully');
      return jwtData.jwt;
    } catch (error) {
      console.error('Error generating Intercom JWT:', error);
      return null;
    }
  }

  private async getValidJWT(): Promise<string | null> {
    // Check if we have a valid JWT that hasn't expired
    if (this.currentJWT && this.jwtExpiration) {
      const now = Math.floor(Date.now() / 1000);
      const bufferTime = 300; // 5 minutes buffer before expiration
      
      if (now < (this.jwtExpiration - bufferTime)) {
        return this.currentJWT;
      }
    }

    // Generate a new JWT if we don't have one or it's expired
    return await this.generateJWT();
  }

  async initialize(user?: IntercomUser) {
    if (this.isInitialized) {
      return;
    }

    try {
      // For authenticated users, use JWT
      if (user?.userId) {
        const jwt = await this.getValidJWT();
        
        if (jwt) {
          await Intercom({
            app_id: APP_ID,
            intercom_user_jwt: jwt,
            // Include non-sensitive attributes outside JWT
            session_duration: 86400000, // 24 hours in milliseconds
          });
        } else {
          // Fallback to basic initialization without JWT if JWT generation fails
          await Intercom({
            app_id: APP_ID,
            user_id: user.userId,
            name: user.name,
            email: user.email,
            created_at: user.createdAt,
          });
        }
      } else {
        // For anonymous users, use basic initialization
        await Intercom({
          app_id: APP_ID,
        });
      }
      
      this.isInitialized = true;
      console.log('Intercom initialized successfully with JWT security');
    } catch (error) {
      console.error('Failed to initialize Intercom:', error);
    }
  }

  async boot(user?: IntercomUser) {
    if (!this.isInitialized) {
      await this.initialize(user);
      return;
    }

    try {
      // For authenticated users, use JWT
      if (user?.userId) {
        const jwt = await this.getValidJWT();
        
        if (jwt) {
          await Intercom({
            app_id: APP_ID,
            intercom_user_jwt: jwt,
            session_duration: 86400000,
          });
        } else {
          // Fallback to basic boot without JWT
          await Intercom({
            app_id: APP_ID,
            user_id: user.userId,
            name: user.name,
            email: user.email,
            created_at: user.createdAt,
          });
        }
      } else {
        // For anonymous users
        await Intercom({
          app_id: APP_ID,
        });
      }
    } catch (error) {
      console.error('Failed to boot Intercom:', error);
    }
  }

  async update(user: IntercomUser) {
    if (!this.isInitialized) {
      return;
    }

    try {
      // For authenticated users, use JWT
      if (user.userId) {
        const jwt = await this.getValidJWT();
        
        if (jwt) {
          await Intercom({
            app_id: APP_ID,
            intercom_user_jwt: jwt,
            session_duration: 86400000,
          });
        } else {
          // Fallback to basic update without JWT
          Intercom({
            app_id: APP_ID,
            user_id: user.userId,
            name: user.name,
            email: user.email,
            created_at: user.createdAt,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update Intercom user:', error);
    }
  }

  shutdown() {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Note: Intercom doesn't have a direct shutdown method in this SDK
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to shutdown Intercom:', error);
    }
  }

  show() {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Note: Use window.Intercom for show/hide commands
      if (window.Intercom) {
        window.Intercom('show');
      }
    } catch (error) {
      console.error('Failed to show Intercom:', error);
    }
  }

  hide() {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Note: Use window.Intercom for show/hide commands
      if (window.Intercom) {
        window.Intercom('hide');
      }
    } catch (error) {
      console.error('Failed to hide Intercom:', error);
    }
  }
}

export const intercomService = new IntercomService();