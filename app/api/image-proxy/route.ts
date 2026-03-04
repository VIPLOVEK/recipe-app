import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// GET /api/image-proxy?url=https://...
// Fetches an external image server-side (bypasses hotlink protection)
// and streams it back to the browser.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 })

  // Only allow http/https URLs to prevent SSRF against internal resources
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        // Spoof Referer to the source domain so hotlink checks pass
        Referer: new URL(url).origin + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    const contentType = (response.headers['content-type'] as string) || 'image/jpeg'
    // Only serve image content types
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 })
    }

    return new NextResponse(response.data as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  }
}
