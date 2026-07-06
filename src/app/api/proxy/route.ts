import { NextRequest, NextResponse } from 'next/server';

const STRIPPED_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'clear-site-data',
]);

const ANTI_FRAMEBUSTING_SCRIPT = `
<script>
(function(){
  try {
    if (window.self !== window.top) {
      Object.defineProperty(window, '__vaultly_proxied__', { value: true, writable: false });
      var origOpen = window.open;
      window.open = function() { return null; };
      document.addEventListener('click', function(e) {
        var a = e.target.closest && e.target.closest('a[target="_top"], a[target="_parent"]');
        if (a) { a.removeAttribute('target'); }
      }, true);
    }
  } catch(e) {}
})();
</script>
`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS allowed' }, { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new NextResponse(upstream.body, { status: 200, headers: { 'Content-Type': contentType } });
    }

    let html = await upstream.text();

    const baseHref = parsedUrl.origin + parsedUrl.pathname.replace(/\/[^/]*$/, '/');
    const baseTag = `<base href="${baseHref}">`;

    if (/<base\s/i.test(html)) {
      html = html.replace(/<base\s[^>]*>/i, baseTag);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
    } else {
      html = `${baseTag}\n${html}`;
    }

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n${ANTI_FRAMEBUSTING_SCRIPT}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (!STRIPPED_HEADERS.has(lk) && lk !== 'content-type' && lk !== 'content-encoding' && lk !== 'content-length') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(html, { status: 200, headers: responseHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return NextResponse.json({ error: `Proxy fetch failed: ${message}` }, { status: 502 });
  }
}
