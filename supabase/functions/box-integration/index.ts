import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOX_CLIENT_ID = 't3pgad8ucoxzrolvf4ljngfgpvb9ov5y'
const BOX_API_BASE = 'https://api.box.com/2.0'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, code, access_token } = await req.json()
    console.log('Box integration request:', { action })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    switch (action) {
      case 'exchange_code':
        return await exchangeCodeForToken(code)
      
      case 'get_files':
        return await getBoxFiles(access_token)
      
      case 'download_file':
        const { file_id } = await req.json()
        return await downloadBoxFile(access_token, file_id)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Box integration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function exchangeCodeForToken(code: string) {
  console.log('Exchanging Box authorization code for access token')
  
  const clientSecret = Deno.env.get('BOX_CLIENT_SECRET')
  if (!clientSecret) {
    throw new Error('Box client secret not configured')
  }

  const tokenResponse = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: BOX_CLIENT_ID,
      client_secret: clientSecret,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error('Box token exchange failed:', errorText)
    throw new Error('Failed to exchange authorization code for access token')
  }

  const tokenData = await tokenResponse.json()
  console.log('Box token exchange successful')

  return new Response(
    JSON.stringify({ 
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function getBoxFiles(accessToken: string) {
  console.log('Fetching files from Box')

  const response = await fetch(`${BOX_API_BASE}/folders/0/items?limit=100`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Box API error:', errorText)
    throw new Error('Failed to fetch files from Box')
  }

  const data = await response.json()
  console.log(`Fetched ${data.entries?.length || 0} items from Box`)

  // Filter only files (not folders) and format for our interface
  const files = data.entries
    ?.filter((item: any) => item.type === 'file')
    ?.map((file: any) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.mime_type || 'application/octet-stream',
      modified_at: file.modified_at
    })) || []

  return new Response(
    JSON.stringify({ files }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function downloadBoxFile(accessToken: string, fileId: string) {
  console.log(`Downloading file ${fileId} from Box`)

  // Get file info first
  const fileInfoResponse = await fetch(`${BOX_API_BASE}/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!fileInfoResponse.ok) {
    throw new Error('Failed to get file info from Box')
  }

  const fileInfo = await fileInfoResponse.json()

  // Get download URL
  const downloadResponse = await fetch(`${BOX_API_BASE}/files/${fileId}/content`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    redirect: 'manual', // Don't follow redirects automatically
  })

  if (downloadResponse.status !== 302) {
    throw new Error('Failed to get download URL from Box')
  }

  const downloadUrl = downloadResponse.headers.get('location')
  if (!downloadUrl) {
    throw new Error('No download URL provided by Box')
  }

  console.log(`File ${fileInfo.name} download initiated`)

  return new Response(
    JSON.stringify({ 
      download_url: downloadUrl,
      file_info: {
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.mime_type
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}