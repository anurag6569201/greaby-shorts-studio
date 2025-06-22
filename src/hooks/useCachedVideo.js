import { useState, useEffect } from 'react';

const CACHE_NAME = 'greaby-video-cache-v1';

// A singleton Map that persists for the entire user session.
// This is the key to preventing re-downloads when changing tabs.
const sessionBlobCache = new Map();

const openCache = () => caches.open(CACHE_NAME);

export function useCachedVideo(videoUrl) {
  // Initialize state from the session cache first.
  const [source, setSource] = useState(sessionBlobCache.get(videoUrl) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only proceed if a URL is given AND it's not already loaded in the session.
    if (!videoUrl || sessionBlobCache.has(videoUrl)) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const loadVideo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cache = await openCache();
        let finalResponse;

        // 1. Check persistent browser cache (Cache API)
        const cachedResponse = await cache.match(videoUrl);
        if (cachedResponse) {
          finalResponse = cachedResponse;
        } else {
        // 2. If not found, fetch from network and store in persistent cache
          const response = await fetch(videoUrl);
          if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
          await cache.put(videoUrl, response.clone());
          finalResponse = response;
        }
        
        // 3. Create a blob and store its URL in the session cache
        const blob = await finalResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        if (!isCancelled) {
          sessionBlobCache.set(videoUrl, blobUrl);
          setSource(blobUrl);
        }
      } catch (err) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadVideo();
    return () => { isCancelled = true; };
  }, [videoUrl]);

  return { source, isLoading, error };
}