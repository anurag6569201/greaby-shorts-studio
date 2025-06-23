import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Rss } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const BlogPage = () => {
  return (
    <>
    <Navbar/>
    <div className="bg-slate-50 flex flex-col items-center justify-center text-center px-4" style={{ minHeight: '60vh' }}>
      <Rss className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-4xl font-bold mb-2">Our Blog is Coming Soon</h1>
      <p className="text-lg text-muted-foreground mb-8">
        We're busy writing articles and tutorials to help you get the most out of Greaby.
      </p>
      <Link to="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors">
        Return to Home
      </Link>
    </div>
    <Footer/>
    </>
  );
};

export default BlogPage;