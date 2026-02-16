import Intercom from '@intercom/messenger-js-sdk';

const APP_ID = 'jdnu2ajy';

export interface IntercomUser {
  userId?: string;
  email?: string;
  name?: string;
  createdAt?: number;
  jwt?: string;
}

class IntercomService {
  private isInitialized = false;

  async initialize(user?: IntercomUser) {
    if (this.isInitialized) {
      return;
    }

    try {
      if (user?.userId) {
        const bootConfig: Record<string, unknown> = {
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        };
        if (user.jwt) {
          bootConfig.intercom_user_jwt = user.jwt;
        }
        await Intercom(bootConfig);
      } else {
        await Intercom({
          app_id: APP_ID,
        });
      }

      this.isInitialized = true;
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
      if (user?.userId) {
        const bootConfig: Record<string, unknown> = {
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        };
        if (user.jwt) {
          bootConfig.intercom_user_jwt = user.jwt;
        }
        await Intercom(bootConfig);
      } else {
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
      if (user.userId) {
        const updateConfig: Record<string, unknown> = {
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        };
        if (user.jwt) {
          updateConfig.intercom_user_jwt = user.jwt;
        }
        Intercom(updateConfig);
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
      if (window.Intercom) {
        window.Intercom('hide');
      }
    } catch (error) {
      console.error('Failed to hide Intercom:', error);
    }
  }
}

export const intercomService = new IntercomService();
