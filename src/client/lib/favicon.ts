// // Source: https://dev.to/derlin/get-favicons-from-any-website-using-a-hidden-google-api-3p1e
// export function getFaviconUrlPublicApi(domain: string, size: number): string {
//   const url = new URL("https://www.google.com/s2/favicons");
//   url.searchParams.append("domain", domain);
//   url.searchParams.append("size", size.toString());
//   return url.href;
// }

// Source: https://stackoverflow.com/questions/72244038/need-t2-gstatic-url-parameters-for-web-scraping
export function getFaviconUrlPublicApi(domain: string, size: number): string {
  const url = new URL('https://t2.gstatic.com/faviconV2');
  url.searchParams.set('client', 'SOCIAL');
  url.searchParams.set('type', 'FAVICON');
  url.searchParams.set('fallback_opts', 'TYPE,SIZE,URL');
  url.searchParams.set('url', `http://${domain}`);
  url.searchParams.set('size', size.toString());
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
