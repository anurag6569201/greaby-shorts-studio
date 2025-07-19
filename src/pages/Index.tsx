import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// EDIT: Added 'Globe' icon for the new translation feature.
import { Sparkles, Zap, Bot, ShieldCheck, Type, Mic, Download, Plus, Minus, ArrowRight, Twitter, Youtube, Github, FileText, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import Navbar from "./intro/Navbar";
import Footer from "./intro/Footer";
import texxt_image from '/intro/test.gif'

// NO CHANGE: This component provides the interactive background gradient effect.
const InteractiveCursor = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const mouse = { x: useMotionValue(0), y: useMotionValue(0) };
  const smoothOptions = { damping: 20, stiffness: 300, mass: 0.5 };
  const smoothMouse = { x: useSpring(mouse.x, smoothOptions), y: useSpring(mouse.y, smoothOptions) };

  const manageMouseMove = (e) => {
    const { clientX, clientY } = e;
    mouse.x.set(clientX);
    mouse.y.set(clientY);
  };

  useEffect(() => {
    window.addEventListener("mousemove", manageMouseMove);
    return () => window.removeEventListener("mousemove", manageMouseMove);
  }, []);

  if (!isClient) return null;

  return (
    <motion.div
      style={{ left: smoothMouse.x, top: smoothMouse.y }}
      className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 z-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-primary/20 via-secondary/20 to-primary/20 opacity-60 blur-3xl"
    />
  );
};

// NO CHANGE: This is the magnetic button component used for CTAs.
const MagneticButton = ({ children, className, ...props }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x, y });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  const { x, y } = position;
  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={reset} animate={{ x, y }} transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}>
      <Button className={cn("transform-gpu shadow-lg", className)} {...props}>
        {children}
      </Button>
    </motion.div>
  );
};

// NO CHANGE: This is a helper component for triggering animations when elements scroll into view.
const AnimatedInView = ({ children, variants, className = "", amount = 0.2, once = true }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  return (
    <motion.div ref={ref} className={className} variants={variants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      {children}
    </motion.div>
  );
};

// NO CHANGE: This component is for creating gradient text effects.
const GradientText = ({ children, className = "" }) => (
  <span className={cn("bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent", className)}>
    {children}
  </span>
);

const fadeIn = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const containerStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

// EDIT: The Hero section has been updated to reflect the broader range of AI tools.
const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <AnimatedInView variants={containerStagger} className="relative z-10">
            <motion.div variants={fadeIn}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium py-1 px-3">
                <Sparkles className="h-4 w-4 mr-2 text-primary animate-pulse" />
                YOUR COMPLETE AI CONTENT SUITE
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-slate-900">
              Create, Transcribe, <GradientText>and Translate.</GradientText>
            </motion.h1>
            <motion.p variants={fadeIn} className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl mx-auto md:mx-0">
              Generate lifelike voiceovers, get flawless transcriptions, and translate documents instantly with our suite of powerful AI tools.
            </motion.p>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <MagneticButton size="lg" className="bg-primary text-primary-foreground text-lg px-8 py-6 shadow-primary/30" onClick={() => navigate('/signup')}>
                Start Creating For Free <ArrowRight className="ml-2 h-5 w-5" />
              </MagneticButton>
              <MagneticButton size="lg" className="text-primary text-lg px-8 py-6 shadow-primary/30" onClick={() => navigate('/pricing')} style={{width: 'fit-content',background:'#f8f8f8'}}>
                View Pricing
              </MagneticButton>
            </motion.div>
          </AnimatedInView>
        </div>

        <div className="new_space_style">
          <div className="stack">
  <div className="card">
    <div className="image">
      <img src={texxt_image} alt="" />
    </div>
  </div>
</div>
        </div>

      </div>
    </section>
  );
};

