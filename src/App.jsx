// --- CRITICAL FIX: THIS MUST BE THE FIRST LINE ---
window.global = window; 

import React, { useState, useEffect, useRef } from 'react';
import logoImg from './assets/logo.png'; 
import { Upload, AlertTriangle, Loader2, Download, Scale, Sparkles, User, LogOut, X, Wallet, Coins, ShieldCheck, PenTool, BrainCircuit, Globe, Zap, Heart, CheckCircle2, Building2, Lock, ChevronRight, Receipt, Printer, History, ArrowUpRight, ChevronDown, Check, BookOpen, Star, MessageSquare, ArrowUp, Mail, Phone as PhoneIcon } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DYNAMIC GLOBAL CONFIGURATION (Currency & Pricing) ---
const REGIONAL_CONFIG = {
    "India": { 
        code: "in", currency: "INR", symbol: "₹", cost: 15, bonus: 100, 
        payLink: "https://razorpay.me/@YOUR_INDIAN_LINK" 
    },
    "United States": { 
        code: "us", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "United Kingdom": { 
        code: "gb", currency: "GBP", symbol: "£", cost: 2.50, bonus: 40, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Canada": { 
        code: "ca", currency: "CAD", symbol: "C$", cost: 4.50, bonus: 70, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Australia": { 
        code: "au", currency: "AUD", symbol: "A$", cost: 5.00, bonus: 75, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Germany": { 
        code: "de", currency: "EUR", symbol: "€", cost: 3.00, bonus: 45, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "United Arab Emirates": { 
        code: "ae", currency: "AED", symbol: "AED", cost: 12.00, bonus: 180, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    // Fallback for rest of world
    "Global": { 
        code: "gl", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    }
};

const THEME = {
    primary: "from-slate-900 to-slate-800",
    accent: "from-blue-600 to-indigo-600",
};

const docTypes = ["Non-Disclosure Agreement (NDA)", "Employment Contract", "Freelance Service Agreement", "Rental/Lease Agreement", "SaaS / Software License", "Privacy Policy & TOS", "Last Will and Testament", "Partnership Deed", "Custom Legal Request"];

// --- CUSTOM COMPONENT: LUXURY DROPDOWN ---
const CustomDropdown = ({ options, value, onChange, type = "text" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            >
                <div className="flex items-center gap-3">
                    {type === "country" && REGIONAL_CONFIG[value] && (
                        <img src={`https://flagcdn.com/w40/${REGIONAL_CONFIG[value].code}.png`} className="w-6 h-4 rounded shadow-sm object-cover" alt="flag"/>
                    )}
                    <span className="font-bold text-slate-800">{value}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {options.map((opt, idx) => {
                        const isSelected = opt === value;
                        return (
                            <div 
                                key={idx} 
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                            >
                                {type === "country" && REGIONAL_CONFIG[opt] && <img src={`https://flagcdn.com/w40/${REGIONAL_CONFIG[opt].code}.png`} className="w-5 h-3.5 rounded shadow-sm" alt="flag"/>}
                                <span className={`flex-1 text-sm ${isSelected ? "font-bold text-blue-600" : "font-medium text-slate-700"}`}>{opt}</span>
                                {isSelected && <Check className="w-4 h-4 text-blue-600"/>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // LOCATION & BILLING STATE
  const [userLocation, setUserLocation] = useState("Global"); // Controls Pricing/Currency
  const [jurisdiction, setJurisdiction] = useState("United States"); // Controls AI Law Context
  const [walletBalance, setWalletBalance] = useState(0);

  // Views & Modals
  const [showStory, setShowStory] = useState(false); 
  const [showContact, setShowContact] = useState(false); 
  
  // Auth
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });

  // Data
  const [documentHistory, setDocumentHistory] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [risks, setRisks] = useState(null);
  const [docType, setDocType] = useState("Non-Disclosure Agreement (NDA)"); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  // Payment UI
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [billingInfo, setBillingInfo] = useState({ address: "", city: "", state: "", zip: "" });

  // --- HELPER: GET CURRENT CONFIG ---
  const getConfig = () => REGIONAL_CONFIG[userLocation] || REGIONAL_CONFIG["Global"];

  // --- INITIALIZATION ---
  useEffect(() => {
    const setWorker = async () => {
        try { if (pdfWorker) pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker; } 
        catch (e) { pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`; }
    };
    setWorker();

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
        setUser(currentUser);
        loadHistory();
        const savedBalance = localStorage.getItem(`wallet_${currentUser.email}`);
        setWalletBalance(savedBalance ? parseFloat(savedBalance) : 0);
        
        const savedTxns = localStorage.getItem(`txns_${currentUser.email}`);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
    }

    detectUserLocation();

    const handleScroll = () => { setShowScrollTop(window.scrollY > 300); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const detectUserLocation = async () => {
      try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data && data.country_name) {
              // 1. Set Billing Location
              const detectedName = Object.keys(REGIONAL_CONFIG).includes(data.country_name) ? data.country_name : "Global";
              setUserLocation(detectedName);
              
              // 2. Set Default Jurisdiction (can be changed by user)
              setJurisdiction(data.country_name);
          }
      } catch (e) { console.warn("Location detection failed"); }
  };

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goHome = () => { scrollToTop(); setShowStory(false); setActiveTab("analyze"); };
  const handleContactSubmit = (e) => { e.preventDefault(); alert("Message sent."); setContactForm({name:"",email:"",phone:"",message:""}); setShowContact(false); };

  // --- WALLET & PAYMENT LOGIC ---
  const processPaymentCheck = () => {
      const config = getConfig();
      if (walletBalance >= config.cost) {
          const newBalance = walletBalance - config.cost;
          setWalletBalance(parseFloat(newBalance.toFixed(2)));
          localStorage.setItem(`wallet_${user.email}`, newBalance);
          return true;
      } else {
          setShowWalletModal(true); 
          return false;
      }
  };

  const handlePaymentVerify = () => {
      if (!transactionId) { alert("Please enter Transaction ID"); return; }
      const config = getConfig();
      
      // Recharge Amount (e.g., 100 INR or 50 USD)
      const rechargeAmount = config.currency === "INR" ? 100 : 50; 
      
      const newBalance = walletBalance + rechargeAmount;
      setWalletBalance(parseFloat(newBalance.toFixed(2)));
      if(user) localStorage.setItem(`wallet_${user.email}`, newBalance);
      
      alert(`${config.symbol}${rechargeAmount} Added to Wallet!`);

      const newTxn = {
          id: Math.floor(Math.random() * 10000000000).toString(),
          date: new Date().toLocaleDateString('en-GB'),
          amount: rechargeAmount,
          currency: config.currency,
          symbol: config.symbol,
          description: "Wallet Recharge",
          txnId: transactionId,
          billing: { ...billingInfo }
      };

      const updatedTxns = [newTxn, ...transactions];
      setTransactions(updatedTxns);
      if(user) localStorage.setItem(`txns_${user.email}`, JSON.stringify(updatedTxns));
      
      setShowWalletModal(false);
      setTransactionId("");
  };

  // --- AUTH HANDLERS ---
  const openAuth = (view) => { setAuthView(view); setShowAuthModal(true); setAuthError(""); setAuthForm({email:"",password:"",name:"",phone:""}); setOtpInput(""); };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const config = getConfig();

    if (authView === "signup") {
      const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(fakeOtp);
      alert(`[SIMULATION] Verification Code: ${fakeOtp}`);
      setAuthView("otp"); 
    } else if (authView === "otp") {
      if (otpInput === generatedOtp) {
        const result = authService.signup(authForm.email, authForm.password, authForm.name, authForm.phone);
        if (result.success && result.user) {
          setUser(result.user);
          // DYNAMIC SIGNUP BONUS
          setWalletBalance(config.bonus);
          localStorage.setItem(`wallet_${result.user.email}`, config.bonus);
          setShowAuthModal(false);
        } else { setAuthError(result.error || "Signup Failed"); }
      } else { setAuthError("Invalid OTP"); }
    } else if (authView === "login") {
        const result = authService.login(authForm.email, authForm.password);
        if (result.success) {
            setUser(result.user);
            const saved = localStorage.getItem(`wallet_${result.user.email}`);
            setWalletBalance(saved ? parseFloat(saved) : 0);
            const savedTxns = localStorage.getItem(`txns_${result.user.email}`);
            setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
            setShowAuthModal(false);
            loadHistory();
        } else { setAuthError(result.error); }
    }
  };

  const handleLogout = () => { authService.logout(); setUser(null); setWalletBalance(0); setDocumentHistory([]); setTransactions([]); };
  const loadHistory = () => { setDocumentHistory(historyService.getDocuments()); };

  // --- AI HANDLERS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) { openAuth("signup"); e.target.value = null; return; }
    if (!processPaymentCheck()) { e.target.value = null; return; }

    setLoading(true);
    setRisks(null);

    try {
        let extractedText = "";
        if (file.type.includes("pdf")) {
            const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
            for (let i = 1; i <= pdf.numPages; i++) extractedText += (await (await pdf.getPage(i)).getTextContent()).items.map(s => s.str).join(" ");
        } else if (file.type.includes("word")) {
            extractedText = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
        } else { extractedText = "Image Scan"; }
        
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        // USE JURISDICTION STATE FOR PROMPT
        const prompt = `Unilex AI Legal Expert for ${jurisdiction}. Strict Analysis. Output JSON: [{title, risk, advice}]. Text: ${extractedText.substring(0, 5000)}`;
        
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
        setRisks(JSON.parse(jsonText));
        historyService.saveDocument({ type: "analysis", fileName: file.name, country: jurisdiction, createdAt: new Date().toISOString() });
        loadHistory();
    } catch (err) { 
        alert("Scan Failed. Credits Refunded."); 
        const config = getConfig();
        const refund = walletBalance + config.cost;
        setWalletBalance(parseFloat(refund.toFixed(2)));
        localStorage.setItem(`wallet_${user.email}`, refund);
    } 
    finally { setLoading(false); e.target.value = null; }
  };

  const handleCreateDoc = async () => {
      if (!user) { openAuth("signup"); return; }
      if (!processPaymentCheck()) return;
      setLoading(true);
      try {
          const genAI = new GoogleGenerativeAI(API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
          const prompt = `Unilex AI Drafting Engine. Create professional ${docType} for ${jurisdiction}. Scenario: ${userScenario}. Use Markdown.`;
          const result = await model.generateContent(prompt);
          setGeneratedDoc(result.response.text());
          historyService.saveDocument({ type: "generated", docType, country: jurisdiction, createdAt: new Date().toISOString() });
          loadHistory();
      } catch (e) { alert("Error generating."); } 
      finally { setLoading(false); }
  };

  const downloadDocx = (text, name) => {
      const doc = new Document({ sections: [{ children: text.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
      Packer.toBlob(doc).then(b => saveAs(b, name));
  };

  // --- RENDER ---
  const config = getConfig(); // Get current currency/price settings

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F0F4F8] selection:bg-blue-100 pb-24 relative">
      
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-4 md:px-8 py-4 flex justify-between items-center transition-all">
        <div onClick={goHome} className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity">
            <div className={`w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br ${THEME.primary} flex items-center justify-center text-white shadow-lg`}>
                {!imgError ? (
                   <img src={logoImg} alt="Unilex AI" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform" onError={() => setImgError(true)} />
                 ) : (
                   <BrainCircuit className="w-6 h-6"/>
                 )}
            </div>
            <div>
                <span className="text-xl font-black tracking-tighter text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                {/* DYNAMIC REGION BADGE */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 tracking-widest uppercase"><Globe className="w-3 h-3"/> {userLocation}</div>
            </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
            {/* JURISDICTION SELECTOR (Does not affect currency) */}
            <div className="hidden md:block w-48">
                <CustomDropdown options={Object.keys(REGIONAL_CONFIG).filter(k => k !== "Global")} value={jurisdiction} onChange={setJurisdiction} type="country" />
            </div>

            {user ? (
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowWalletModal(true)} 
                        className="flex items-center gap-0 bg-slate-900 text-white pl-4 pr-1 py-1 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700 active:scale-95"
                    >
                        <Wallet className="w-4 h-4 text-yellow-400 mr-2"/>
                        <span className="font-bold text-sm mr-3">{config.symbol}{walletBalance}</span>
                        <div className="bg-green-500 hover:bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors">
                            <span className="text-sm font-bold leading-none mb-0.5">+</span>
                        </div>
                    </button>
                    <button onClick={handleLogout} className="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Logout"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : (
                <button onClick={() => openAuth("signup")} className={`bg-gradient-to-r ${THEME.accent} hover:shadow-lg hover:shadow-blue-500/30 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:-translate-y-0.5`}>
                    Start Free
                </button>
            )}
        </div>
      </nav>

      {/* 2. OUR STORY (OVERLAY) */}
      {showStory ? (
          <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8">
              <button onClick={() => {setShowStory(false); scrollToTop();}} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Tool</button>
              
              <div className="text-center mb-16">
                  <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">The Unilex Vision</h1>
                  <p className="text-2xl text-slate-500 font-medium">Why we built the world's most essential legal brain.</p>
              </div>

              <div className="prose prose-lg prose-slate mx-auto">
                  <p className="text-xl leading-relaxed mb-8">
                      For centuries, high-quality legal intelligence was locked behind the expensive doors of elite law firms. 
                      If you couldn't afford $500 an hour, you were left guessing.
                  </p>
                  <p className="text-xl leading-relaxed mb-8">
                      We asked a simple question: <strong>What if legal protection was as instant and accessible as sending a text?</strong>
                  </p>
                  <div className="my-12 p-8 bg-blue-50 rounded-3xl border border-blue-100">
                      <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Globe className="w-6 h-6"/> Uni + Lex</h3>
                      <p className="text-blue-800">
                          <strong>Uni</strong>versal Access + <strong>Lex</strong> (Law). 
                          We combined military-grade encryption with state-of-the-art Generative AI to create a system that understands the nuance of Indian Law, US Law, and 100+ other jurisdictions instantly.
                      </p>
                  </div>
                  <p className="text-xl leading-relaxed">
                      Unilex AI isn't just a tool. It's a movement to democratize justice. 
                      Whether you are a freelancer in Bangalore signing your first contract, or a startup in Texas hiring your first employee, 
                      Unilex ensures you never sign blindly again.
                  </p>
              </div>
              
              <div className="mt-16 text-center">
                   <button onClick={() => {setShowStory(false); scrollToTop();}} className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-transform">Start Using Unilex</button>
              </div>
          </div>
      ) : (
        <>
            {/* 3. HERO & MAIN TOOL */}
            <main className="max-w-6xl mx-auto px-4 mt-12 text-center animate-in fade-in duration-700">
                {/* REMOVED "Powered By" as requested */}
                
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                    Universal Legal Intelligence. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Unified & Essential.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                    We are experts in global legal frameworks.
                    Instant Contract Audits and Drafting explicitly compliant with <span className="font-bold text-slate-900">{jurisdiction} Law</span>.
                </p>

                {/* TAB SWITCHER */}
                <div className="sticky top-24 z-40 flex justify-center mb-12">
                    <div className="p-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-slate-200/60 inline-flex gap-1">
                        <button onClick={() => setActiveTab("analyze")} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "analyze" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
                            <ShieldCheck className="w-4 h-4"/> Audit
                        </button>
                        <button onClick={() => setActiveTab("create")} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "create" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
                            <PenTool className="w-4 h-4"/> Draft
                        </button>
                        {user && (
                            <button onClick={() => setActiveTab("transactions")} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "transactions" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
                                <Receipt className="w-4 h-4"/> Billing
                            </button>
                        )}
                    </div>
                </div>

                {/* --- ANALYZE TAB --- */}
                {activeTab === "analyze" && (
                    <div className={`relative p-1 rounded-3xl bg-gradient-to-b from-white to-blue-50 shadow-2xl max-w-3xl mx-auto border border-white`}>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[22px] p-8 md:p-12 min-h-[400px] flex flex-col justify-center">
                            {!loading && !risks ? (
                                <>
                                    <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload"/>
                                    <label htmlFor="file-upload" className="cursor-pointer group">
                                        <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6 group-hover:scale-110 shadow-lg border border-slate-100 transition-all relative">
                                            <div className="absolute inset-0 bg-blue-100 rounded-full opacity-0 group-hover:opacity-50 animate-ping"></div>
                                            <Upload className="w-10 h-10 text-blue-600 relative z-10"/>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Drop your Contract here</h3>
                                        <p className="text-slate-500 mb-8">PDF, DOCX, Images • Bank-Grade Security</p>
                                        
                                        <div 
                                            onClick={(e) => { e.preventDefault(); setShowWalletModal(true); }}
                                            className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-200 group-hover:border-blue-300 transition-colors cursor-pointer hover:shadow-md"
                                        >
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Cost / Scan</p>
                                                <p className="text-lg font-black text-slate-900">{config.symbol}{config.cost}</p>
                                            </div>
                                            <div className="h-8 w-px bg-slate-200"></div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Your Wallet</p>
                                                <p className={`text-lg font-black ${walletBalance > 0 ? "text-green-600" : "text-slate-900"}`}>{config.symbol}{walletBalance}</p>
                                            </div>
                                            <div className="ml-2 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <ArrowUpRight className="w-4 h-4 text-slate-400"/>
                                            </div>
                                        </div>
                                    </label>
                                </>
                            ) : loading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4"/>
                                    <h3 className="text-xl font-bold text-slate-900">Unilex AI is analyzing...</h3>
                                </div>
                            ) : (
                                <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between pb-6 border-b border-slate-200/60 mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900">Risk Assessment</h3>
                                            <p className="text-slate-500 text-sm">{risks.length} potential issues found</p>
                                        </div>
                                        <button onClick={() => {setRisks(null); setContractText("");}} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Scan Another</button>
                                    </div>
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {risks.map((r, i) => (
                                            <div key={i} className={`p-5 rounded-2xl border ${r.risk === "High" ? "bg-red-50/50 border-red-200" : "bg-amber-50/50 border-amber-200"}`}>
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${r.risk === "High" ? "text-red-600" : "text-amber-600"}`}/>
                                                    <div>
                                                        <h4 className={`font-bold ${r.risk === "High" ? "text-red-900" : "text-amber-900"}`}>{r.title}</h4>
                                                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{r.advice}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- CREATE TAB --- */}
                {activeTab === "create" && (
                    <div className="relative p-1 rounded-3xl bg-gradient-to-b from-white to-blue-50 shadow-2xl max-w-3xl mx-auto border border-white text-left">
                        <div className="bg-white/60 backdrop-blur-sm rounded-[22px] p-8 md:p-12">
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Select Document Type</label>
                                    <CustomDropdown options={docTypes} value={docType} onChange={setDocType} type="text" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Define Parameters</label>
                                    <textarea value={userScenario} onChange={e => setUserScenario(e.target.value)} placeholder="Describe your requirement..." className="w-full p-5 bg-white rounded-xl border border-slate-200 shadow-sm h-40 resize-none outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"></textarea>
                                </div>
                                <button onClick={handleCreateDoc} disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl shadow-blue-500/20 bg-gradient-to-r ${THEME.accent} hover:scale-[1.01] transition-all flex items-center justify-center gap-3`}>
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Sparkles className="w-6 h-6"/>}
                                    <span>Generate Draft</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-medium">{config.symbol}{config.cost}</span>
                                </button>
                            </div>
                            {generatedDoc && (
                                <div className="mt-10 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-6 h-6 text-green-500"/>
                                            <h3 className="font-bold text-slate-900 text-lg">Draft Ready</h3>
                                        </div>
                                        <button onClick={() => downloadDocx(generatedDoc, "Unilex_Draft.docx")} className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"><Download className="w-4 h-4"/> Download .DOCX</button>
                                    </div>
                                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-inner max-h-80 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 leading-relaxed">{generatedDoc}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* --- TRANSACTIONS --- */}
                {activeTab === "transactions" && (
                    <div className="max-w-4xl mx-auto">
                        {transactions.length === 0 ? (
                            <div className="p-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                No payment history found.
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {transactions.map((txn, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-all">
                                        <div className="text-left flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6"/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-lg">{txn.description}</p>
                                                <div className="flex gap-4 text-xs text-slate-500 mt-1 font-mono">
                                                    <span>{txn.date}</span>
                                                    <span>ID: {txn.id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                                            <span className="text-xl font-black text-slate-900">{txn.symbol}{txn.amount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
      )}

      {/* FOOTER */}
      {!showStory && (
        <footer className="mt-24 border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-2 text-left">
                        <div className="flex items-center gap-2 mb-4">
                                <div className={`w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br ${THEME.primary} flex items-center justify-center text-white`}>
                                    {!imgError ? (
                                    <img src={logoImg} alt="Logo" className="w-full h-full object-cover"/>
                                    ) : (
                                    <BrainCircuit className="w-5 h-5"/>
                                    )}
                                </div>
                            <span className="text-xl font-black text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-medium">
                            Making elite legal intelligence seamless, instant, and accessible to everyone.
                        </p>
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><button onClick={()=>{setActiveTab('analyze'); scrollToTop()}} className="hover:text-blue-600">Contract Audit</button></li>
                            <li><button onClick={()=>{setActiveTab('create'); scrollToTop()}} className="hover:text-blue-600">Legal Drafting</button></li>
                        </ul>
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-900 mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><button onClick={() => {setShowStory(true); scrollToTop()}} className="hover:text-blue-600 font-bold flex items-center gap-1"><BookOpen className="w-3 h-3"/> Our Story</button></li>
                            <li><button onClick={() => {setShowContact(true); scrollToTop()}} className="hover:text-blue-600 font-bold flex items-center gap-1"><Mail className="w-3 h-3"/> Contact Us</button></li>
                            <li><a href={PRICING.GLOBAL.PAY_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-pink-600 font-bold hover:text-pink-700 mt-2"><Heart className="w-4 h-4 fill-current"/> Support Us</a></li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                    <p>© 2025 Unilex AI. All rights reserved.</p>
                    <div className="flex items-center gap-2"><Building2 className="w-3 h-3"/><span>Registered Entity • Data Processed Securely</span></div>
                </div>
            </div>
        </footer>
      )}

      {/* --- BACK TO TOP BUTTON --- */}
      {showScrollTop && (
          <button 
            onClick={scrollToTop} 
            className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-600 transition-all z-50 animate-in fade-in slide-in-from-bottom-4"
            title="Back to Top"
          >
              <ArrowUp className="w-6 h-6"/>
          </button>
      )}

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full relative border border-white/50">
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">{authView === "login" ? "Welcome" : "Create Account"}</h2>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authView === "signup" && (
                          <>
                             <input type="text" placeholder="Full Name" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})}/>
                             <input type="tel" placeholder="Phone Number" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})}/>
                          </>
                      )}
                      {authView !== "otp" && (
                          <>
                              <input type="email" placeholder="Email Address" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})}/>
                              <input type="password" placeholder="Password" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})}/>
                          </>
                      )}
                      {authView === "otp" && <input type="text" placeholder="Enter OTP" className="w-full p-4 bg-slate-50 rounded-xl text-center text-2xl tracking-[0.5em] font-black outline-none border border-slate-200" value={otpInput} onChange={e => setOtpInput(e.target.value)}/>}
                      <button className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg bg-gradient-to-r ${THEME.primary} hover:scale-[1.02] transition-all`}>{authView === "login" ? "Login" : authView === "signup" ? `Get ${config.symbol}${config.bonus} Free` : "Verify"}</button>
                  </form>
              </div>
          </div>
      )}

      {/* --- CONTACT US MODAL --- */}
      {showContact && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full relative border border-white/50">
                  <button onClick={() => setShowContact(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><MessageSquare className="w-8 h-8"/></div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">Contact Unilex</h2>
                  <p className="text-center text-slate-500 text-sm mb-6">We'd love to hear from you. Expect a reply within 24 hours.</p>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                      <input type="text" placeholder="Your Name" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}/>
                      <input type="email" placeholder="Email Address" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}/>
                      <input type="tel" placeholder="Phone Number" className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})}/>
                      <textarea placeholder="How can we help?" required className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 transition-all font-medium h-32 resize-none" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>
                      <button className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg bg-gradient-to-r ${THEME.primary} hover:scale-[1.02] transition-all`}>Send Message</button>
                  </form>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center gap-6 text-slate-400">
                      <a href="#" className="hover:text-blue-600 transition-colors"><Mail className="w-5 h-5"/></a>
                      <a href="#" className="hover:text-blue-600 transition-colors"><PhoneIcon className="w-5 h-5"/></a>
                  </div>
              </div>
          </div>
      )}

      {/* --- WALLET DASHBOARD MODAL --- */}
      {showWalletModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative border border-white/50">
                  <button onClick={() => setShowWalletModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse"><Coins className="w-10 h-10"/></div>
                  
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Current Balance</h3>
                  <h2 className="text-4xl font-black text-slate-900 mb-8">{config.symbol}{walletBalance}</h2>
                  
                  <div className="space-y-3">
                      <a href={config.payLink} target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl transition-all hover:scale-[1.02]">
                          {isIndia ? "Recharge ₹100" : `Add ${config.symbol}${config.currency === "INR" ? 100 : 50}`}
                      </a>
                      <input type="text" placeholder="Transaction ID (After Payment)" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none text-center text-sm font-mono focus:border-green-500 transition-all" value={transactionId} onChange={e => setTransactionId(e.target.value)}/>
                      <button onClick={handlePaymentVerify} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg transition-all">Verify Payment</button>
                      
                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <button onClick={() => setShowWalletModal(false)} className="text-slate-500 font-bold text-sm hover:text-slate-800 flex items-center justify-center gap-2 w-full"><ArrowUpRight className="w-4 h-4"/> Back to Tool</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;