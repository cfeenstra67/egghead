import { AppRuntime } from './types';

// Source: https://dev.to/derlin/get-favicons-from-any-website-using-a-hidden-google-api-3p1e
export function getFaviconUrlPublicApi(domain: string, size: number): string {
  const url = new URL('https://www.google.com/s2/favicons');
  url.searchParams.append('domain', domain);
  url.searchParams.append('size', size.toString());
  return url.href;
}

// // Source: https://dev.to/derlin/get-favicons-from-any-website-using-a-hidden-google-api-3p1e
// export function getFaviconUrlPublicApi(domain: string, size: number): string {
//   return `https://icons.duckduckgo.com/ip3/${domain}`;
// }

// // Got from inspecting default history page
// export function getFaviconUrlChromeInternal(domain: string, size: number): string {
//   const url = new URL('chrome://favicon2/');
//   url.searchParams.append('url', `https://${domain}`);
//   url.searchParams.append('size', size.toString());
//   url.searchParams.append('scale_factor', '2x');
//   url.searchParams.append('allow_google_server_fallback', '0');
//   return url.href;
// }

export function getFaviconUrl(runtime: AppRuntime, domain: string, size: number): string {
  switch (runtime) {
    case AppRuntime.Web:
      return getFaviconUrlPublicApi(domain, size);
    case AppRuntime.Extension:
      return getFaviconUrlPublicApi(domain, size);
  }
}