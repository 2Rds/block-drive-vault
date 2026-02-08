import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { generateToken } from './constants.ts';
import { TokenRequest, TokenResponse } from './types.ts';
import { validateRequest } from './validation.ts';
import { checkExistingToken, storeToken } from './database.ts';
import { sendAuthTokenEmail } from './email.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", HTTP_STATUS.METHOD_NOT_ALLOWED);
  }

  try {
    const requestData: TokenRequest = await req.json();
    console.log('Processing request for:', requestData.email, 'with wallet:', requestData.walletAddress);

    const validationError = validateRequest(requestData);
    if (validationError) {
      return errorResponse(validationError, HTTP_STATUS.BAD_REQUEST);
    }

    const existingToken = await checkExistingToken(requestData.walletAddress, requestData.blockchainType);

    if (existingToken) {
      return errorResponse(
        'This wallet is already registered. Please check your email for your existing token or connect your wallet to receive a magic link.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const authToken = generateToken();

    const tokenData = await storeToken({
      token: authToken,
      email: requestData.email,
      full_name: requestData.fullName,
      organization: requestData.organization || undefined,
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

    return jsonResponse(response);
  } catch (error: unknown) {
    console.error("Error in send-auth-token function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send authentication token";
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
