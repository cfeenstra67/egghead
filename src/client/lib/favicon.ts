
// Source: https://dev.to/derlin/get-favicons-from-any-website-using-a-hidden-google-api-3p1e
export function getFaviconUrl(domain: string, size: number): string {
  const url = new URL('https://www.google.com/s2/favicons');
  url.searchParams.append('domain', domain);
  url.searchParams.append('size', size.toString());
  return url.href;
}
