/**
 * BlockDrive Email Templates
 * Branded HTML templates for all transactional emails
 */

const BRAND_COLOR = '#6366f1';
const BRAND_COLOR_DARK = '#4f46e5';
const TEXT_COLOR = '#1f2937';
const TEXT_MUTED = '#6b7280';
const BACKGROUND_COLOR = '#f9fafb';

const baseLayout = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlockDrive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BACKGROUND_COLOR};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">BlockDrive</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; color: ${TEXT_COLOR};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${BACKGROUND_COLOR}; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
                &copy; ${new Date().getFullYear()} BlockDrive. Secure decentralized storage.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const button = (text: string, url: string) => `
  <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0;">
    ${text}
  </a>
`;

const infoBox = (content: string, bgColor = '#f0f9ff', borderColor = '#0ea5e9') => `
  <div style="padding: 16px; background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 4px; margin: 16px 0;">
    ${content}
  </div>
`;

// Team Invitation Email
export const teamInvitationTemplate = (params: {
  teamName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">You've been invited to join a team</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    <strong>${params.inviterName}</strong> has invited you to join <strong>${params.teamName}</strong> on BlockDrive.
  </p>
  ${infoBox(`<p style="margin: 0; font-size: 14px;"><strong>Your role:</strong> ${params.role}</p>`)}
  <p style="margin: 24px 0 0; font-size: 14px; color: ${TEXT_MUTED};">
    Click the button below to accept the invitation and join the team:
  </p>
  ${button('Accept Invitation', params.inviteUrl)}
  <p style="margin: 24px 0 0; font-size: 12px; color: ${TEXT_MUTED};">
    This invitation will expire in 7 days.
  </p>
`);

// Member Role Change Email
export const roleChangeTemplate = (params: {
  teamName: string;
  newRole: string;
  changedBy: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Your role has been updated</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    Your role in <strong>${params.teamName}</strong> has been updated by ${params.changedBy}.
  </p>
  ${infoBox(`<p style="margin: 0; font-size: 14px;"><strong>New role:</strong> ${params.newRole}</p>`, params.newRole === 'Admin' ? '#f0fdf4' : '#f0f9ff', params.newRole === 'Admin' ? '#22c55e' : '#0ea5e9')}
  <p style="margin: 24px 0 0; font-size: 14px; color: ${TEXT_MUTED};">
    ${params.newRole === 'Admin' ? 'You now have admin privileges and can manage team members.' : 'You are now a team member.'}
  </p>
`);

// Member Removed Email
export const memberRemovedTemplate = (params: {
  teamName: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">You've been removed from a team</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    You have been removed from <strong>${params.teamName}</strong> on BlockDrive.
  </p>
  <p style="margin: 0; font-size: 14px; color: ${TEXT_MUTED};">
    If you believe this was a mistake, please contact the team administrator.
  </p>
`);

// Payment Confirmation Email
export const paymentConfirmationTemplate = (params: {
  planName: string;
  amount: string;
  billingPeriod: string;
  nextBillingDate: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Payment Confirmed</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    Thank you for your payment. Your subscription has been successfully processed.
  </p>
  ${infoBox(`
    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Plan:</strong> ${params.planName}</p>
    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Amount:</strong> ${params.amount}</p>
    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Billing period:</strong> ${params.billingPeriod}</p>
    <p style="margin: 0; font-size: 14px;"><strong>Next billing:</strong> ${params.nextBillingDate}</p>
  `, '#f0fdf4', '#22c55e')}
`);

// Payment Failed Email
export const paymentFailedTemplate = (params: {
  planName: string;
  amount: string;
  retryUrl: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Payment Failed</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    We were unable to process your payment for the <strong>${params.planName}</strong> plan.
  </p>
  ${infoBox(`
    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Amount due:</strong> ${params.amount}</p>
    <p style="margin: 0; font-size: 14px;">Please update your payment method to continue your subscription.</p>
  `, '#fef2f2', '#ef4444')}
  ${button('Update Payment Method', params.retryUrl)}
`);

// Subscription Expiring Email
export const subscriptionExpiringTemplate = (params: {
  planName: string;
  daysLeft: number;
  renewUrl: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Your subscription is expiring soon</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    Your <strong>${params.planName}</strong> subscription will expire in <strong>${params.daysLeft} day${params.daysLeft !== 1 ? 's' : ''}</strong>.
  </p>
  ${infoBox(`<p style="margin: 0; font-size: 14px;">Renew now to avoid any interruption to your service.</p>`, '#fffbeb', '#f59e0b')}
  ${button('Renew Subscription', params.renewUrl)}
`);

// Email Domain Verification Email
export const emailDomainVerificationTemplate = (params: {
  domain: string;
  teamName: string;
  verificationUrl: string;
}) => baseLayout(`
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Verify your email domain</h2>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${TEXT_MUTED};">
    A request was made to verify <strong>${params.domain}</strong> for the team <strong>${params.teamName}</strong>.
  </p>
  ${infoBox(`<p style="margin: 0; font-size: 14px;">Once verified, users with @${params.domain} email addresses can automatically join your team.</p>`)}
  ${button('Verify Domain', params.verificationUrl)}
  <p style="margin: 24px 0 0; font-size: 12px; color: ${TEXT_MUTED};">
    This verification link will expire in 48 hours.
  </p>
`);
