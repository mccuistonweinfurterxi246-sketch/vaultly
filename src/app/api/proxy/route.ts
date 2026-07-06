import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROXY_PATH = '/vaultly/api/proxy';

const FRAME_BLOCKING_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
]);

const DROPPED_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'content-security-policy',
  'content-security-policy-report-only',
  'cookie',
  'host',
  'keep-alive',
  'origin',
  'proxy-authenticate',
  'proxy-authorization',
  'referer',
  'set-cookie',
  'set-cookie2',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-frame-options',
]);

const HTML_TYPES = ['text/html', 'application/xhtml+xml'];
const TEXT_TYPES = [
  'application/javascript',
  'application/json',
  'application/manifest+json',
  'application/x-javascript',
  'image/svg+xml',
  'text/css',
  'text/javascript',
  'text/plain',
  'text/xml',
];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isTextResponse(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return HTML_TYPES.some((type) => normalized.includes(type)) ||
    TEXT_TYPES.some((type) => normalized.includes(type));
}

function isHtmlResponse(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return HTML_TYPES.some((type) => normalized.includes(type));
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function buildProxyUrl(url: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

function resolveProxyUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    /^(about|blob|data|javascript|mailto|sms|tel):/i.test(trimmed)
  ) {
    return value;
  }

  try {
    return buildProxyUrl(new URL(trimmed, baseUrl).href);
  } catch {
    return value;
  }
}

function rewriteSrcset(value: string, baseUrl: string): string {
  return value
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) return candidate;
      return [resolveProxyUrl(parts[0], baseUrl), ...parts.slice(1)].join(' ');
    })
    .join(', ');
}

function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_match, quote: string, rawUrl: string) => {
    const rewritten = resolveProxyUrl(rawUrl, baseUrl);
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteHtmlUrls(html: string, baseUrl: string): string {
  let output = html;

  output = output.replace(
    /\s(src|href|action|poster|data-src|data-href|data-original|data-lazy-src)=("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, attr: string, _fullValue: string, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? bare ?? '';
      const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '';
      const rewritten = resolveProxyUrl(value, baseUrl);
      return ` ${attr}=${quote}${escapeHtmlAttribute(rewritten)}${quote}`;
    },
  );

  output = output.replace(
    /\s(srcset|imagesrcset)=("([^"]*)"|'([^']*)')/gi,
    (match, attr: string, _fullValue: string, doubleQuoted?: string, singleQuoted?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? '';
      const quote = doubleQuoted !== undefined ? '"' : "'";
      const rewritten = rewriteSrcset(value, baseUrl);
      return ` ${attr}=${quote}${escapeHtmlAttribute(rewritten)}${quote}`;
    },
  );

  output = output.replace(
    /\sstyle=("([^"]*)"|'([^']*)')/gi,
    (match, _fullValue: string, doubleQuoted?: string, singleQuoted?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? '';
      const quote = doubleQuoted !== undefined ? '"' : "'";
      const rewritten = rewriteCssUrls(value, baseUrl);
      return ` style=${quote}${escapeHtmlAttribute(rewritten)}${quote}`;
    },
  );

  output = output.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs: string, css: string) => {
    return `<style${attrs}>${rewriteCssUrls(css, baseUrl)}</style>`;
  });

  return output;
}

function buildFrameGuardScript(baseUrl: string): string {
  return `<script data-vaultly-frame-guard>
(() => {
  if (window.__vaultlyFrameGuardInstalled) return;

  Object.defineProperty(window, '__vaultlyFrameGuardInstalled', {
    value: true,
    configurable: false,
    writable: false
  });

  const proxyPath = ${JSON.stringify(PROXY_PATH)};
  const baseUrl = ${JSON.stringify(baseUrl)};
  const blockedTargets = new Set(['_top', '_parent']);
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  const OriginalXHR = window.XMLHttpRequest;
  const OriginalEventSource = window.EventSource;

  const toProxyUrl = (value) => {
    try {
      const url = typeof value === 'string'
        ? value
        : value && typeof value.url === 'string'
          ? value.url
          : String(value);
      const resolved = new URL(url, baseUrl);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return value;
      if (resolved.pathname === proxyPath && resolved.searchParams.has('url')) return resolved.pathname + resolved.search;
      return proxyPath + '?url=' + encodeURIComponent(resolved.href);
    } catch {
      return value;
    }
  };

  const neutralizeTarget = (target) => {
    if (typeof target !== 'string') return target;
    return blockedTargets.has(target.toLowerCase()) ? '_self' : target;
  };

  const rewriteElementTarget = (element) => {
    if (!element || typeof element.getAttribute !== 'function') return;
    const target = element.getAttribute('target');
    if (target && blockedTargets.has(target.toLowerCase())) {
      element.setAttribute('target', '_self');
    }
  };

  if (originalFetch) {
    window.fetch = (input, init) => {
      if (input instanceof Request) {
        return originalFetch(toProxyUrl(input.url), init || input);
      }
      return originalFetch(toProxyUrl(input), init);
    };
  }

  if (OriginalXHR) {
    window.XMLHttpRequest = function VaultlyXMLHttpRequest() {
      const xhr = new OriginalXHR();
      const open = xhr.open;
      xhr.open = function vaultlyOpen(method, url, async, user, password) {
        return open.call(xhr, method, toProxyUrl(url), async, user, password);
      };
      return xhr;
    };
    window.XMLHttpRequest.prototype = OriginalXHR.prototype;
  }

  if (OriginalEventSource) {
    window.EventSource = function VaultlyEventSource(url, config) {
      return new OriginalEventSource(toProxyUrl(url), config);
    };
    window.EventSource.prototype = OriginalEventSource.prototype;
  }

  const originalOpen = window.open;
  window.open = function vaultlyWindowOpen(url, target, features) {
    return originalOpen.call(window, url, neutralizeTarget(target), features);
  };

  document.addEventListener('click', (event) => {
    rewriteElementTarget(event.target && event.target.closest ? event.target.closest('a, area') : null);
  }, true);

  document.addEventListener('submit', (event) => {
    rewriteElementTarget(event.target);
  }, true);
})();
</script>`;
}

