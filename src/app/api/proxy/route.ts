import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_PATH = '/vaultly';
const PROXY_ROUTE = '/api/proxy';
const PROXY_PATH = `${BASE_PATH}${PROXY_ROUTE}`;
const REQUEST_TIMEOUT_MS = 12_000;

const BLOCKED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'content-security-policy',
  'content-security-policy-report-only',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'set-cookie',
  'set-cookie2',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-content-type-options',
  'x-frame-options',
]);

const BLOCKED_REQUEST_HEADERS = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'origin',
  'proxy-authenticate',
  'proxy-authorization',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSkippableUrl(value: string): boolean {
  return (
    !value ||
    value.startsWith('#') ||
    /^(about|blob|data|javascript|mailto|sms|tel):/i.test(value)
  );
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.toLowerCase().split(';', 1)[0].trim() === 'text/html';
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function buildProxyUrl(targetUrl: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
}

function unwrapNestedProxyUrl(value: string, requestOrigin: string): string {
  let candidate = value;

  for (let i = 0; i < 4; i += 1) {
    try {
      const parsed = new URL(candidate, requestOrigin);
      const isProxyPath = parsed.pathname === PROXY_PATH || parsed.pathname === PROXY_ROUTE;
      const nestedTarget = parsed.searchParams.get('url');

      if (!isProxyPath || !nestedTarget) {
        return candidate;
      }

      candidate = nestedTarget;
    } catch {
      return candidate;
    }
  }

  return candidate;
}

function normalizeTargetUrl(request: NextRequest): string | null {
  const rawTarget = request.nextUrl.searchParams.get('url');

  if (!rawTarget) {
    return null;
  }

  const requestOrigin = request.nextUrl.origin;
  const unwrappedTarget = unwrapNestedProxyUrl(rawTarget, requestOrigin);

  try {
    const normalizedTarget = new URL(unwrappedTarget, requestOrigin);

    if (normalizedTarget.pathname === PROXY_PATH || normalizedTarget.pathname === PROXY_ROUTE) {
      const nestedTarget = normalizedTarget.searchParams.get('url');
      return nestedTarget ? unwrapNestedProxyUrl(nestedTarget, requestOrigin) : null;
    }

    return normalizedTarget.href;
  } catch {
    return unwrappedTarget;
  }
}

function proxifyUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();

  if (isSkippableUrl(trimmed)) {
    return value;
  }

  try {
    return buildProxyUrl(new URL(trimmed, baseUrl).href);
  } catch {
    return value;
  }
}

function rewriteSrcSet(value: string, baseUrl: string): string {
  return value
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) return candidate;
      return [proxifyUrl(parts[0], baseUrl), ...parts.slice(1)].join(' ');
    })
    .join(', ');
}

