import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './FancyCreationCard.css';

const getAspectRatioClass = (ratio) => {
  switch (ratio) {
    case '16:9': return 'aspect-video';
    case '1:1': return 'aspect-square';
    case '9:16': return 'aspect-[9/16]';
    default: return 'aspect-video';
  }
};

export const FancyCreationCard = ({ creation, cardVariants, variant = 1 }) => {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const handleDownload = (e) => {
    e.stopPropagation();
    window.open(creation.result_url, '_blank');
  };

  const cardClassName = `fancy-card variant-${variant}`;

  return (
    <motion.div layout variants={cardVariants}>
      <motion.div
        className={cardClassName}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className={`fancy-card__view ${getAspectRatioClass(creation.aspect_ratio)}`}>
          {creation.status === 'completed' && creation.result_url ? (
            <>
              {shouldLoadVideo ? (
                <video
                  key={creation.id}
                  src={creation.result_url}
                  controls
                  autoPlay
                  muted
                  loop
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 cursor-pointer group"
                    onClick={() => setShouldLoadVideo(true)}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-center p-4">
              {['pending', 'processing'].includes(creation.status) ? (
                <div>
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium capitalize">{creation.status}...</p>
                </div>
              ) : (
                <div>
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600 font-semibold">Failed</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fancy-card__content">
          <p className="text-sm font-medium line-clamp-2 text-gray-800" title={creation.prompt}>
            {creation.prompt.split(" ").slice(0, 15).join(" ") + (creation.prompt.split(" ").length > 15 ? "..." : "")}
          </p>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-500">
              {new Date(creation.created_at).toLocaleString()}
            </p>
            {creation.status === 'completed' && (
              <Button size="sm" variant="ghost" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};