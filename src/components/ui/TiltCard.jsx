import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const TiltCard = ({ children }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Use spring animations for a more natural feel
  const mouseX = useSpring(x, { stiffness: 300, damping: 30, mass: 0.5 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30, mass: 0.5 });

  const rotateX = useTransform(
    mouseY,
    [-150, 150], // Input range (pixels from center)
    [15, -15]     // Output range (degrees)
  );
  const rotateY = useTransform(
    mouseX,
    [-150, 150], // Input range
    [-15, 15]     // Output range
  );

  const cardGlareX = useTransform(mouseX, [-150, 150], [0, 100]);
  const cardGlareY = useTransform(mouseY, [-150, 150], [0, 100]);
  const cardGlareOpacity = useTransform(
    [mouseX, mouseY],
    ([newX, newY]) => (Math.abs(newX) > 10 || Math.abs(newY) > 10 ? 1 : 0)
  );


  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Get mouse position relative to the center of the card
    const mouseX = e.clientX - (rect.left + width / 2);
    const mouseY = e.clientY - (rect.top + height / 2);

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className="relative w-full h-full bg-slate-100 rounded-2xl border border-slate-200 shadow-lg p-8"
    >
      <div style={{ transform: 'translateZ(50px)', transformStyle: 'preserve-3d' }} className="absolute inset-4 rounded-xl"/>
      
      {/* Glare Effect */}
      <motion.div
        style={{
          background: `radial-gradient(circle at ${cardGlareX}% ${cardGlareY}%, rgb(255 255 255 / 0.8), transparent)`,
          opacity: cardGlareOpacity,
          transform: `translateZ(20px)`
        }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
      />

      {/* Content */}
      <div style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default TiltCard;