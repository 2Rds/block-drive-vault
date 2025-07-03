
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, generateToken } from './constants.ts';
import { TokenRequest, TokenResponse } from './types.ts';
import { validateRequest } from './validation.ts';
import { checkExistingToken, storeToken } from './database.ts';
import { sendAuthTokenEmail } from './email.ts';

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
    const requestData: TokenRequest = await req.json();
    console.log('Processing request for:', requestData.email, 'with wallet:', requestData.walletAddress);

    // Validate required fields
    const validationError = validateRequest(requestData);
    if (validationError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: validationError 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if wallet is already registered
    const existingToken = await checkExistingToken(requestData.walletAddress, requestData.blockchainType);

    if (existingToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This wallet is already registered. Please check your email for your existing token or connect your wallet to receive a magic link.' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a unique solbound token
    const authToken = generateToken();
    
    // Store the token with wallet association in the database
    const tokenData = await storeToken({
      token: authToken,
      email: requestData.email,
      full_name: requestData.fullName,
      organization: requestData.organization || null,
      wallet_address: requestData.walletAddress,
      blockchain_type: requestData.blockchainType
    });

    console.log('Generated and stored token for user:', { 
      email: requestData.email, 
      fullName: requestData.fullName, 
      walletAddress: requestData.walletAddress, 
      blockchainType: requestData.blockchainType, 
      token: authToken 
    });

    // Send email with the authentication token
    const emailResponse = await sendAuthTokenEmail(
      requestData.email,
      requestData.fullName,
      authToken,
      requestData.walletAddress,
      requestData.blockchainType,
      requestData.organization
    );

    console.log("Email sent successfully:", emailResponse);

    const response: TokenResponse = { 
      success: true, 
      message: "Authentication token created successfully! When you connect your wallet, we'll send you a magic link for secure authentication.",
      emailId: emailResponse.data?.id,
      tokenId: tokenData.id
    };

    return new Response(JSON.stringify(response), {
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
