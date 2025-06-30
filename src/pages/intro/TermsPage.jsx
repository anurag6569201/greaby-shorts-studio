// src/pages/TermsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';

const TermsPage = () => {
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const sections = [
    {
      title: "Agreement to Terms",
      content: "By creating an account, purchasing Credits, or using our Service in any way, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not use the Service."
    },
    {
      title: "The Greaby Service",
      content: "Greaby provides a platform for users to generate video, audio, and subtitle content (\"Generated Content\") using artificial intelligence models. The Service is accessed via our website and is available on a pay-as-you-go basis."
    },
    {
      title: "User Accounts",
      content: "You must be at least 13 years old to use the Service. You are responsible for all activities that occur under your account and for keeping your password confidential. You agree to notify us immediately of any unauthorized use of your account."
    },
    {
      title: "Credits and Payments",
      content: "The Service operates on a \"Credit\" system. You can purchase Credits through our payment provider, Razorpay. These Credits are then used to pay for content generation. The cost of each generation in Credits is clearly displayed before you initiate the task. All Credit purchases are final and non-refundable, except as specified in our Cancellation & Refund Policy."
    },
    {
      title: "Content and Ownership",
      content: "You retain ownership of the text prompts and scripts you provide (\"User Input\"). Subject to your compliance with these Terms, you own all rights to the Generated Content you create. You are free to use your Generated Content for any personal or commercial purpose. We do not claim any ownership rights to your User Input or Generated Content."
    },
    {
      title: "Prohibited Conduct",
      content: "You agree not to use the Service to generate content that is illegal, defamatory, harassing, hateful, or that infringes on any third party's rights, including intellectual property, privacy, or publicity rights. You may not use the Service for any purpose that violates applicable local, state, national, or international law."
    },
    {
      title: "Service Availability and Disclaimers",
      content: "The Service is provided on an \"AS IS\" and \"AS AVAILABLE\" basis. We do not warrant that the Service will be uninterrupted, error-free, or completely secure. The quality of Generated Content can vary and may not always meet your expectations. Generation tasks may occasionally fail due to technical issues with our AI providers."
    },
    {
      title: "Termination",
      content: "We reserve the right to suspend or terminate your account at any time, without prior notice or liability, for any reason, including but not limited to a breach of these Terms. Upon termination, your right to use the Service will immediately cease. Any unused Credits will be forfeited and are non-refundable."
    },
    {
        title: "Governing Law",
        content: "These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms will be subject to the exclusive jurisdiction of the courts located in Maihar 485771, India."
    },
    {
      title: "Changes to Terms",
      content: "We may modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the 'Last Updated' date. Your continued use of the Service after such changes constitutes your acceptance of the new Terms."
    },
    {
      title: "Contact Us",
      content: "If you have any questions about these Terms, please contact us at anurag@greaby.cloud."
    }
  ];

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 relative overflow-hidden">
        <div className="fixed top-0 left-0 pointer-events-none z-50">
            <motion.div
              className="w-8 h-8 rounded-full border border-indigo-300 absolute"
              style={{ x: cursorPosition.x - 16, y: cursorPosition.y - 16, }}
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
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                  animate={{ textShadow: [ "0 0 0px rgba(99, 102, 241, 0)", "0 0 10px rgba(99, 102, 241, 0.3)", "0 0 0px rgba(99, 102, 241, 0)" ] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                  Terms of Service
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
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10 border border-indigo-100 mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              whileHover={{ boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.1)", y: -5 }}
            >
              <motion.p 
                  className="text-lg mb-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
              >
                  Welcome to Greaby! These Terms of Service ("Terms") govern your access to and use of the Greaby website, applications, and services (collectively, the "Service"). Please read these Terms carefully before using our Service.
              </motion.p>
              <div className="space-y-12">
                  {sections.map((section, index) => (
                  <motion.div 
                      key={index}
                      className="relative pb-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1), duration: 0.6 }}
                      onMouseEnter={() => setActiveSection(index)}
                      onMouseLeave={() => setActiveSection(null)}
                  >
                      <motion.div 
                        className={`absolute -left-8 top-0 w-1 h-full bg-indigo-100 rounded-full ${ activeSection === index ? 'opacity-100' : 'opacity-30' }`}
                        animate={{ height: activeSection === index ? '100%' : '30%', }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      <motion.h3 
                        className="text-xl font-bold mb-4 flex items-center"
                        animate={{ color: activeSection === index ? '#4f46e5' : '#1e293b', x: activeSection === index ? 5 : 0 }}
                      >
                        <motion.span className="mr-2" animate={{ scale: activeSection === index ? 1.2 : 1, rotate: activeSection === index ? 10 : 0 }} >
                          {index + 1}.
                        </motion.span>
                        {section.title}
                      </motion.h3>
                      <motion.p 
                        className="pl-8 border-l border-indigo-100 text-slate-700"
                        animate={{ paddingLeft: activeSection === index ? '3rem' : '2rem', borderLeftWidth: activeSection === index ? '2px' : '1px' }}
                      >
                        {section.content}
                      </motion.p>
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
              <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 group" >
                  <motion.span className="inline-block group-hover:-translate-x-1 transition-transform">←</motion.span>
                  <span className="group-hover:underline">Back to Home</span>
              </Link>
            </motion.div>
        </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </motion.div>
            </Link>
        </motion.div>
        </div>
        <Footer/>
    </>
  );
};

export default TermsPage;