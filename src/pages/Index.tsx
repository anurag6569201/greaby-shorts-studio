import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Sparkles, Zap, Users, Star, Check, Film, Bot, ShieldCheck, Type, Mic, Download, Plus, Minus, ArrowRight,Twitter, Youtube, Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

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

const AnimatedInView = ({ children, variants, className = "", amount = 0.2, once = true }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  return (
    <motion.div ref={ref} className={className} variants={variants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      {children}
    </motion.div>
  );
};

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

const Nav = () => {
  const navigate = useNavigate();
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Greaby</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>Login</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/signup')}>Try Free</Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const mouseX = useMotionValue(Infinity);

const videoCards = [
    { src: "/placeholder.svg", rotate: -15, y: 25, x: -90 },
    { src: "/placeholder.svg", rotate: -5,  y: 0,  x: -30 },
    { src: "/placeholder.svg", rotate: 5,   y: 0,  x: 30 },
    { src: "/placeholder.svg", rotate: 15,  y: 25, x: 90 },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <AnimatedInView variants={containerStagger} className="relative z-10">
            <motion.div variants={fadeIn}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium py-1 px-3">
                <Sparkles className="h-4 w-4 mr-2 text-primary animate-pulse" />
                BETA: AI-POWERED VIDEO CREATION
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-slate-900">
              Idea to <GradientText>Viral Shorts</GradientText> — Instantly.
            </motion.h1>
            <motion.p variants={fadeIn} className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl mx-auto md:mx-0">
              Stop wasting hours editing. Generate mind-blowing 20-second shorts from a single prompt.
            </motion.p>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <MagneticButton size="lg" className="bg-primary text-primary-foreground text-lg px-8 py-6 shadow-primary/30" onClick={() => navigate('/signup')}>
                Unleash The AI <ArrowRight className="ml-2 h-5 w-5" />
              </MagneticButton>
                          <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/pricing')}>
              View Pricing
            </Button>
            </motion.div>
          </AnimatedInView>
        </div>
        <div 
          ref={gridRef}
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="relative h-96 w-full"
        >
          {videoCards.map((card, i) => {
            const springConfig = { stiffness: 100, damping: 15, mass: 0.1 };
            const motionX = useSpring(0, springConfig);
            const motionY = useSpring(0, springConfig);

            useEffect(() => {
                const update = mouseX.onChange((v) => {
                    if (v !== Infinity && gridRef.current) {
                        const bounds = gridRef.current.getBoundingClientRect();
                        // Make the parallax effect a bit more subtle to complement the fan
                        const newX = (v - bounds.left - bounds.width / 2) / 10;
                        motionX.set(newX * (i < 2 ? -1 : 1)); // Adjust direction based on side
                        motionY.set(Math.abs(newX) * -0.5); // All cards lift up slightly
                    } else {
                        motionX.set(0);
                        motionY.set(0);
                    }
                });
                return () => update();
            }, [mouseX, motionX, motionY, i]);

            return (
              <motion.div
                key={i}
                // 2. Added `origin-bottom` so the rotation pivots from the bottom center,
                // which is crucial for the fanned-out playing card aesthetic.
                className="absolute w-48 h-80 top-1/2 left-1/2 origin-bottom"
                style={{
                    x: `calc(-50% + ${card.x}px)`,
                    y: `calc(-50% + ${card.y}px)`,
                    translateX: motionX,
                    translateY: motionY,
                }}
                initial={{ opacity: 0, rotate: card.rotate > 0 ? card.rotate + 10 : card.rotate - 10, scale: 0.9 }}
                animate={{ opacity: 1, rotate: card.rotate, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <img src={card.src} alt="Sample short video" className="w-full h-full object-cover rounded-2xl shadow-2xl" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  );
};

const BentoGridFeatures = () => {
  const features = [
    { title: "Hyper-Realistic Video", description: "From prompts to photorealism. Our AI doesn't just make videos, it creates worlds.", icon: <Film className="h-8 w-8 text-primary" />, className: "md:col-span-2", },
    { title: "Cloned Voice Synthesis", description: "Your voice, but AI-powered. Perfect delivery, every time.", icon: <Mic className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "Viral Trend Analysis", description: "AI predicts what's next, so you can create content that hits.", icon: <Zap className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "God Mode Controls", description: "Tweak every frame, every sound, every transition. Total creative freedom.", icon: <Bot className="h-8 w-8 text-primary" />, className: "md:col-span-1", },
    { title: "Brand Identity Lock", description: "Set your brand fonts, colors, and logo once. AI keeps everything consistent.", icon: <ShieldCheck className="h-8 w-8 text-primary" />, className: "md:col-span-2", },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <AnimatedInView variants={fadeIn} className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">This Isn't Your Average Video Tool</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">This is a full-blown content arsenal. We built the tools you've only dreamed of.</p>
      </AnimatedInView>
      <AnimatedInView variants={containerStagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <motion.div key={feature.title} variants={fadeIn} className={cn(feature.className)}>
            <Card className="h-full bg-white/70 backdrop-blur-sm border hover:border-primary/50 hover:-translate-y-1.5 transition-all duration-300 shadow-sm hover:shadow-xl z-10 relative glass_card">
              <CardHeader>{feature.icon}<CardTitle className="mt-4 text-slate-900">{feature.title}</CardTitle></CardHeader>
              <CardContent><p className="text-slate-600">{feature.description}</p></CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatedInView>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { icon: <Type className="h-8 w-8 text-primary" />, title: "1. Prompt It", description: "Feed the AI your wildest idea. Don't hold back.", rotate: -3, y: 0 },
    { icon: <Bot className="h-8 w-8 text-secondary" />, title: "2. Perfect It", description: "Tweak the voice, music, and visuals in God Mode.", rotate: 2, y: 20 },
    { icon: <Download className="h-8 w-8 text-primary" />, title: "3. Post It", description: "Download your masterpiece and watch the metrics explode.", rotate: -1, y: 5 },
  ];
  return (
    <section className="py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-20">
          <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">It's Dangerously Simple.</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Three steps between you and content that dominates the feed.</p>
        </AnimatedInView>
        <AnimatedInView variants={containerStagger} className="grid md:grid-cols-3 gap-12 md:gap-8 items-start">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeIn}
              style={{ y: step.y }}
              initial={{ rotate: step.rotate, opacity: 0, scale: 0.9 }}
              animate={{ rotate: step.rotate, opacity: 1, scale: 1 }}
              whileHover={{ rotate: 0, y: step.y - 10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="text-center"
            >
              <Card className="h-full bg-white shadow-xl">
                 <CardContent className="p-8">
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border flex items-center justify-center">
                        {step.icon}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">{step.title}</h3>
                    <p className="text-slate-600">{step.description}</p>
                 </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatedInView>
      </div>
    </section>
  );
};

const DraggableTestimonials = () => {
  const testimonials = [
    { name: "Casey Neistat", role: "YouTuber", avatar: "/placeholder.svg", content: "This is the creator economy on steroids. It's almost cheating.", rotate: -3 },
    { name: "Elon Musk", role: "Technoking", avatar: "/placeholder.svg", content: "The rate of improvement is faster than anything I've seen. Concerningly good.", rotate: 2 },
    { name: "Anna Wintour", role: "Editor-in-Chief", avatar: "/placeholder.svg", content: "It understands aesthetics on a fundamental level. Truly disruptive for fashion.", rotate: -1 },
    { name: "MrBeast", role: "Philanthropist", avatar: "/placeholder.svg", content: "My team uses this to test video ideas. We save hundreds of hours a week.", rotate: 4 },
  ];
  const containerRef = useRef(null);
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">We're Breaking The Internet.</h2>
          <p className="text-slate-600">Don't take our word for it. <span className="font-semibold text-primary">Drag to explore →</span></p>
        </AnimatedInView>
        <motion.div ref={containerRef} className="cursor-grab active:cursor-grabbing">
          <motion.div drag="x" dragConstraints={containerRef} className="flex gap-6 w-max py-4">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="w-[350px] md:w-[400px]"
                style={{ rotate: testimonial.rotate }}
                whileHover={{ rotate: 0, y: -10, scale: 1.03 }}
                transition={{ type: "spring", stiffness: 150 }}
              >
                <Card className="bg-white h-full shadow-2xl rounded-xl">
                  <CardContent className="p-6 flex flex-col h-full">
                    <p className="text-slate-700 text-lg mb-6 flex-grow">"{testimonial.content}"</p>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3"><AvatarImage src={testimonial.avatar} alt={testimonial.name} /><AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <div><p className="font-semibold text-slate-800">{testimonial.name}</p><p className="text-sm text-slate-500">{testimonial.role}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const Faq = () => {
  const faqs = [
    { question: "Is this legal? It feels too powerful.", answer: "Yes, it's legal. We work with ethicists to ensure our AI is used responsibly. But yes, it's extremely powerful." },
    { question: "Will this replace human creators?", answer: "No. It will give superhuman abilities to human creators. This is a tool for amplification, not replacement." },
    { question: "What's the catch with the free plan?", answer: "The free plan is limited and includes a watermark. It's a taste of the power. The real magic happens on the paid plans." },
    { question: "Can I make a full-length movie?", answer: "Not yet. We're focused on perfecting the short-form format. But the future is coming faster than you think." },
  ];
  const [expanded, setExpanded] = useState(0);
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">Your Questions, Answered.</h2>
        </AnimatedInView>
        <div>
          {faqs.map((faq, index) => (
             <div className="border-b py-6" key={index}>
              <button onClick={() => setExpanded(expanded === index ? false : index)} className="w-full flex justify-between items-center text-left">
                <h3 className="text-lg font-medium text-slate-800">{faq.question}</h3>
                <div className="text-primary">{expanded === index ? <Minus /> : <Plus />}</div>
              </button>
              <AnimatePresence>
                {expanded === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="pt-4 text-slate-600">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Cta = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedInView variants={fadeIn} className="relative rounded-2xl p-10 md:p-16 bg-gradient-to-r from-primary to-secondary text-primary-foreground overflow-hidden shadow-2xl shadow-primary/20">
          <div className="relative text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Stop Dreaming. Start Creating.</h2>
            <p className="text-xl text-primary-foreground/80 mb-8">The next era of content is here. Are you in?</p>
            <MagneticButton size="lg" className="bg-white text-primary hover:bg-slate-100 text-lg px-10 py-7" onClick={() => navigate('/signup')}>
              Claim Your Free Generations
            </MagneticButton>
          </div>
        </AnimatedInView>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-slate-400">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top section with columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-16">
        
        {/* Column 1: Brand and tagline */}
        <div className="md:col-span-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">Greaby</span>
          </div>
          <p className="mt-4 text-sm">
            The AI co-pilot for viral content. Turn your ideas into masterpieces, instantly.
          </p>
        </div>

        {/* Column 2: Product Links */}
        <div>
          <h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Product</h3>
          <ul className="mt-4 space-y-3">
            <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
            <li><a href="/login" className="hover:text-primary transition-colors">Login</a></li>
          </ul>
        </div>

        {/* Column 3: Company Links */}
        <div>
          <h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Company</h3>
          <ul className="mt-4 space-y-3">
            <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
          </ul>
        </div>

        {/* Column 4: Legal Links */}
        <div>
          <h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Legal</h3>
          <ul className="mt-4 space-y-3">
            <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom section with copyright and socials */}
      <div className="mt-8 py-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center">
        <p className="text-sm text-slate-500">
          © 2024 Greaby. The future is now. All rights reserved.
        </p>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <a href="#" className="text-slate-500 hover:text-primary transition-colors">
            <Twitter className="h-5 w-5" />
          </a>
          <a href="#" className="text-slate-500 hover:text-primary transition-colors">
            <Youtube className="h-5 w-5" />
          </a>
          <a href="#" className="text-slate-500 hover:text-primary transition-colors">
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

const Index = () => {
  return (
    <div className="bg-background text-foreground relative">
      <InteractiveCursor />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <BentoGridFeatures />
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