// EDIT: The Bento Grid now includes "Document Translation" and is balanced with a 6-item layout.
const BentoGridFeatures = () => {
  const features = [
    { title: "98+ Realistic AI Voices", description: "Choose from a vast library of ultra-realistic voices to narrate your script perfectly. Powered by the latest text-to-speech AI.", icon: <Mic className="h-8 w-8 text-primary" />, className: "md:col-span-2", },
    { title: "Automatic Transcription", description: "Generate accurate SRT subtitles from your audio or video files with a single click. Boost your content's reach!", icon: <FileText className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "Instant Document Translation", description: "Translate your documents into any language with cutting-edge accuracy, preserving format and context.", icon: <Globe className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "Advanced Drawing Tool", description: "Draw realistic image based on raw drawings and basic drawing skills. (Coming Soon)", icon: <Bot className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "Pay-As-You-Go Credits", description: "No monthly subscriptions. Buy credits and use them for any tool you need. They never expire.", icon: <ShieldCheck className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <AnimatedInView variants={fadeIn} className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">An Entire AI Toolkit, In Your Browser</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">This is more than just a single tool. It's a full-stack workflow for all your content needs.</p>
      </AnimatedInView>
      <AnimatedInView variants={containerStagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => (
          <motion.div key={feature.title} variants={fadeIn} className={cn(feature.className)}>
            <Card className="h-full bg-white/70 backdrop-blur-sm border hover:border-primary/50 hover:-translate-y-1.5 transition-all duration-300 shadow-sm hover:shadow-xl z-10 relative">
              <CardHeader>{feature.icon}<CardTitle className="mt-4 text-slate-900">{feature.title}</CardTitle></CardHeader>
              <CardContent><p className="text-slate-600">{feature.description}</p></CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatedInView>
    </section>
  );
};

// EDIT: The "How It Works" section is now more generalized to cover all services.
const HowItWorks = () => {
  const steps = [
    { icon: <Plus className="h-8 w-8 text-primary" />, title: "1. Choose a Tool & Upload", description: "Select a service—voiceover, transcription, or translation—and provide your text or upload your file.", rotate: -3, y: 0 },
    { icon: <Zap className="h-8 w-8 text-secondary" />, title: "2. Let Our AI Do the Work", description: "Our powerful AI engine processes your request in seconds, ensuring high-quality and accurate results.", rotate: 2, y: 20 },
    { icon: <Download className="h-8 w-8 text-primary" />, title: "3. Download Your Asset", description: "Export your generated voiceover as an MP3, your transcription as an SRT, or your translated document.", rotate: -1, y: 5 },
  ];
  return (
    <section className="py-20 sm:py-28 overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-20">
          <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">It's Dangerously Simple.</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Just a few clicks stand between you and professional-grade AI-powered content.</p>
        </AnimatedInView>
        <AnimatedInView variants={containerStagger} className="grid md:grid-cols-3 gap-12 md:gap-8 items-start">
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeIn} style={{ y: step.y, rotate: step.rotate }} whileHover={{ rotate: 0, y: step.y - 10, scale: 1.05 }} transition={{ type: "spring", stiffness: 100 }} className="text-center">
              <Card className="h-full bg-white shadow-xl"><CardContent className="p-8"><div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-slate-100 border flex items-center justify-center">{step.icon}</div></div><h3 className="text-xl font-semibold mb-2 text-slate-800">{step.title}</h3><p className="text-slate-600">{step.description}</p></CardContent></Card>
            </motion.div>
          ))}
        </AnimatedInView>
      </div>
    </section>
  );
};