function rewriteHtmlResourceUrls(html: string, baseUrl: string): string {
  let output = html;

  output = output.replace(
    /\s(src|href|action|poster|data-src|data-href|data-original|data-lazy-src)=("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (_match, attr: string, _fullValue: string, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? bare ?? '';
      const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '';
      return ` ${attr}=${quote}${escapeHtmlAttribute(proxifyUrl(value, baseUrl))}${quote}`;
    },
  );

  output = output.replace(
    /\s(srcset|imagesrcset)=("([^"]*)"|'([^']*)')/gi,
    (_match, attr: string, _fullValue: string, doubleQuoted?: string, singleQuoted?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? '';
      const quote = doubleQuoted !== undefined ? '"' : "'";
      return ` ${attr}=${quote}${escapeHtmlAttribute(rewriteSrcSet(value, baseUrl))}${quote}`;
    },
  );

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

  const toProxyUrl = (input) => {
    try {
      const rawUrl = typeof input === 'string'
        ? input
        : input && typeof input.url === 'string'
          ? input.url
          : String(input);
      const resolved = new URL(rawUrl, baseUrl);

      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return input;
      }

      if (resolved.pathname === proxyPath && resolved.searchParams.has('url')) {
        return resolved.pathname + resolved.search;
      }

      return proxyPath + '?url=' + encodeURIComponent(resolved.href);
    } catch {
      return input;
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
      const originalOpen = xhr.open;
      xhr.open = function vaultlyOpen(method, url, async, user, password) {
        return originalOpen.call(xhr, method, toProxyUrl(url), async, user, password);
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
  const frameGuardScript = buildFrameGuardScript(baseUrl);
  let output = rewriteHtmlResourceUrls(html, baseUrl);

  if (/<base\b[^>]*>/i.test(output)) {
    output = output.replace(/<base\b[^>]*>/i, baseTag);
  } else if (/<head\b[^>]*>/i.test(output)) {
    output = output.replace(/<head\b[^>]*>/i, (head) => `${head}\n${baseTag}`);
  } else {
    output = `${baseTag}\n${output}`;
  }

  if (/<head\b[^>]*>/i.test(output)) {
    output = output.replace(/<head\b[^>]*>/i, (head) => `${head}\n${frameGuardScript}`);
  } else {
    output = `${frameGuardScript}\n${output}`;
  }

  return output;
}

function buildForwardHeaders(request: NextRequest, targetUrl: string): Headers {
  const headers = new Headers();
  const target = new URL(targetUrl);

  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!BLOCKED_REQUEST_HEADERS.has(normalizedKey)) {
      headers.set(key, value);
    }
  });

  headers.set('accept', request.headers.get('accept') ?? '*/*');
  headers.set('accept-language', request.headers.get('accept-language') ?? 'en-US,en;q=0.9');
  headers.set('referer', `${target.origin}/`);
  headers.set(
    'user-agent',
    request.headers.get('user-agent') ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  );

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers, contentType: string | null): Headers {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!BLOCKED_RESPONSE_HEADERS.has(normalizedKey)) {
      headers.set(key, value);
    }
  });

  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET, HEAD, POST, OPTIONS');
  headers.set('access-control-allow-headers', '*');
  headers.set('cache-control', headers.get('cache-control') ?? 'no-store, max-age=0');
  headers.set('x-vaultly-proxy', '1');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  headers.delete('content-security-policy');
  headers.delete('content-security-policy-report-only');
  headers.delete('set-cookie');
  headers.delete('set-cookie2');
  headers.delete('x-content-type-options');
  headers.delete('x-frame-options');

  return headers;
}

function buildCorsPreflightResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildResponseHeaders(new Headers(), 'text/plain; charset=utf-8'),
  });
}

async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method === 'OPTIONS') {
    return buildCorsPreflightResponse();
  }

  const targetUrl = normalizeTargetUrl(request);

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing required query parameter: url' },
      {
        status: 400,
        headers: buildResponseHeaders(new Headers(), 'application/json; charset=utf-8'),
      },
    );
  }

  if (!isHttpUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Invalid URL. Only http and https URLs are supported.' },
      {
        status: 400,
        headers: buildResponseHeaders(new Headers(), 'application/json; charset=utf-8'),
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestBody =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      body: requestBody,
      cache: 'no-store',
      headers: buildForwardHeaders(request, targetUrl),
      method: request.method,
      redirect: 'follow',
      signal: controller.signal,
    });

    const responseUrl = upstream.url || targetUrl;
    const upstreamContentType = upstream.headers.get('content-type');
    const responseHeaders = buildResponseHeaders(upstream.headers, upstreamContentType);

    if (request.method === 'HEAD') {
      return new NextResponse(null, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    const rawBody = await upstream.arrayBuffer();

    if (upstreamContentType && isHtmlContentType(upstreamContentType)) {
      const decoder = new TextDecoder();
      const transformedHtml = transformHtml(decoder.decode(rawBody), responseUrl);

      return new NextResponse(transformedHtml, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(rawBody, {
      status: upstream.status,
      headers: responseHeaders,
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

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return proxy(request);
}
