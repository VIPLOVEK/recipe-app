import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import axios from 'axios'

type ScrapedRecipe = {
  title: string
  ingredients: string[]
  steps: string[]
  image_url: string | null
  source_url: string
  notes: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse a raw description string (from YouTube or elsewhere) into
 * structured ingredients + steps by detecting common section headers.
 */
function parseDescription(desc: string): { ingredients: string[]; steps: string[]; notes: string } {
  const raw = desc.split('\n').map((l) => l.trim())

  // ── Skip noise lines ──────────────────────────────────────────────────────
  function isNoise(line: string) {
    if (!line || line.length < 2) return true
    if (/^\d+:\d+/.test(line)) return true                              // timestamps
    if (/^https?:\/\//.test(line)) return true                          // bare URLs
    if (/subscribe|follow me|instagram|facebook|tiktok|patreon|#\w/i.test(line) && line.length < 90) return true
    if (/^(website|youtube|email|twitter|fb|ig|snapchat|pinterest)\s*:/i.test(line)) return true
    if (/ventuno|production|all rights reserved/i.test(line)) return true
    return false
  }

  const lines = raw.filter((l) => !isNoise(l))

  // ── Explicit section headers ───────────────────────────────────────────────
  const INGR_HDR = /^(ingredient|what you('ll)? need|you('ll)? need|for the |ingr[eé]dient|things needed|items needed|to make)/i
  const STEP_HDR = /^(instruction|direction|method|how to (make|cook|prepare)|preparation|procedure|to cook|steps?\b)/i
  const NOTE_HDR = /^(note|tip|variation|serving suggestion|storage|nutrition)/i

  const hasExplicitHeaders = lines.some((l) => INGR_HDR.test(l) || STEP_HDR.test(l))

  // ── Ingredient line patterns ───────────────────────────────────────────────
  // Handles:  "Potato - 3 Nos"  "2 cups rice"  "Salt - to taste"  "• onion"
  const INGR_LINE =
    /^[-•*▪◦✓✔]\s+\S|^[\d½¼¾⅓⅔]+\s|^(a |an |few |some )?\d|.+\s[-–]\s+[\d½¼¾⅓⅔a-z]/i

  // Units that confirm a line is an ingredient
  const HAS_UNIT =
    /\b(cup|tbsp|tsp|tablespoon|teaspoon|gram|kg|ml|lb|oz|litre|liter|pinch|bunch|piece|slice|clove|no\.|nos|packet|handful|medium|large|small)\b/i

  // ── Step line patterns ────────────────────────────────────────────────────
  const STEP_VERBS =
    /^(take|put|add|mix|stir|cook|fry|boil|bake|pour|chop|cut|blend|grind|wash|soak|drain|season|serve|remove|place|combine|whisk|prepare|heat|saute|sauté|roast|pressure|mash|spread|apply|roast|garnish|transfer|let|keep|turn|flip|repeat|strain|filter)/i

  function looksLikeIngredient(line: string) {
    if (line.length > 150) return false
    return INGR_LINE.test(line) || HAS_UNIT.test(line)
  }

  function looksLikeStep(line: string) {
    return line.length > 20 && STEP_VERBS.test(line)
  }

  type Section = 'none' | 'ingredients' | 'steps' | 'notes'
  let section: Section = 'none'

  const ingredients: string[] = []
  const steps: string[] = []
  const noteLines: string[] = []
  const metaLines: string[] = []

  // ── If no explicit headers: find the first step verb line as a divider ─────
  // Everything before it is likely the ingredient block.
  let autoSplitIdx = -1
  if (!hasExplicitHeaders) {
    autoSplitIdx = lines.findIndex((l) => looksLikeStep(l))
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Section header detection (explicit)
    if (INGR_HDR.test(line)) { section = 'ingredients'; continue }
    if (STEP_HDR.test(line)) { section = 'steps'; continue }
    if (NOTE_HDR.test(line)) { section = 'notes'; continue }

    // Metadata lines (Cooking Time:, Serves:)
    if (/^(cooking time|cook time|prep time|total time|serves?|yield|difficulty)\s*:/i.test(line)) {
      metaLines.push(line)
      continue
    }

    if (section === 'ingredients') {
      const clean = line.replace(/^[-•*▪◦➤→✓✔]\s*/, '').trim()
      if (clean.length > 1) ingredients.push(clean)

    } else if (section === 'steps') {
      const clean = line.replace(/^(step\s*)?\d+[.):\-]\s*/i, '').trim()
      if (clean.length > 5) steps.push(clean)

    } else if (section === 'notes') {
      noteLines.push(line)

    } else {
      // No explicit headers — use auto-split or heuristics
      if (autoSplitIdx >= 0) {
        if (i < autoSplitIdx) {
          // Before first step verb → likely ingredient
          if (looksLikeIngredient(line)) {
            ingredients.push(line.replace(/^[-•*▪◦✓]\s*/, '').trim())
          }
          // Sub-section header like "To Make Pav Bhaji Masala" → skip
        } else {
          // At or after first step verb → it's a step
          const clean = line.replace(/^(step\s*)?\d+[.):\-]\s*/i, '').trim()
          if (clean.length > 5) steps.push(clean)
        }
      } else {
        // Pure heuristics — no clear divider found
        if (looksLikeIngredient(line)) {
          ingredients.push(line.replace(/^[-•*▪◦✓]\s*/, '').trim())
        } else if (looksLikeStep(line)) {
          steps.push(line)
        }
      }
    }
  }

  const notes = [
    ...metaLines,
    ...noteLines,
  ].join(' | ') || ''

  return { ingredients, steps, notes }
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

/** Extract video ID from any YouTube URL format */
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/)
  return m?.[1] ?? null
}

