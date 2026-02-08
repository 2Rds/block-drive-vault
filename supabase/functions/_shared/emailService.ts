/**
 * BlockDrive Email Service
 * Centralized Resend-based email service for all transactional emails
 */

import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  teamInvitationTemplate,
  roleChangeTemplate,
  memberRemovedTemplate,
  paymentConfirmationTemplate,
  paymentFailedTemplate,
  subscriptionExpiringTemplate,
  emailDomainVerificationTemplate,
} from "./emailTemplates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const FROM_EMAIL = Deno.env.get("EMAIL_FROM") || "BlockDrive <onboarding@resend.dev>";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://blockdrive.app";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[EmailService] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error("[EmailService] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

export const EmailService = {
  // Team Invitations
  sendTeamInvitation: async (params: {
    to: string;
    teamName: string;
    inviterName: string;
    role: string;
    invitationToken: string;
  }): Promise<EmailResult> => {
    const inviteUrl = `${FRONTEND_URL}/join-team?token=${params.invitationToken}`;
    const html = teamInvitationTemplate({
      teamName: params.teamName,
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl,
    });
    return sendEmail(
      params.to,
      `You've been invited to join ${params.teamName} on BlockDrive`,
      html
    );
  },

  // Role Changes
  sendRoleChange: async (params: {
    to: string;
    teamName: string;
    newRole: string;
    changedBy: string;
  }): Promise<EmailResult> => {
    const html = roleChangeTemplate({
      teamName: params.teamName,
      newRole: params.newRole,
      changedBy: params.changedBy,
    });
    return sendEmail(
      params.to,
      `Your role in ${params.teamName} has been updated`,
      html
    );
  },

  // Member Removal
  sendMemberRemoved: async (params: {
    to: string;
    teamName: string;
  }): Promise<EmailResult> => {
    const html = memberRemovedTemplate({
      teamName: params.teamName,
    });
    return sendEmail(
      params.to,
      `You've been removed from ${params.teamName}`,
      html
    );
  },

  // Payment Confirmation
  sendPaymentConfirmation: async (params: {
    to: string;
    planName: string;
    amount: string;
    billingPeriod: string;
    nextBillingDate: string;
  }): Promise<EmailResult> => {
    const html = paymentConfirmationTemplate({
      planName: params.planName,
      amount: params.amount,
      billingPeriod: params.billingPeriod,
      nextBillingDate: params.nextBillingDate,
    });
    return sendEmail(params.to, `Payment confirmed - ${params.planName}`, html);
  },

  // Payment Failed
  sendPaymentFailed: async (params: {
    to: string;
    planName: string;
    amount: string;
  }): Promise<EmailResult> => {
    const retryUrl = `${FRONTEND_URL}/subscription`;
    const html = paymentFailedTemplate({
      planName: params.planName,
      amount: params.amount,
      retryUrl,
    });
    return sendEmail(
      params.to,
      `Payment failed - Action required for ${params.planName}`,
      html
    );
  },

  // Subscription Expiring
  sendSubscriptionExpiring: async (params: {
    to: string;
    planName: string;
    daysLeft: number;
  }): Promise<EmailResult> => {
    const renewUrl = `${FRONTEND_URL}/pricing`;
    const html = subscriptionExpiringTemplate({
      planName: params.planName,
      daysLeft: params.daysLeft,
      renewUrl,
    });
    return sendEmail(
      params.to,
      `Your ${params.planName} subscription expires in ${params.daysLeft} days`,
      html
    );
  },

  // Email Domain Verification
  sendEmailDomainVerification: async (params: {
    to: string;
    domain: string;
    teamName: string;
    verificationToken: string;
  }): Promise<EmailResult> => {
    const verificationUrl = `${FRONTEND_URL}/verify-domain?token=${params.verificationToken}`;
    const html = emailDomainVerificationTemplate({
      domain: params.domain,
      teamName: params.teamName,
      verificationUrl,
    });
    return sendEmail(
      params.to,
      `Verify ${params.domain} for ${params.teamName}`,
      html
    );
  },

  // Generic email (for custom cases)
  sendCustomEmail: async (params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailResult> => {
    return sendEmail(params.to, params.subject, params.html);
  },
};

export default EmailService;
