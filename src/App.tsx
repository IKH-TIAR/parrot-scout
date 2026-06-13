import React, { useState, useMemo } from 'react';
import {
  Phone,
  Bot,
  ClipboardList,
  CalendarCheck,
  PhoneMissed,
  Moon,
  Headset,
  HelpCircle,
  CheckCircle2,
  Play,
  ArrowRight,
  Menu,
  X,
  Volume2
} from 'lucide-react';
import { getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'get-demo' | 'live-call'>('live-call');

  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [demoStatus, setDemoStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');

  const [leadForm, setLeadForm] = useState({ name: '', businessName: '', phone: '', email: '' });
  const [leadStatus, setLeadStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const countriesList = useMemo(() => {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return getCountries().map(country => {
      let name = country;
      try { name = regionNames.of(country) || country; } catch (e) { }
      return {
        iso: country,
        callingCode: `+${getCountryCallingCode(country)}`,
        name: name
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const validatePhone = (phone: string, iso: CountryCode) => {
    if (!phone) return 'Phone number is required.';
    try {
      if (!isValidPhoneNumber(phone, iso)) {
        return `Please enter a valid phone number for ${iso}.`;
      }
      return '';
    } catch (e) {
      return 'Invalid phone number format.';
    }
  };

  const handleCallDemo = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const error = validatePhone(phoneNumber, countryCode);
    if (error) {
      setPhoneError(error);
      return;
    }
    setPhoneError('');
    setDemoStatus('calling');
    try {
      const parsed = parsePhoneNumber(phoneNumber, countryCode);
      const fullNumber = parsed.number; // E.164 format e.g. +12015550123
      const res = await fetch('https://parrotscoutai.app.n8n.cloud/webhook/instant-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullNumber })
      });
      if (res.ok) {
        setDemoStatus('success');
        setPhoneNumber('');
      } else {
        setDemoStatus('error');
      }
    } catch (err) {
      setDemoStatus('error');
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus('submitting');
    try {
      const res = await fetch('https://parrotscoutai.app.n8n.cloud/webhook/lead-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm)
      });
      if (res.ok) {
        setLeadStatus('success');
        setLeadForm({ name: '', businessName: '', phone: '', email: '' });
      } else {
        setLeadStatus('error');
      }
    } catch (err) {
      setLeadStatus('error');
    }
  };

  const handleDemoNavigation = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, tab: 'get-demo' | 'live-call') => {
    e.preventDefault();
    setActiveDemoTab(tab);
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                P
              </div>
              <div>
                <span className="font-bold text-2xl tracking-tight">ParrotScout</span>
                <span className="block text-[10px] text-slate-500 font-medium tracking-wider uppercase -mt-1">
                  AI Receptionist for HVAC & Plumbing
                </span>
              </div>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600">
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
              <a href="#who-its-for" className="hover:text-slate-900 transition-colors">Who It's For</a>
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#faqs" className="hover:text-slate-900 transition-colors">FAQs</a>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <a href="#demo" onClick={(e) => handleDemoNavigation(e, 'get-demo')} className="bg-[#0B1E36] hover:bg-slate-800 text-white px-6 py-2.5 rounded-md font-semibold flex items-center gap-2 transition-colors">
                <Phone className="w-4 h-4" />
                Call the Demo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 px-4 py-4 space-y-4">
            <a href="#how-it-works" className="block font-medium text-slate-600">How It Works</a>
            <a href="#who-its-for" className="block font-medium text-slate-600">Who It's For</a>
            <a href="#features" className="block font-medium text-slate-600">Features</a>
            <a href="#pricing" className="block font-medium text-slate-600">Pricing</a>
            <a href="#faqs" className="block font-medium text-slate-600">FAQs</a>
            <a href="#demo" onClick={(e) => handleDemoNavigation(e, 'get-demo')} className="w-full bg-[#0B1E36] text-white px-6 py-3 rounded-md font-semibold flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              Call the Demo
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative bg-white flex flex-col lg:block min-h-[600px] overflow-hidden">

        {/* Text Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-16 pb-12 lg:pt-32 lg:pb-40">
          <div className="w-full lg:w-[45%] lg:pr-8">
            <div className="max-w-2xl">
              <div className="inline-block bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-6">
                Never Miss Another Call
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold text-[#0B1E36] leading-[1.1] mb-6 tracking-tight">
                Stop Missing Calls.<br />
                <span className="text-[#00A651]">Book More Jobs</span><br />
                Automatically.
              </h1>
              <p className="text-lg text-slate-700 font-medium mb-10 leading-relaxed max-w-xl">
                ParrotScout answers your HVAC and plumbing calls, captures job details, and helps you respond faster — even after hours.
              </p>

              <div className="flex flex-col xl:flex-row gap-4 items-start">
                <a href="#demo" onClick={(e) => handleDemoNavigation(e, 'get-demo')} className="bg-[#0B3B60] hover:bg-[#092a45] text-white px-6 py-2 rounded-xl font-semibold flex flex-col items-center justify-center transition-colors w-full xl:w-auto h-[72px] flex-shrink-0 shadow-lg">
                  <span className="flex items-center gap-2 text-lg">
                    <Phone className="w-5 h-5 fill-current" />
                    Call the Demo
                  </span>
                  <span className="text-[11px] text-blue-200 font-normal mt-0.5">Hear ParrotScout in action now</span>
                </a>

                <div className="w-full xl:w-auto flex-1 max-w-md">
                  <div className="w-full">
                    <div className="flex rounded-xl shadow-sm border-2 border-slate-200 bg-white p-1.5 h-[72px] focus-within:border-[#2E9E4A] focus-within:ring-1 focus-within:ring-[#2E9E4A]">
                      <select
                        value={countryCode}
                        onChange={(e) => { setCountryCode(e.target.value as CountryCode); setPhoneError(''); setDemoStatus('idle'); }}
                        className="bg-transparent text-sm sm:text-base pl-2 pr-1 outline-none appearance-none cursor-pointer max-w-[120px]"
                      >
                        {countriesList.map(c => <option key={c.iso} value={c.iso} title={c.name}>{c.iso} ({c.callingCode})</option>)}
                      </select>
                      <span className="text-slate-400 mr-1 text-xs pointer-events-none self-center">▼</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); setDemoStatus('idle'); }}
                        autoComplete="off"
                        placeholder="Enter phone number"
                        className="flex-1 px-2 sm:px-3 py-2 outline-none text-slate-700 bg-transparent text-sm sm:text-base w-full min-w-0"
                      />
                      <button onClick={handleCallDemo} disabled={demoStatus === 'calling'} className="bg-[#00A651] hover:bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors whitespace-nowrap h-full shadow-md disabled:opacity-70">
                        <Phone className="w-4 h-4 fill-current hidden sm:block" />
                        {demoStatus === 'calling' ? 'Calling...' : 'Call Me Now'}
                      </button>
                    </div>
                    {phoneError && <p className="text-xs text-red-500 mt-1.5 ml-2 font-medium text-left">{phoneError}</p>}
                    {demoStatus === 'success' && <p className="text-xs text-green-600 mt-1.5 ml-2 font-medium text-left">Calling you now! Please check your phone.</p>}
                    {demoStatus === 'error' && <p className="text-xs text-red-500 mt-1.5 ml-2 font-medium text-left">Failed to initiate call. Please try again.</p>}
                    <p className="text-[11px] text-slate-500 mt-2 text-center xl:text-center">
                      Takes 10 seconds. No spam. Just a real example.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="w-full lg:absolute lg:inset-y-0 lg:right-0 lg:w-[55%] relative min-h-[400px] lg:min-h-0 z-0 overflow-hidden">
          <img
            src="/assets/hero-bg.png"
            alt="HVAC Technician"
            className="absolute inset-0 w-full h-full object-cover object-left-top scale-110 origin-top-left"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop";
            }}
          />
          {/* Gradient blend on the left edge of the image (Desktop) */}
          <div className="hidden lg:block absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
          {/* Gradient blend on the top edge of the image (Mobile) */}
          <div className="block lg:hidden absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white via-white/80 to-transparent"></div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1E36] mb-4">How It Works</h2>
            <p className="text-lg text-slate-600">Simple, fast, and seamless — your AI receptionist is always on duty.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Lines (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-200 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border-4 border-slate-50">
                <Phone className="w-10 h-10 text-green-600" />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 w-full h-full">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm font-bold mb-3">1</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Customer Calls</h3>
                <p className="text-sm text-slate-600">They call your business anytime — day or night.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border-4 border-slate-50">
                <Bot className="w-10 h-10 text-[#0B1E36]" />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 w-full h-full">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm font-bold mb-3">2</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">ParrotScout Answers</h3>
                <p className="text-sm text-slate-600">Professionally greets them, just like a real receptionist.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border-4 border-slate-50">
                <ClipboardList className="w-10 h-10 text-[#0B1E36]" />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 w-full h-full">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm font-bold mb-3">3</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Job Details Captured</h3>
                <p className="text-sm text-slate-600">Collects caller info, service needed, and urgency.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border-4 border-slate-50">
                <CalendarCheck className="w-10 h-10 text-green-600" />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 w-full h-full">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-sm font-bold mb-3">4</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">You Follow Up / Book Job</h3>
                <p className="text-sm text-slate-600">You get an instant notification and follow up faster.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="who-its-for" className="py-20 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1E36] mb-4">Who It's For</h2>
            <p className="text-lg text-slate-600">Built for HVAC and plumbing professionals who want to grow without missing opportunities.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "HVAC Companies",
                desc: "Never miss heating or cooling service calls again.",
                img: "/assets/hvac-companies.png",
                fallback: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=800&auto=format&fit=crop"
              },
              {
                title: "Plumbing Companies",
                desc: "Capture every leak, clog, and emergency call — 24/7.",
                img: "/assets/plumbing-companies.png",
                fallback: "https://images.unsplash.com/photo-1607472586893-edb57cb31322?q=80&w=800&auto=format&fit=crop"
              },
              {
                title: "Small Service Teams",
                desc: "Give your team a professional receptionist without the overhead.",
                img: "/assets/small-service-teams.png",
                fallback: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=800&auto=format&fit=crop"
              },
              {
                title: "Owner-Operators",
                desc: "Look bigger, work smarter, and never miss another job.",
                img: "/assets/owner-operators.png",
                fallback: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop"
              }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md border border-slate-100 flex flex-col">
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // If the local .png fails, try .jpg, if that fails, use the Unsplash fallback
                      if (e.currentTarget.src.endsWith('.png')) {
                        e.currentTarget.src = item.img.replace('.png', '.jpg');
                      } else {
                        e.currentTarget.src = item.fallback;
                      }
                    }}
                  />
                </div>
                <div className="p-6 text-center flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* We Fix These Problems Section */}
      <section id="features" className="py-20 bg-[#14233A]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">We Fix These Problems</h2>
            <p className="text-lg text-slate-300">Every missed call is money left on the table.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <PhoneMissed className="w-10 h-10 text-red-500" />,
                title: "Missed Calls",
                desc: "Lost jobs. Lost revenue."
              },
              {
                icon: <Moon className="w-10 h-10 text-blue-400" />,
                title: "After-Hours Calls Ignored",
                desc: "Customers call when you're closed — we never are."
              },
              {
                icon: <Headset className="w-10 h-10 text-cyan-400" />,
                title: "Too Busy to Answer",
                desc: "You're on a job and can't get to the phone."
              },
              {
                icon: <HelpCircle className="w-10 h-10 text-yellow-400" />,
                title: "Forgetting Customer Details",
                desc: "We capture every detail so you don't have to."
              }
            ].map((item, i) => (
              <div key={i} className="bg-[#1C2E4A] border border-[#2A4065] rounded-xl p-8 flex flex-col items-center text-center">
                <div className="mb-6">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-300 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See How Your Calls Are Handled Section */}
      <section id="demo" className="py-24 bg-[#F8FAFC] overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[4fr_6fr] gap-12 lg:gap-20 items-center">
            <div className="lg:pr-4">
              <h2 className="text-4xl lg:text-[42px] font-extrabold text-[#0B1E36] mb-6 leading-[1.15] tracking-tight">
                See How Your Calls<br />Are Handled
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Enter your number and experience a real call from ParrotScout. Hear how we handle HVAC and plumbing inquiries, just like we would for your business.
              </p>

              <div className="relative inline-block w-full">
                <ul className="space-y-4 mb-4">
                  {[
                    "HVAC & Plumbing Specific Script",
                    "Real-Time Call to Your Phone",
                    "No Obligation — Try It Now"
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold">
                      <CheckCircle2 className="w-6 h-6 text-[#2E9E4A] flex-shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>

                <div className="absolute right-0 bottom-0 translate-x-12 translate-y-4 flex items-center gap-2 text-[#2B5C8F] font-bold italic text-lg">
                  <span className="text-center leading-tight">Takes Less<br />Than 10 Seconds!</span>
                  <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#2B5C8F] mt-2">
                    <path d="M2 18C10 10 25 5 38 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M32 4L38 10L30 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 sm:p-8 w-full min-h-[480px]">
              {/* Tabs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                  onClick={() => setActiveDemoTab('get-demo')}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeDemoTab === 'get-demo'
                    ? 'bg-white shadow-sm border border-slate-200 text-slate-900'
                    : 'border border-blue-100 bg-[#F4F8FB] text-[#2B5C8F] hover:bg-blue-50'
                    }`}
                >
                  <ClipboardList className="w-5 h-5" />
                  Get Demo
                </button>
                <button
                  onClick={() => setActiveDemoTab('live-call')}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeDemoTab === 'live-call'
                    ? 'bg-white shadow-sm border border-slate-200 text-slate-900'
                    : 'border border-blue-100 bg-[#F4F8FB] text-[#2B5C8F] hover:bg-blue-50'
                    }`}
                >
                  <Phone className="w-4 h-4 fill-current" />
                  Get a Live Demo Call
                </button>
              </div>

              {activeDemoTab === 'live-call' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Input Form */}
                  <div className="flex flex-col mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-1">
                      <div className="flex-1 flex items-center border border-slate-300 rounded-lg px-2 bg-white focus-within:border-[#2E9E4A] focus-within:ring-1 focus-within:ring-[#2E9E4A] h-[52px]">
                        <select
                          value={countryCode}
                          onChange={(e) => { setCountryCode(e.target.value as CountryCode); setPhoneError(''); setDemoStatus('idle'); }}
                          className="bg-transparent text-base pl-2 pr-1 outline-none appearance-none cursor-pointer max-w-[120px]"
                        >
                          {countriesList.map(c => <option key={c.iso} value={c.iso} title={c.name}>{c.iso} ({c.callingCode})</option>)}
                        </select>
                        <span className="text-slate-400 mr-2 text-xs pointer-events-none">▼</span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); setDemoStatus('idle'); }}
                          autoComplete="off"
                          placeholder="(575) 383-9095"
                          className="w-full h-full outline-none text-slate-700 text-base bg-transparent pl-1"
                        />
                      </div>
                      <button onClick={handleCallDemo} disabled={demoStatus === 'calling'} className="bg-[#2E9E4A] hover:bg-green-700 text-white px-8 h-[52px] rounded-lg font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm disabled:opacity-70">
                        <Phone className="w-4 h-4 fill-current" />
                        {demoStatus === 'calling' ? 'Calling...' : 'Call Me Now'}
                      </button>
                    </div>
                    {phoneError && <p className="text-xs text-red-500 ml-1 font-medium">{phoneError}</p>}
                    {demoStatus === 'success' && <p className="text-xs text-green-600 ml-1 font-medium">Calling you now! Please check your phone.</p>}
                    {demoStatus === 'error' && <p className="text-xs text-red-500 ml-1 font-medium">Failed to initiate call. Please try again.</p>}
                    <p className="text-[13px] text-slate-500 text-center mt-3">
                      We'll call you instantly and let you hear how ParrotScout handles a real HVAC/plumbing call.
                    </p>
                  </div>

                  {/* Transcript Area */}
                  <div className="bg-[#F0F7FF] rounded-xl p-6 border border-blue-100 relative flex flex-col sm:flex-row gap-6 items-center sm:items-end justify-between">
                    <div className="flex-1 w-full">
                      <h4 className="font-bold text-[#0B1E36] mb-4 text-[15px]">What You'll Hear:</h4>
                      <div className="space-y-2.5 text-[13px]">
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">ParrotScout:</span>
                          <span className="text-slate-600">"Thanks for calling! Is this for HVAC or plumbing service?"</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">Caller:</span>
                          <span className="text-slate-600">"Plumbing — I think I have a leak."</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">ParrotScout:</span>
                          <span className="text-slate-600">"No problem. Is this an emergency or something that can wait?"</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">Caller:</span>
                          <span className="text-slate-600">"It's an emergency."</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">ParrotScout:</span>
                          <span className="text-slate-600">"Got it. Can I get your name, address, and best callback number?"</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-700 w-20 flex-shrink-0">ParrotScout:</span>
                          <span className="text-slate-600">"Perfect. A technician will contact you shortly. Stay safe!"</span>
                        </div>
                      </div>
                    </div>

                    {/* Audio visualizer and play button */}
                    <div className="flex items-center gap-4 sm:pb-2">
                      <div className="flex items-center gap-1 h-8">
                        {[40, 70, 40, 100, 60, 80, 30, 90, 50, 70].map((h, i) => (
                          <div key={i} className="w-1 bg-[#2E9E4A] rounded-full" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                      <button className="w-12 h-12 bg-[#2E9E4A] rounded-full flex items-center justify-center text-white hover:bg-green-700 transition-colors flex-shrink-0 shadow-md">
                        <Play className="w-5 h-5 ml-1 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'get-demo' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={handleLeadSubmit} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input required type="text" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} placeholder="John Doe" className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-[#2E9E4A] focus:ring-1 focus:ring-[#2E9E4A] text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                        <input type="text" value={leadForm.businessName} onChange={e => setLeadForm({ ...leadForm, businessName: e.target.value })} placeholder="Acme HVAC" className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-[#2E9E4A] focus:ring-1 focus:ring-[#2E9E4A] text-slate-700" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input required type="tel" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="(555) 123-4567" className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-[#2E9E4A] focus:ring-1 focus:ring-[#2E9E4A] text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input required type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="john@example.com" className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-[#2E9E4A] focus:ring-1 focus:ring-[#2E9E4A] text-slate-700" />
                      </div>
                    </div>
                    <button type="submit" disabled={leadStatus === 'submitting'} className="w-full bg-[#2E9E4A] hover:bg-green-700 text-white px-8 py-3.5 rounded-lg font-bold text-[15px] transition-colors shadow-sm mt-2 disabled:opacity-70">
                      {leadStatus === 'submitting' ? 'Submitting...' : 'Submit Request'}
                    </button>
                    {leadStatus === 'success' && <p className="text-sm text-green-600 text-center font-medium mt-2">Request submitted successfully!</p>}
                    {leadStatus === 'error' && <p className="text-sm text-red-500 text-center font-medium mt-2">Failed to submit request. Please try again.</p>}
                  </form>

                  <div className="relative flex items-center py-2 mb-6">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase tracking-wider">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="bg-[#F0F7FF] rounded-xl p-6 border border-blue-100 text-center">
                    <h4 className="font-bold text-[#0B1E36] mb-2 text-[15px]">Call our AI Receptionist right now</h4>
                    <p className="text-slate-600 text-sm mb-4">Experience it yourself. Our AI will answer immediately.</p>
                    <a href="tel:+15753839095" className="inline-flex items-center justify-center gap-2 text-2xl font-extrabold text-[#2E9E4A] hover:text-green-700 transition-colors">
                      <Phone className="w-6 h-6 fill-current" />
                      (575) 383-9095
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pt-24 pb-16 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-[32px] font-extrabold text-[#0B1E36] mb-3">Simple, Transparent Pricing</h2>
            <p className="text-[15px] text-slate-500">Pick the plan that matches your call volume and growth goals.</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Starter */}
              <article className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#2E9E4A] mb-4">Starter</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-extrabold text-[#0B1E36] leading-none">$99</span>
                  <span className="text-slate-500 text-sm font-semibold">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Missed call text-back",
                    "After-hours response",
                    "Basic booking link"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-600 text-[14px] font-medium">
                      <CheckCircle2 className="w-[18px] h-[18px] text-[#2E9E4A] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="w-full border border-slate-300 hover:border-slate-400 text-slate-800 px-5 py-3 rounded-md font-bold text-sm transition-colors">
                  Choose Starter
                </button>
              </article>

              {/* Growth */}
              <article className="bg-[#0B1E36] border border-[#0B1E36] rounded-2xl p-8 shadow-xl relative lg:-translate-y-3">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFC928] text-[#1A1A1A] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
                <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#9CD2FF] mb-4 mt-2">Growth</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-6xl font-extrabold text-white leading-none">$199</span>
                  <span className="text-blue-100 text-sm font-semibold">/month</span>
                </div>
                <p className="text-blue-100 text-[13px] mb-6">Everything in Starter, plus:</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Smart follow-ups",
                    "Lead capture",
                    "Booking assistance"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-blue-50 text-[14px] font-medium">
                      <CheckCircle2 className="w-[18px] h-[18px] text-[#5EDB91] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="w-full bg-[#2E9E4A] hover:bg-green-700 text-white px-5 py-3 rounded-md font-bold text-sm transition-colors shadow-sm">
                  Choose Growth
                </button>
              </article>

              {/* Pro */}
              <article className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#2B5C8F] mb-4">Pro</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-[#0B1E36] leading-none">$399</span>
                  <span className="text-slate-500 text-sm font-semibold">/month</span>
                </div>
                <p className="text-slate-500 text-[13px] mb-6">Everything in Growth, plus:</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Advanced call handling",
                    "CRM / Google Sheets integration",
                    "Monthly reporting"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-600 text-[14px] font-medium">
                      <CheckCircle2 className="w-[18px] h-[18px] text-[#2E9E4A] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="w-full border border-slate-300 hover:border-slate-400 text-slate-800 px-5 py-3 rounded-md font-bold text-sm transition-colors">
                  Choose Pro
                </button>
              </article>
            </div>

            <div className="mt-8 text-center">
              <p className="inline-flex items-center gap-2 bg-[#FFF8E1] border border-[#FFE299] text-[#5A4A1F] px-4 py-2 rounded-md text-sm font-semibold">
                One-time setup fee: $99-$99
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="bg-[#2E9E4A] hover:bg-green-700 text-white px-12 py-3 rounded-md font-bold text-[15px] transition-colors shadow-sm whitespace-nowrap">
                Get Started Today
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1E36] mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600">Everything you need to know before getting started.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "How does it handle after-hours or emergency calls?",
                a: "ParrotScout never sleeps. It answers every call instantly, 24/7 — including nights, weekends, and holidays. Emergency callers are greeted professionally and their details are captured and sent to you immediately, so you can follow up as soon as you're available."
              },
              {
                q: "Does it sound like a real person?",
                a: "Yes. ParrotScout uses a natural-sounding AI voice that speaks in short, conversational sentences. Most callers don't realize they're talking to an AI — they just know they got a fast, professional response."
              },
              {
                q: "How do I receive the job details?",
                a: "As soon as a call ends, you receive an instant email notification with the caller's name, service address, callback number, and a full call summary — plus the complete call transcript. All data is also automatically logged to your Google Sheet."
              },
              {
                q: "Can it handle multiple calls at once?",
                a: "Absolutely. Unlike a human receptionist, ParrotScout handles unlimited simultaneous calls. Whether you get 1 call or 100 calls at the same time, every single one gets answered immediately."
              }
            ].map((item, i) => (
              <details key={i} className="group bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-[#0B1E36] text-[15px] hover:bg-slate-50 transition-colors">
                  {item.q}
                  <span className="text-[#2E9E4A] text-xl font-bold flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-5 pt-1 text-slate-600 text-[14px] leading-relaxed border-t border-slate-100">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-14 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0B1E36] mb-3">Get in Touch</h2>
            <p className="text-slate-600 mb-8">Ready to get started or have a question? Reach out to us directly.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <a href="mailto:ParrotScoutai@gmail.com" className="flex items-center gap-3 bg-[#F8FAFC] border border-slate-200 rounded-xl px-5 py-4 hover:border-[#2E9E4A] hover:bg-[#F0FAF4] transition-colors group">
                <div className="w-9 h-9 bg-[#E8F5E9] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#2E9E4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">General</p>
                  <p className="text-sm font-semibold text-[#0B1E36] group-hover:text-[#2E9E4A] transition-colors">ParrotScoutai@gmail.com</p>
                </div>
              </a>
              <a href="mailto:Info@parrotscoutai.com" className="flex items-center gap-3 bg-[#F8FAFC] border border-slate-200 rounded-xl px-5 py-4 hover:border-[#2E9E4A] hover:bg-[#F0FAF4] transition-colors group">
                <div className="w-9 h-9 bg-[#E8F5E9] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#2E9E4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Info</p>
                  <p className="text-sm font-semibold text-[#0B1E36] group-hover:text-[#2E9E4A] transition-colors">Info@parrotscoutai.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-gradient-to-r from-[#003B9E] to-[#008A3E] rounded-tl-[80px] pt-12 pb-12 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:pl-12">
            <div className="text-center lg:text-left">
              <h2 className="text-[32px] font-bold text-white mb-2">Stop Missing Jobs Starting Today</h2>
              <p className="text-blue-100 text-[15px] max-w-2xl">
                Join HVAC and plumbing pros who trust ParrotScout to keep their phones answered and their schedules full.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <a href="#demo" onClick={(e) => handleDemoNavigation(e, 'get-demo')} className="bg-[#2E9E4A] hover:bg-green-700 text-white px-8 py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition-colors">
                <Phone className="w-4 h-4 fill-current" />
                Call the Demo
              </a>
              <button onClick={() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="bg-transparent hover:bg-white/10 border-2 border-white text-white px-8 py-3 rounded-md font-semibold transition-colors text-center">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#081526] py-6 border-t border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <span className="font-bold text-xl text-white tracking-tight">ParrotScout</span>
            </a>

            <div className="flex flex-wrap justify-center gap-8 text-[13px] text-slate-400 font-medium">
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#who-its-for" className="hover:text-white transition-colors">Who It's For</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>

            <div className="text-[13px] text-slate-500">
              © 2025 ParrotScout AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
