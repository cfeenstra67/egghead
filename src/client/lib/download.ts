export function downloadUrl(dataUrl: string, fileName: string): void {
  const element = document.createElement("a");
  element.setAttribute("href", dataUrl);
  element.setAttribute("download", fileName);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function cleanupUrl(url: string): void {
  if (url.startsWith("blob:chrome-extension://")) {
    URL.revokeObjectURL(url);
  }
}
