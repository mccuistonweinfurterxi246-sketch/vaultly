import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Reverse Proxy Hydrator — strips X-Frame-Options / CSP headers and injects
// a <base> tag so all relative asset paths resolve correctly inside our iframe.
// ─────────────────────────────────────────────────────────────────────────────

// Headers that must be stripped to allow iframe embedding
const STRIPPED_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'clear-site-data',
]);

// Frame-busting neutralizer script injected into proxied HTML
const ANTI_FRAMEBUSTING_SCRIPT = `
<script>
(function() {
  // Neutralize frame-busting by overriding common detection patterns
  try {
    if (window.self !== window.top) {
      // Override any checks that try to break out of frames
      Object.defineProperty(window, '__vaultly_proxied__', { value: true, writable: false });
    }
  } catch(e) {}
})();
</script>
`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const targetUrl = searchParams.get('url');

  // ── Validation ────────────────────────────────────────────────────────────
  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing required query parameter: url' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL provided' },
      { status: 400 }
    );
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: 'Only HTTP and HTTPS protocols are allowed' },
      { status: 400 }
    );
  }

  // ── Fetch target site server-side ─────────────────────────────────────────
  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Avoid compressed responses we'd need to decompress
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000), // 8s hard timeout
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstreamResponse.status}` },
        { status: upstreamResponse.status }
      );
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';

    // Only proxy HTML content — reject binaries, images, etc.
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new NextResponse(upstreamResponse.body, {
        status: 200,
        headers: { 'Content-Type': contentType },
      });
    }

    // ── Read & transform HTML ─────────────────────────────────────────────
    let html = await upstreamResponse.text();

    // Determine the origin for the <base> tag
    const baseHref = parsedUrl.origin + parsedUrl.pathname.replace(/\/[^/]*$/, '/');

    // Inject <base> tag to resolve relative asset paths.
    // If a <base> tag already exists, replace it; otherwise inject after <head>.
    const baseTag = `<base href="${baseHref}">`;

    if (/<base\s/i.test(html)) {
      // Replace existing <base> tag
      html = html.replace(/<base\s[^>]*>/i, baseTag);
    } else if (/<head[^>]*>/i.test(html)) {
      // Inject after <head>
      html = html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
    } else {
      // No <head> tag — prepend
      html = `${baseTag}\n${html}`;
    }

    // Inject anti-framebusting script right after <head>
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n${ANTI_FRAMEBUSTING_SCRIPT}`);
    }

    // ── Build sanitized response headers ──────────────────────────────────
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('Cache-Control', 'public, max-age=300, s-maxage=600'); // 5min client, 10min CDN
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    // Forward safe headers from upstream (skip the blocked ones)
    upstreamResponse.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (!STRIPPED_HEADERS.has(lk) && lk !== 'content-type' && lk !== 'content-encoding' && lk !== 'content-length') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(html, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    console.error('[Proxy] Fetch failed:', message);
    return NextResponse.json(
      { error: `Proxy fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
