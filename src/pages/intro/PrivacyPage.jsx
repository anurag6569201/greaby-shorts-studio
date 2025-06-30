import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from './Footer';
import Navbar from './Navbar';

const PrivacyPage = () => {
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
      title: "Information We Collect",
      items: [
        "Account Information: When you register, we collect your name, email address, and hashed password.",
        "User Input: We collect the text prompts, scripts, and other data you provide to generate content.",
        "Generated Content: We store the AI-generated videos, audio files, and subtitles you create so you can access them in your library.",
        "Transaction Data: We collect details of your Credit purchases and a history of your Credit usage for different generation tasks.",
        "Payment Information: When you purchase Credits, your payment details are provided directly to our payment processor, Razorpay. We do not store your full credit card information on our servers.",
        "Usage Information: We automatically collect information about your activity on our Service, such as which features you use and when."
      ]
    },
    {
      title: "How We Use Your Information",
      items: [
        "To provide, operate, and maintain our Service.",
        "To process your content generation requests by sending your User Input to our AI service providers .",
        "To manage your account, including processing your transactions and maintaining your Credit balance.",
        "To improve and personalize the Service.",
        "To communicate with you for customer service, to provide you with updates, and for marketing purposes.",
        "To prevent fraud and ensure the security of our platform."
      ],
      note: "We do not use your User Input or your Generated Content to train our own AI models."
    },
    {
      title: "How We Share Your Information",
      items: [
        "With AI Service Providers: We share your User Input with third-party AI providers to fulfill your generation requests.",
        "With Payment Processors: We share transaction information with Razorpay to process your payments.",
        "For Legal Reasons: We may disclose your information if required by law or to protect the rights, property, or safety of Greaby, our users, or the public."
      ]
    },
    {
      title: "Data Storage and Security",
      content: "Your information, including User Input and Generated Content, is stored on secure servers provided by Microsoft Azure. We implement industry-standard security measures to protect your data. However, no system is 100% secure, and we cannot guarantee absolute security."
    },
    {
      title: "Your Data Rights and Choices",
      content: "You can access and update your account information through your profile settings. You have the right to delete your Generated Content from your account library at any time. If you wish to delete your entire account and associated personal data, please contact us at anurag@greaby.cloud."
    },
    {
      title: "Children's Privacy",
      content: "Our Service is not directed to individuals under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information."
    },
    {
      title: "Changes to This Privacy Policy",
      content: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the 'Last Updated' date."
    },
    {
      title: "Contact Us",
      content: "If you have any questions or concerns about this Privacy Policy, please contact us at: anurag@greaby.cloud."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 relative overflow-hidden">
      <Navbar/>

      
      {/* Subtle cursor effect */}
      <div className="fixed top-0 left-0 pointer-events-none z-50">
        <motion.div
          className="w-8 h-8 rounded-full border border-indigo-300 absolute"
          style={{
            x: cursorPosition.x - 16,
            y: cursorPosition.y - 16,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
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
                animate={{
                textShadow: [
                    "0 0 0px rgba(99, 102, 241, 0)",
                    "0 0 10px rgba(99, 102, 241, 0.3)",
                    "0 0 0px rgba(99, 102, 241, 0)"
                ]
                }}
                transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
                }}
          >
            Privacy Policy
          </motion.h1>
          <motion.p 
            className="text-muted-foreground inline-block px-4 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-100"
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
          whileHover={{ 
            boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.1)",
            y: -5
          }}
        >
          <motion.p 
            className="text-lg mb-8 text-center text-slate-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Your privacy is important to us. This Privacy Policy explains how Greaby ("we," "us," or "our") collects, uses, and discloses information about you when you access or use our website and services.
          </motion.p>
          
          <div className="space-y-16">
            {sections.map((section, index) => (
              <motion.div 
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1), duration: 0.6 }}
                onMouseEnter={() => setActiveSection(index)}
                onMouseLeave={() => setActiveSection(null)}
              >
                <motion.div 
                  className={`absolute -left-8 top-0 w-1 h-full bg-indigo-100 rounded-full ${
                    activeSection === index ? 'opacity-100' : 'opacity-30'
                  }`}
                  animate={{
                    height: activeSection === index ? '100%' : '30%',
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                
                <motion.h3 
                  className="text-xl font-bold mb-4 flex items-center"
                  animate={{ 
                    color: activeSection === index ? '#4f46e5' : '#1e293b',
                    x: activeSection === index ? 5 : 0
                  }}
                >
                  <motion.span
                    className="mr-2"
                    animate={{ 
                      scale: activeSection === index ? 1.2 : 1,
                      rotate: activeSection === index ? 10 : 0
                    }}
                  >
                    {index + 1}.
                  </motion.span>
                  {section.title}
                </motion.h3>
                
                {section.content && (
                  <motion.p 
                    className="pl-8 border-l border-indigo-100 text-slate-700 mb-4"
                    animate={{ 
                      paddingLeft: activeSection === index ? '3rem' : '2rem',
                      borderLeftWidth: activeSection === index ? '2px' : '1px'
                    }}
                  >
                    {section.content}
                  </motion.p>
                )}
                
                {section.subsections && (
                  <div className="pl-8 space-y-6">
                    {section.subsections.map((subsection, subIndex) => (
                      <div key={subIndex} className="mb-4">
                        <motion.h4 
                          className="font-semibold text-indigo-700 mb-2"
                          animate={{ 
                            x: activeSection === index ? 5 : 0
                          }}
                        >
                          {subsection.title}
                        </motion.h4>
                        <ul className="space-y-2 pl-5">
                          {subsection.items.map((item, itemIndex) => (
                            <motion.li 
                              key={itemIndex}
                              className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-indigo-400"
                              animate={{ 
                                x: activeSection === index ? 5 : 0
                              }}
                            >
                              {item}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                
                {section.items && (
                  <ul className="pl-8 space-y-2 mb-4">
                    {section.items.map((item, itemIndex) => (
                      <motion.li 
                        key={itemIndex} 
                        className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-indigo-400"
                        animate={{ 
                          x: activeSection === index ? 5 : 0
                        }}
                      >
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                )}
                
                {section.note && (
                  <motion.div 
                    className="pl-8 mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100"
                    animate={{ 
                      x: activeSection === index ? 5 : 0
                    }}
                  >
                    <p className="text-indigo-700 font-medium">{section.note}</p>
                  </motion.div>
                )}
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
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 group"
          >
            <motion.span 
              className="inline-block group-hover:-translate-x-1 transition-transform"
            >
              ←
            </motion.span>
            <span className="group-hover:underline">Back to Home</span>
          </Link>
        </motion.div>
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
      
      <Footer/>
    </div>
  );
};

export default PrivacyPage;