/**
 * Fetch auto-generated captions from YouTube (free, no API key).
 * Method 1: YouTube innertube player API (no page scraping, more reliable).
 * Method 2: Watch-page HTML scrape with robust captionTracks extraction.
 * Returns the full spoken text as a single string, or '' if unavailable.
 */
async function fetchTranscript(videoId: string): Promise<string> {
  type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string }

  function pickTrack(tracks: CaptionTrack[]) {
    return (
      tracks.find((t) => t.languageCode === 'en' && !t.kind) ||
      tracks.find((t) => t.languageCode === 'en') ||
      tracks[0]
    )
  }

  async function captionUrlToText(url: string): Promise<string> {
    const { data } = await axios.get(`${url}&fmt=json3`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (typeof data === 'object' && data?.events) {
      return data.events
        .flatMap((e: { segs?: { utf8?: string }[] }) => e.segs || [])
        .map((s: { utf8?: string }) => s.utf8 || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
    if (typeof data === 'string') {
      return data
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    }
    return ''
  }

  // ── Method 1: Innertube player API ──────────────────────────────────────────
  try {
    const { data: player } = await axios.post(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        videoId,
        context: {
          client: {
            hl: 'en',
            gl: 'US',
            clientName: 'WEB',
            clientVersion: '2.20240530.02.00',
          },
        },
      },
      {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20240530.02.00',
          Origin: 'https://www.youtube.com',
          Referer: `https://www.youtube.com/watch?v=${videoId}`,
        },
      }
    )

    const tracks: CaptionTrack[] =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    if (tracks.length) {
      const text = await captionUrlToText(pickTrack(tracks).baseUrl)
      if (text) return text
    }
  } catch { /* fall through */ }

  // ── Method 2: Watch-page HTML scrape ────────────────────────────────────────
  try {
    const { data: html } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      timeout: 14000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Cookie: 'CONSENT=YES+cb; SOCS=CAI',
      },
    })

    // Primary regex: single-line JSON array (most common)
    let tracks: CaptionTrack[] | null = null
    const m = html.match(/"captionTracks":(\[.*?\])/)
    if (m) { try { tracks = JSON.parse(m[1]) } catch { /* skip */ } }

    // Fallback: bracket-balanced extraction for multi-line JSON
    if (!tracks?.length) {
      const idx = html.indexOf('"captionTracks":')
      if (idx >= 0) {
        const sub = html.slice(idx + 16)
        const start = sub.indexOf('[')
        if (start >= 0) {
          let depth = 0, i = start
          for (; i < Math.min(sub.length, start + 80000); i++) {
            if (sub[i] === '[') depth++
            else if (sub[i] === ']') { if (!--depth) break }
          }
          try { tracks = JSON.parse(sub.slice(start, i + 1)) } catch { /* skip */ }
        }
      }
    }

    if (!tracks?.length) return ''

    const captionUrl = pickTrack(tracks).baseUrl.replace(/\\u0026/g, '&')
    return await captionUrlToText(captionUrl)
  } catch { /* ignore */ }

  return ''
}

// ─── YouTube scraper ─────────────────────────────────────────────────────────

