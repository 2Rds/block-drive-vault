
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  email: string;
  fullName: string;
  organization?: string;
  walletAddress: string;
  blockchainType: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const generateToken = () => {
  return 'sbt_' + Math.random().toString(36).substr(2, 32) + '_' + Date.now().toString(36);
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Received request:', req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { email, fullName, organization, walletAddress, blockchainType }: TokenRequest = await req.json();
    console.log('Processing request for:', email, 'with wallet:', walletAddress);

    // Validate required fields
    if (!walletAddress || !blockchainType) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Wallet address and blockchain type are required' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if wallet is already registered
    const { data: existingToken, error: checkError } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_used', false)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing token:', checkError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to check existing registration' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (existingToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This wallet is already registered. Please check your email for your existing token.' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a unique solbound token
    const authToken = generateToken();
    
    // Store the token with wallet association in the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth_tokens')
      .insert({
        token: authToken,
        email: email,
        full_name: fullName,
        organization: organization || null,
        wallet_address: walletAddress,
        blockchain_type: blockchainType
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to store authentication token' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Generated and stored token for user:', { email, fullName, walletAddress, blockchainType, token: authToken });

    // Send email with the authentication token
    const emailResponse = await resend.emails.send({
      from: "BlockDrive <onboarding@resend.dev>",
      to: [email],
      subject: "Your BlockDrive Solbound Authentication Token",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin-bottom: 10px;">Welcome to BlockDrive</h1>
            <p style="color: #6b7280; font-size: 16px;">Your Web3 Storage Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">Hello ${fullName}!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your solbound authentication token has been generated and linked to your wallet.</p>
          </div>

          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Your Authentication Token:</h3>
            <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; font-family: monospace; font-size: 14px; word-break: break-all; color: #1f2937;">
              ${authToken}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">Keep this token secure - it's your key to accessing BlockDrive</p>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h4 style="color: #059669; margin: 0 0 10px 0; display: flex; align-items: center;">
              🔗 Wallet Association
            </h4>
            <p style="color: #065f46; margin: 0; font-size: 14px;">
              <strong>Wallet Address:</strong> ${walletAddress}<br>
              <strong>Blockchain:</strong> ${blockchainType.toUpperCase()}<br>
              This token is permanently linked to your wallet for secure authentication.
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">What's Next?</h3>
            <ol style="color: #4b5563; line-height: 1.6;">
              <li>Visit the BlockDrive platform</li>
              <li>Click "Connect Wallet" in the top right</li>
              <li>Connect the same wallet you used during signup</li>
              <li>Your token will automatically authenticate you</li>
            </ol>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <h4 style="color: #059669; margin: 0 0 10px 0; display: flex; align-items: center;">
              🔒 Security Features
            </h4>
            <ul style="color: #065f46; margin: 0; padding-left: 20px;">
              <li>Non-transferable solbound NFT</li>
              <li>Blockchain-verified ownership</li>
              <li>Wallet-specific authentication</li>
              <li>No passwords to remember</li>
              <li>Decentralized authentication</li>
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Authentication token sent successfully and linked to your wallet!",
      emailId: emailResponse.data?.id,
      tokenId: tokenData.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-token function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send authentication token" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
