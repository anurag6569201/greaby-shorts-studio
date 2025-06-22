// src/hooks/useCachedVideo.js

import { useState, useEffect } from 'react';

const sessionBlobCache = new Map();

export function useCachedVideo(videoUrl) {
  const [source, setSource] = useState(sessionBlobCache.get(videoUrl) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoUrl || sessionBlobCache.has(videoUrl)) {
      setIsLoading(false);
      setSource(sessionBlobCache.get(videoUrl) || null);
      return;
    }

    let isCancelled = false;
    const loadVideo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
        
        const blob = await response.blob();
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