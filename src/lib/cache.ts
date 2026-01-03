// Cache utilities for link data
const CACHE_PREFIX = "paywall_link_";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedLink(linkId: string): any | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${linkId}`);
    if (!cached) return null;

    const entry: CacheEntry<any> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${linkId}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

export function setCachedLink(linkId: string, data: any): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry<any> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${linkId}`, JSON.stringify(entry));
  } catch (error) {
    console.error("Error writing cache:", error);
  }
}

export function invalidateLinkCache(linkId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${CACHE_PREFIX}${linkId}`);
}

export function invalidateAllLinkCaches(): void {
  if (typeof window === "undefined") return;
  
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

// Cache for links list
const LINKS_LIST_CACHE_KEY = "paywall_links_list";

export function getCachedLinksList(): any[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(LINKS_LIST_CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry<any[]> = JSON.parse(cached);
    const now = Date.now();

    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(LINKS_LIST_CACHE_KEY);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Error reading links list cache:", error);
    return null;
  }
}

export function setCachedLinksList(links: any[]): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry<any[]> = {
      data: links,
      timestamp: Date.now(),
    };
    localStorage.setItem(LINKS_LIST_CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error("Error writing links list cache:", error);
  }
}

export function invalidateLinksListCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LINKS_LIST_CACHE_KEY);
}

