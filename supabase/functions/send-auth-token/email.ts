import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

export const sendAuthTokenEmail = async (
  email: string,
  fullName: string,
  authToken: string,
  walletAddress: string,
  blockchainType: string,
  organization?: string
) => {
  return await resend.emails.send({
    from: "BlockDrive <onboarding@resend.dev>",
    to: [email],
    subject: "Your BlockDrive Authentication Token - Magic Link Setup Complete",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Welcome to BlockDrive</h1>
          <p style="color: #6b7280; font-size: 16px;">Your Web3 Storage Platform</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 15px 0; font-size: 24px;">Hello ${fullName}!</h2>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your authentication token has been created and linked to your wallet. When you connect your wallet, we'll send you a magic link for passwordless authentication.</p>
        </div>

        <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Your Authentication Token:</h3>
          <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; font-family: monospace; font-size: 14px; word-break: break-all; color: #1f2937;">
            ${authToken}
          </div>
          <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">This token links your wallet to your account</p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h4 style="color: #059669; margin: 0 0 10px 0; display: flex; align-items: center;">
            🔗 Wallet Association & Magic Link Authentication
          </h4>
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            <strong>Wallet Address:</strong> ${walletAddress}<br>
            <strong>Blockchain:</strong> ${blockchainType.toUpperCase()}<br>
            When you connect your wallet, we'll send a magic link to this email for secure, passwordless authentication.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">How to Access BlockDrive:</h3>
          <ol style="color: #4b5563; line-height: 1.6;">
            <li>Visit the BlockDrive platform</li>
            <li>Click "Connect Wallet" in the top right</li>
            <li>Connect the same wallet you used during signup</li>
            <li>Check your email for the magic link</li>
            <li>Click the magic link to complete authentication</li>
            <li>You'll be automatically signed in to BlockDrive</li>
          </ol>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h4 style="color: #059669; margin: 0 0 10px 0; display: flex; align-items: center;">
            🔒 Security Features
          </h4>
          <ul style="color: #065f46; margin: 0; padding-left: 20px;">
            <li>Magic link authentication (no passwords needed)</li>
            <li>Blockchain-verified wallet ownership</li>
            <li>Wallet-specific authentication tokens</li>
            <li>Secure email-based verification</li>
            <li>Decentralized authentication system</li>
          </ul>
        </div>

        ${organization ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Organization:</strong> ${organization}
          </p>
        </div>
        ` : ''}

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Questions? Contact us at support@blockdrive.io
          </p>
        </div>
      </div>
    `,
  });
};
