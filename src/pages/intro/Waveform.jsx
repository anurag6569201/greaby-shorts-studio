// src/pages/intro/Waveform.jsx

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const Waveform = ({ audioSrc, waveColor, progressColor, isPlaying, onFinish, onReady }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isWaveformReady, setWaveformReady] = useState(false);

  // Create and configure the WaveSurfer instance
  useEffect(() => {
    if (!waveformRef.current) return;

    // Destroy previous instance if it exists
    if (wavesurfer.current) {
        wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: waveColor || '#e5e7eb',
      progressColor: progressColor || '#8b5cf6',
      cursorWidth: 0,
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      height: 80,
      url: audioSrc,
    });
    
    setWaveformReady(false); // Reset readiness for new audio source

    wavesurfer.current.on('ready', () => {
        setWaveformReady(true);
        if (onReady) onReady();
    });
    
    wavesurfer.current.on('finish', () => {
        if (onFinish) onFinish();
    });

    return () => {
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
        }
    };
  // We want this to re-run ONLY when the audio source changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  // Control playback based on isPlaying prop and readiness
  useEffect(() => {
    if (!wavesurfer.current || !isWaveformReady) return;

    if (isPlaying) {
      // The play() method returns a promise. We catch the AbortError.
      wavesurfer.current.play().catch((error) => {
        if (error.name !== 'AbortError') {
          console.error("Playback error:", error);
        }
      });
    } else {
      wavesurfer.current.pause();
    }
  }, [isPlaying, isWaveformReady]);

  return <div ref={waveformRef} />;
};

export default Waveform;