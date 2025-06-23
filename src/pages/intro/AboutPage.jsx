// src/pages/AboutPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Users, Zap } from 'lucide-react'; // Added more icons
import { motion } from 'framer-motion';
import TiltCard from '@/components/ui/TiltCard'; // Import the new component
import Footer from './Footer';

// Animation variants from before
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="py-4 px-8 flex justify-between items-center bg-white border-b"
      >
        <Link to="/" className="flex items-center space-x-2">
          <motion.div
            className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
            whileHover={{ scale: 1.2, rotate: 15 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <span className="text-2xl font-bold">Greaby</span>
        </Link>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </motion.div>
      </motion.header>

      <main className="max-w-6xl mx-auto py-16 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center"
        >
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-bold tracking-tight mb-4"
          >
            About Greaby
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground mb-16"
          >
            Our mission is to empower creators with superhuman abilities.
          </motion.p>
        </motion.div>

        {/* Interactive Tilt Cards Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Card 1 */}
          <motion.div variants={itemVariants}>
            <TiltCard>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 mb-4 bg-primary/20 rounded-full">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Our Principle</h3>
                <p className="text-muted-foreground">
                  Creativity should not be limited by technical skill or time. We build tools that handle the heavy lifting, so you can focus on your vision.
                </p>
              </div>
            </TiltCard>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={itemVariants}>
            <TiltCard>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 mb-4 bg-primary/20 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Our Team</h3>
                <p className="text-muted-foreground">
                  A passionate group of engineers, designers, and AI enthusiasts dedicated to building tools that feel like magic and work alongside you.
                </p>
              </div>
            </TiltCard>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={itemVariants}>
            <TiltCard>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 mb-4 bg-primary/20 rounded-full">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Our Vision</h3>
                <p className="text-muted-foreground">
                  The future of content creation is collaborative, intelligent, and instantaneous. We're excited to build that future with you.
                </p>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </main>
      <Footer/>
    </div>
  );
};

export default AboutPage;