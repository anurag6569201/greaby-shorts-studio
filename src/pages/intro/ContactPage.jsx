import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const ContactPage = () => {
  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4"  style={{ minHeight: '60vh' }}>
      <Mail className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-4xl font-bold mb-2">Get In Touch</h1>
      <p className="text-lg text-muted-foreground mb-4">
        Have questions or feedback? We'd love to hear from you.
      </p>
      <a href="mailto:anurag@greaby.cloud" className="text-xl font-semibold text-primary hover:underline mb-8">
        anurag@greaby.cloud
      </a>
      <Link to="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors">
        Return to Home
      </Link>
    </div>
    <Footer/>
    </>
  );
};

export default ContactPage;