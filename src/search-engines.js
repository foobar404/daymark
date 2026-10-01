export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', url: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}` },
  { id: 'bing', name: 'Bing', url: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}` },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}` },
  { id: 'brave', name: 'Brave Search', url: (query) => `https://search.brave.com/search?q=${encodeURIComponent(query)}` },
  { id: 'ecosia', name: 'Ecosia', url: (query) => `https://www.ecosia.org/search?q=${encodeURIComponent(query)}` },
  { id: 'yahoo', name: 'Yahoo', url: (query) => `https://search.yahoo.com/search?p=${encodeURIComponent(query)}` },
  { id: 'chatgpt', name: 'ChatGPT', url: (query) => `https://chatgpt.com/?q=${encodeURIComponent(query)}` },
  { id: 'perplexity', name: 'Perplexity', url: (query) => `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}` },
];

export function getSearchUrl(engineId, query) {
  const engine = SEARCH_ENGINES.find(({ id }) => id === engineId) ?? SEARCH_ENGINES.find(({ id }) => id === 'chatgpt');
  return engine.url(query);
}