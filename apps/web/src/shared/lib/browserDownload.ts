export interface BrowserDownloadRequest {
  filename: string;
  payload: string;
  mimeType?: string;
}

/**
 * Requests a browser download from an explicit player action. Returning means
 * the click was dispatched, not that the browser ultimately kept the file.
 */
export function requestBrowserDownload({
  filename,
  payload,
  mimeType = 'application/json',
}: BrowserDownloadRequest): void {
  if (typeof document === 'undefined'
    || typeof window === 'undefined'
    || typeof window.URL?.createObjectURL !== 'function'
    || typeof window.URL?.revokeObjectURL !== 'function') {
    throw new Error('Browser downloads are unavailable in this environment.');
  }

  const blob = new Blob([payload], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.click();
  } finally {
    window.URL.revokeObjectURL(url);
  }
}
