// src/pages/ContactPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { Mail, Briefcase, MapPin } from 'lucide-react';

const ContactPage = () => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => setCursorPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const contactMethods = [
    {
      icon: <Mail size={24} className="text-indigo-500" />,
      title: "Email Support",
      description: "For technical issues, billing questions, or general inquiries.",
      contactInfo: "anurag@greaby.cloud",
      href: "mailto:anurag@greaby.cloud"
    },
    {
      icon: <Briefcase size={24} className="text-green-500" />,
      title: "Business Inquiries",
      description: "For partnerships, press, and other business-related matters.",
      contactInfo: "anurag@greaby.cloud",
      href: "mailto:anurag@greaby.cloud?subject=Business Inquiry"
    },
    {
      icon: <MapPin size={24} className="text-red-500" />,
      title: "Mailing Address",
      description: "Please note we are a digital-first company and do not offer in-person support.",
      contactInfo: "Greaby, Maihar 485771, Madhya Pradesh, India",
      href: "#"
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
              Get in Touch
            </motion.h1>
            <p className="text-muted-foreground">We typically respond within 24-48 business hours.</p>
          </motion.div>

          <motion.div
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 md:p-12 border border-indigo-100 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="grid md:grid-cols-1 gap-8">
              {contactMethods.map((method, index) => (
                <motion.a
                  key={index}
                  href={method.href}
                  target={method.href.startsWith("mailto:") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="block p-6 rounded-xl transition-all border border-transparent hover:border-indigo-200 hover:bg-slate-50/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.15, duration: 0.6 }}
                  whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1 bg-slate-100 p-3 rounded-full">{method.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{method.title}</h3>
                      <p className="text-slate-500 mt-1">{method.description}</p>
                      <p className="text-indigo-600 font-semibold mt-2 break-all">{method.contactInfo}</p>
                    </div>
                  </div>
                </motion.a>
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

export default ContactPage;