async function scrapeYouTube(url: string): Promise<ScrapedRecipe> {
  const isShort = url.includes('/shorts/')

  // 1. Get title + thumbnail from oEmbed (works for both regular + Shorts)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const { data: oembed } = await axios.get(oembedUrl, { timeout: 8000 })

  const videoId = extractVideoId(url)
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : oembed.thumbnail_url || null

  // 2. Get description from page HTML (not available for most Shorts)
  let description = ''
  try {
    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    const runsMatch = html.match(/"description":\{"runs":\[(.+?)\],"accessibility"/)
    if (runsMatch) {
      try {
        const runsJson = JSON.parse(`[${runsMatch[1]}]`)
        description = runsJson.map((r: { text?: string }) => r.text || '').join('')
      } catch {}
    }
    if (!description) {
      const m2 = html.match(/"attributedDescriptionBodyText":\{"content":"(.*?)"/)
      if (m2) description = m2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
    }
    if (!description) {
      const m3 = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/s)
      if (m3) description = m3[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  } catch {}

  // 3. For Shorts (or any video with an empty/thin description), try the transcript.
  //    Transcript contains the spoken audio — for recipe Shorts this is the main content.
  let transcriptText = ''
  const descriptionHasRecipeContent =
    description.length > 100 &&
    /ingredient|tbsp|tsp|cup|gram|mins|minutes/i.test(description)

  if (isShort || !descriptionHasRecipeContent) {
    if (videoId) {
      transcriptText = await fetchTranscript(videoId)
    }
  }

  // 4. Parse whichever source has more useful recipe content
  const sourceText = transcriptText.length > description.length ? transcriptText : description
  const { ingredients, steps, notes } = parseDescription(sourceText)

  // If transcript was used and parseDescription couldn't split it cleanly,
  // treat the whole transcript as a single "method" step so nothing is lost.
  const finalSteps =
    steps.length === 0 && transcriptText.length > 50
      ? [transcriptText.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()]
      : steps

  return {
    title: oembed.title || 'YouTube Recipe',
    ingredients,
    steps: finalSteps,
    image_url: thumbnail,
    source_url: url,
    notes: notes || (oembed.author_name ? `By ${oembed.author_name} on YouTube` : null),
  }
}

// ─── Recipe site scraper ─────────────────────────────────────────────────────

async function scrapeRecipeSite(url: string): Promise<ScrapedRecipe> {
  const { data: html } = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  })

  const $ = cheerio.load(html)
  let recipe: ScrapedRecipe | null = null

  // Try schema.org/Recipe JSON-LD (most reliable — used by most recipe sites)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}')
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        const r =
          item['@type'] === 'Recipe'
            ? item
            : Array.isArray(item['@graph'])
            ? item['@graph'].find((g: { '@type': string }) => g['@type'] === 'Recipe')
            : null
        if (r) {
          recipe = {
            title: r.name || '',
            ingredients: Array.isArray(r.recipeIngredient)
              ? r.recipeIngredient.map((i: string) => i.trim()).filter(Boolean)
              : [],
            steps: Array.isArray(r.recipeInstructions)
              ? r.recipeInstructions
                  .map((s: { text?: string; itemListElement?: { text: string }[] } | string) => {
                    if (typeof s === 'string') return s.trim()
                    if (s.text) return s.text.trim()
                    if (Array.isArray(s.itemListElement)) return s.itemListElement.map((i) => i.text).join(' ')
                    return ''
                  })
                  .filter(Boolean)
              : typeof r.recipeInstructions === 'string'
              ? r.recipeInstructions.split('\n').map((l: string) => l.trim()).filter(Boolean)
              : [],
            image_url: Array.isArray(r.image)
              ? r.image[0]?.url || r.image[0]
              : r.image?.url || r.image || $('meta[property="og:image"]').attr('content') || null,
            source_url: url,
            notes: r.description || null,
          }
        }
      }
    } catch {}
  })

  if (recipe) return recipe

  // Fallback: heuristic HTML scraping
  const title =
    $('h1').first().text().trim() ||
    $('title').text().trim().split(/[|\-–]/)[0].trim() ||
    'Recipe'

  const ingredients: string[] = []
  $('[class*="ingredient" i] li, [class*="ingredient" i] p').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200 && text.length > 2) ingredients.push(text)
  })

  const steps: string[] = []
  $('[class*="instruction" i] li, [class*="direction" i] li, [class*="step" i] li, [class*="method" i] li').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 10) steps.push(text)
  })

  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('img[class*="recipe" i]').first().attr('src') ||
    null

  return { title, ingredients, steps, image_url: image, source_url: url, notes: null }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const isYouTube = /youtube\.com|youtu\.be/.test(url)
    const scraped = isYouTube ? await scrapeYouTube(url) : await scrapeRecipeSite(url)

    return NextResponse.json(scraped)
  } catch (err) {
    console.error('Scrape error:', err)
    return NextResponse.json({ error: 'Failed to fetch recipe from URL' }, { status: 500 })
  }
}
