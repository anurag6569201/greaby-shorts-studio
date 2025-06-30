// src/pages/RefundPolicyPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { PackageCheck, Undo2, Ban } from 'lucide-react';

const RefundPolicyPage = () => {
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => setCursorPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sections = [
    {
      icon: <PackageCheck size={32} className="text-green-500" />,
      title: "Service & Digital Delivery",
      content: "Greaby is a digital service provider. We do not ship physical products. All generated content (videos, audio, etc) is delivered electronically to your user dashboard immediately upon successful completion of the generation task. You can access and download your completed creations directly from your account library."
    },
    {
      icon: <Ban size={32} className="text-red-500" />,
      title: "Purchase & Cancellation Policy",
      content: "You can purchase 'Credits' on our platform to use our services. All purchases of Credit packs are processed through our secure payment partner, Razorpay. Once a purchase is completed and the Credits are added to your account, the sale is considered final. Due to the digital nature of Credits, we do not offer cancellations or cash refunds for purchased Credit packs."
    },
    {
      icon: <Undo2 size={32} className="text-blue-500" />,
      title: "Refund Policy for Service Usage",
      content: "While we do not offer cash refunds, we are committed to ensuring a fair experience. We understand that AI generation can sometimes encounter technical issues. A refund, in the form of Credits being returned to your account balance, will be issued **automatically** under one specific circumstance: a generation task fails due to a technical error on our end or from our AI service providers. You will see the refunded Credits back in your account, and the failed task will be clearly marked in your generation history."
    },
    {
      icon: <div className="w-8 h-8 flex items-center justify-center"><div className="w-3 h-3 bg-slate-400 rounded-full"></div></div>,
      title: "Non-Refundable Scenarios",
      content: "We do not provide Credit refunds for successfully generated content, even if you are not satisfied with the result. The nature of AI means that output quality can be variable. The cost in Credits is for the computational process of generation, not for a guaranteed specific outcome. We encourage you to start with smaller, less expensive generations to test prompts and voices."
    },
    {
      icon: <div className="w-8 h-8 flex items-center justify-center"><div className="w-3 h-3 bg-slate-400 rounded-full"></div></div>,
      title: "Contact for Refund Issues",
      content: "Our credit refund system for failed tasks is automated. However, if you believe a task failed and your Credits were not refunded, please contact our support team with the 'Creation ID' of the failed task. We will investigate the issue promptly. Please contact us at: anurag@greaby.cloud."
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
              Refund & Delivery Policy
            </motion.h1>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Last Updated: {effectiveDate}
            </motion.p>
          </motion.div>

          <motion.div
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 md:p-12 border border-indigo-100 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.1)", y: -5 }}
          >
            <p className="text-lg mb-12 text-center text-slate-600">
              This policy outlines how we handle purchases, refunds, and the delivery of our digital services. Please read it carefully before making a purchase.
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
                    <h3 className="text-xl font-bold mb-2 text-slate-900">
                      {section.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 group font-semibold"
            >
              <motion.span className="inline-block group-hover:-translate-x-1 transition-transform">
                ←
              </motion.span>
              <span className="group-hover:underline">Back to Home</span>
            </Link>
          </motion.div>
        </div>
      </div>
            {/* Floating action button */}
            <motion.div
              className="fixed bottom-8 right-8 z-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <Link to="/">
                <motion.div 
                  className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </motion.div>
              </Link>
            </motion.div>
      <Footer />
    </>
  );
};

export default RefundPolicyPage;