function transformHtml(html: string, responseUrl: string): string {
  const baseUrl = new URL('./', responseUrl).href;
  const baseTag = `<base href="${escapeHtmlAttribute(baseUrl)}">`;
  const guardScript = buildFrameGuardScript(baseUrl);
  let output = rewriteHtmlUrls(html, baseUrl);

  if (/<base\b[^>]*>/i.test(output)) {
    output = output.replace(/<base\b[^>]*>/i, baseTag);
  } else if (/<head\b[^>]*>/i.test(output)) {
    output = output.replace(/<head\b[^>]*>/i, (head) => `${head}\n${baseTag}`);
  } else {
    output = `${baseTag}\n${output}`;
  }

  if (/<head\b[^>]*>/i.test(output)) {
    output = output.replace(/<head\b[^>]*>/i, (head) => `${head}\n${guardScript}`);
  } else {
    output = `${guardScript}\n${output}`;
  }

  return output;
}

function buildForwardHeaders(request: NextRequest, target: string): Headers {
  const headers = new Headers();
  const targetUrl = new URL(target);

  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (!DROPPED_HEADERS.has(normalized)) {
      headers.set(key, value);
    }
  });

  headers.set('accept', request.headers.get('accept') ?? '*/*');
  headers.set('accept-language', request.headers.get('accept-language') ?? 'en-US,en;q=0.9');
  headers.set('referer', `${targetUrl.origin}/`);
  headers.set(
    'user-agent',
    request.headers.get('user-agent') ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  );

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers, contentType: string): Headers {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (!DROPPED_HEADERS.has(normalized) && !FRAME_BLOCKING_HEADERS.has(normalized)) {
      headers.set(key, value);
    }
  });

  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('access-control-allow-headers', '*');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('content-type', contentType);
  headers.set('x-vaultly-proxy', '1');
  headers.delete('content-security-policy');
  headers.delete('content-security-policy-report-only');
  headers.delete('set-cookie');
  headers.delete('set-cookie2');
  headers.delete('x-frame-options');

  return headers;
}

async function proxy(request: NextRequest): Promise<NextResponse> {
  const target = request.nextUrl.searchParams.get('url');

  if (!target) {
    return NextResponse.json(
      { error: 'Missing required query parameter: url' },
      { status: 400 },
    );
  }

  if (!isHttpUrl(target)) {
    return NextResponse.json(
      { error: 'Invalid URL. Only http and https URLs are supported.' },
      { status: 400 },
    );
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: buildResponseHeaders(new Headers(), 'text/plain; charset=utf-8'),
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(target, {
      body,
      cache: 'no-store',
      headers: buildForwardHeaders(request, target),
      method: request.method,
      redirect: 'follow',
      signal: controller.signal,
    });

    const responseUrl = upstream.url || target;
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const headers = buildResponseHeaders(upstream.headers, contentType);

    if (request.method === 'HEAD') {
      return new NextResponse(null, {
        status: upstream.status,
        headers,
      });
    }

    if (isHtmlResponse(contentType)) {
      const html = await upstream.text();
      const transformedHtml = transformHtml(html, responseUrl);
      return new NextResponse(transformedHtml, {
        status: upstream.status,
        headers: buildResponseHeaders(upstream.headers, 'text/html; charset=utf-8'),
      });
    }

    if (isTextResponse(contentType)) {
      const text = await upstream.text();
      const transformedText = rewriteCssUrls(text, new URL('./', responseUrl).href);
      return new NextResponse(transformedText, {
        status: upstream.status,
        headers,
      });
    }

    headers.set('cache-control', 'public, max-age=300, s-maxage=300');
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';

    return NextResponse.json(
      { error: `Proxy request failed: ${message}` },
      {
        status: 502,
        headers: buildResponseHeaders(new Headers(), 'application/json; charset=utf-8'),
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}