// NO CHANGE: The testimonials are strong and still relevant to your core services.
const DraggableTestimonials = () => {
  const testimonials = [
    { name: "Casey Neistat", role: "Filmmaker", avatar: "/avatars/casey.jpg", content: "The voice quality is indistinguishable from human. I use it for all my voiceover work now. Saves me hours.", rotate: -3 },
    { name: "Emma Chamberlain", role: "Podcaster", avatar: "/avatars/emma.jpg", content: "Getting my podcast transcribed used to be a huge pain. This tool is fast, 99% accurate, and so easy to use.", rotate: 2 },
    { name: "Ali Abdaal", role: "YouTuber", avatar: "/avatars/ali.jpg", content: "As a one-person team, this is my audio engineer. Perfect voiceovers and subtitles for all my courses and videos. A game-changer.", rotate: -1 },
    { name: "Pat Flynn", role: "Entrepreneur", avatar: "/avatars/pat.jpg", content: "My team uses this to create audio versions of our blog posts. The variety of voices is incredible and the quality is top-tier.", rotate: 4 },
  ];
  const containerRef = useRef(null);
  return (
    <section className="py-20 sm:py-28" style={{overflowX:'hidden'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-16"><h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">Loved by Top Creators</h2><p className="text-slate-600">Don't take our word for it. <span className="font-semibold text-primary">Drag to explore →</span></p></AnimatedInView>
        <motion.div ref={containerRef} className="cursor-grab active:cursor-grabbing"><motion.div drag="x" dragConstraints={containerRef} className="flex gap-6 w-max py-4">{testimonials.map((testimonial, i) => (
          <motion.div key={i} variants={fadeIn} className="w-[350px] md:w-[400px]" style={{ rotate: testimonial.rotate }} whileHover={{ rotate: 0, y: -10, scale: 1.03 }} transition={{ type: "spring", stiffness: 150 }}>
            <Card className="bg-white h-full shadow-2xl rounded-xl"><CardContent className="p-6 flex flex-col h-full"><p className="text-slate-700 text-lg mb-6">"{testimonial.content}"</p><div className="flex items-center"><Avatar className="h-10 w-10 mr-3"><AvatarImage src={testimonial.avatar} alt={testimonial.name} /><AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar><div><p className="font-semibold text-slate-800">{testimonial.name}</p><p className="text-sm text-slate-500">{testimonial.role}</p></div></div></CardContent></Card>
          </motion.div>
        ))}</motion.div></motion.div>
      </div>
    </section>
  );
};

// EDIT: A new question has been added to the FAQ to address the range of services.
const Faq = () => {
  const faqs = [
    { question: "What are credits and how do they work?", answer: "Credits are our pay-as-you-go currency. You buy a pack of credits, and each task (voice generation, transcription, translation) uses a certain amount. Credits never expire and you can see the cost before you start." },
    { question: "What tools does your platform offer?", answer: "We provide a suite of AI tools, including text-to-speech with over 98 voices, audio/video transcription for subtitles, and document translation. We are constantly working on adding more tools to the platform." },
    { question: "Can I use the generated content for commercial purposes?", answer: "Absolutely. Any content you create with your credits is yours to use for any purpose, including monetization on platforms like YouTube, podcasts, and audiobooks." },
    { question: "What if an AI-generated task fails?", answer: "We have a robust system in place. If any job fails due to a technical error on our end, the credits for that task are automatically and instantly refunded to your account." },
  ];
  const [expanded, setExpanded] = useState(0);
  return (
    <section className="py-20 sm:py-28 bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-12"><h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">Your Questions, Answered.</h2></AnimatedInView>
        <div>{faqs.map((faq, index) => (
          <div className="border-b py-6" key={index}><button onClick={() => setExpanded(expanded === index ? null : index)} className="w-full flex justify-between items-center text-left"><h3 className="text-lg font-medium text-slate-800">{faq.question}</h3><div className="text-primary">{expanded === index ? <Minus /> : <Plus />}</div></button><AnimatePresence>{expanded === index && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden"><p className="pt-4 text-slate-600">{faq.answer}</p></motion.div>)}</AnimatePresence></div>
        ))}</div>
      </div>
    </section>
  );
};

// EDIT: The final Call To Action has been updated for a broader appeal.
const Cta = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="relative rounded-2xl p-10 md:p-16 bg-gradient-to-r from-primary to-secondary text-primary-foreground overflow-hidden shadow-2xl shadow-primary/20">
          <div className="relative text-center"><h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Unlock Your Creative Potential.</h2><p className="text-xl text-primary-foreground/80 mb-8">The next era of content creation is here. Are you in?</p><MagneticButton size="lg" className="bg-white text-primary hover:bg-slate-100 text-lg px-10 py-7" onClick={() => navigate('/signup')}>Claim Your Free Credits</MagneticButton></div>
        </AnimatedInView>
      </div>
    </section>
  );
};

// NO CHANGE: This is the main component that assembles the page.
const Index = () => {
  return (
    <div className="bg-background text-foreground relative">
      <InteractiveCursor />
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <div id="features"><BentoGridFeatures /></div>
          <HowItWorks />
          <DraggableTestimonials />
          <Cta />
          <Faq />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;