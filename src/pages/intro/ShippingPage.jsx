// src/pages/ShippingPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { CloudDownload, Clock, FolderKanban, AlertTriangle, PackageX } from 'lucide-react';

const ShippingPage = () => {
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => setCursorPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sections = [
    {
      icon: <PackageX size={32} className="text-indigo-500" />,
      title: "100% Digital Service",
      content: "Greaby is a digital service provider. We do not ship or deliver any physical products. All services and generated content are accessible electronically through our platform."
    },
    {
      icon: <CloudDownload size={32} className="text-blue-500" />,
      title: "Content Delivery",
      content: "All generated content (such as videos, audio files, and subtitles) is delivered directly to your user account dashboard. Once a generation task is successfully completed, the resulting files become immediately available in your personal library on the Greaby website."
    },
    {
      icon: <Clock size={32} className="text-green-500" />,
      title: "Delivery Timeframe",
      content: "The delivery of your generated content is typically near-instantaneous, occurring within seconds or minutes after the AI processing is complete. The exact time can vary depending on the complexity of your request and current server load. You can monitor the status of your creations in your account."
    },
    {
      icon: <FolderKanban size={32} className="text-slate-500" />,
      title: "Accessing Your Deliveries",
      content: "To access your content, simply log in to your Greaby account and navigate to your 'Library' or 'Creations' section. From there, you can view, play, and download your files to your local device at any time."
    },
    {
      icon: <AlertTriangle size={32} className="text-yellow-500" />,
      title: "Failed Deliveries",
      content: "In the rare event that a generation task fails due to a technical error on our end, the 'delivery' is considered failed. In such cases, our system will automatically process a refund of the Credits used for that task. Please see our Cancellation & Refund Policy for more details."
    }
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 relative overflow-hidden text-slate-800">
        <div className="fixed top-0 left-0 pointer-events-none z-50">
          <motion.div
            className="w-8 h-8 rounded-full border border-indigo-300 absolute"
            style={{ x: cursorPosition.x - 16, y: cursorPosition.y - 16 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-4xl mx-auto py-16 px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4"
              animate={{ textShadow: ["0 0 0px rgba(99, 102, 241, 0)", "0 0 10px rgba(99, 102, 241, 0.3)", "0 0 0px rgba(99, 102, 241, 0)"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              Shipping & Delivery Policy
            </motion.h1>
            <p className="text-muted-foreground">Last Updated: {effectiveDate}</p>
          </motion.div>

          <motion.div
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 md:p-12 border border-indigo-100 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.1)", y: -5 }}
          >
            <p className="text-lg mb-12 text-center text-slate-600">
              This policy explains how you receive the digital goods and services you create with Greaby.
            </p>

            <div className="space-y-10">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                >
                  <div className="flex-shrink-0 mt-1 bg-slate-100/80 p-3 rounded-full">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{section.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{section.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 group font-semibold">
              <motion.span className="inline-block group-hover:-translate-x-1 transition-transform">←</motion.span>
              <span className="group-hover:underline">Back to Home</span>
            </Link>
          </motion.div>
        </div>
        
        <motion.div className="fixed bottom-8 right-8 z-20" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}>
          <Link to="/">
            <motion.div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg" whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </motion.div>
          </Link>
        </motion.div>
      </div>
      <Footer />
    </>
  );
};

export default ShippingPage;