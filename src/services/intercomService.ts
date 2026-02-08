import Intercom from '@intercom/messenger-js-sdk';

const APP_ID = 'jdnu2ajy';

export interface IntercomUser {
  userId?: string;
  email?: string;
  name?: string;
  createdAt?: number;
}

class IntercomService {
  private isInitialized = false;

  async initialize(user?: IntercomUser) {
    if (this.isInitialized) {
      return;
    }

    try {
      if (user?.userId) {
        // Initialize with user data directly - no JWT needed with Dynamic SDK
        await Intercom({
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        });
      } else {
        // For anonymous users
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
        await Intercom({
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        });
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
        Intercom({
          app_id: APP_ID,
          user_id: user.userId,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        });
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