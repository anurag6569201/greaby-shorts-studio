
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Twitter, Youtube, Github } from 'lucide-react';

const Footer = () => (
  <footer className="bg-slate-900 text-slate-400">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary-foreground" /></div><span className="text-xl font-bold text-white">Greaby</span></div>
          <p className="mt-4 text-sm">The AI co-pilot for viral content.</p>
        </div>
        <div><h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Product</h3><ul className="mt-4 space-y-3">
          <li><a href="/#features" className="hover:text-primary transition-colors">Features</a></li>
          <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
          <li><Link to="/login" className="hover:text-primary transition-colors">Login</Link></li>
        </ul></div>
        <div><h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Company</h3><ul className="mt-4 space-y-3">
          <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
          <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
        </ul></div>
        <div><h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Legal</h3><ul className="mt-4 space-y-3">
          <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
          <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
          <li><Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link></li>
          <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
          <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping and delivery</Link></li>
        </ul></div>
      </div>
      <div className="mt-8 py-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} Greaby. All rights reserved.</p>
        {/* <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-primary transition-colors"><Github className="h-5 w-5" /></a>
        </div> */}
      </div>
    </div>
  </footer>
);


export default Footer;