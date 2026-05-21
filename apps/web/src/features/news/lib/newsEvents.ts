const NEWS_READ_EVENT = 'mbd:news-read';

export function dispatchNewsRead(newsId: string) {
  window.dispatchEvent(new CustomEvent(NEWS_READ_EVENT, { detail: { newsId } }));
}

export function subscribeToNewsReadEvents(onRead: (newsId: string) => void) {
  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as { newsId?: unknown };
    if (typeof detail.newsId === 'string') {
      onRead(detail.newsId);
    }
  };

  window.addEventListener(NEWS_READ_EVENT, handler);
  return () => window.removeEventListener(NEWS_READ_EVENT, handler);
}
