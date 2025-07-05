
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing IPFS upload for file: ${file.name} (${file.size} bytes)`)

    // Upload to Filebase IPFS
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const filebaseResponse = await fetch('https://api.filebase.com/v1/ipfs/add', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer MjUzMDc4QjZBMzZDQjc5RDNBMTU6YmlBdTZKa0ZMV01sYUxSSEpDMWFsSzdNbENJbWVMU1IzRUtRVHZvUDpibG9ja2RyaXZlLXN0b3JhZ2U=',
      },
      body: uploadFormData,
    })

    if (!filebaseResponse.ok) {
      const errorText = await filebaseResponse.text()
      console.error('Filebase API error:', filebaseResponse.status, errorText)
      throw new Error(`Filebase API error: ${filebaseResponse.status} - ${errorText}`)
    }

    const result = await filebaseResponse.json()
    console.log('Filebase upload result:', result)

    const cid = result.Hash || result.cid
    if (!cid) {
      throw new Error('No CID returned from Filebase API')
    }

    const uploadResult = {
      cid: cid,
      url: `https://regular-amber-sloth.myfilebase.com/ipfs/${cid}`,
      filename: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream'
    }

    console.log('IPFS upload successful:', uploadResult)

    return new Response(
      JSON.stringify(uploadResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('IPFS upload failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
