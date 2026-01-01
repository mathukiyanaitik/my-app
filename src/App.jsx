// --- CRITICAL: PREVENT GLOBAL NAMESPACE POLLUTION ---
window.global = window;

import React, { useState, useEffect, useRef, Component } from 'react';
import logoImg from './assets/logo.png'; 
import { 
    Upload, AlertTriangle, Loader2, Download, ShieldCheck, PenTool, 
    Zap, Heart, CheckCircle2, Building2, ChevronRight, Receipt, 
    ArrowUpRight, ChevronDown, Check, BookOpen, MessageSquare, 
    ArrowUp, Mail, Phone, Wallet, LogOut, X, Globe, Coins, RefreshCw,
    FileText, FileType, Image as ImageIcon, MousePointer2, Sparkles, Crown, CreditCard, History, Scale, Lock, Lightbulb, Users, Target
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as docx from "docx"; 
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- 1. DYNAMIC GLOBAL CONFIGURATION ---
const REGIONAL_CONFIG = {
    "India": { code: "in", currency: "INR", symbol: "₹", cost: 15, bonus: 100, subs: { monthly: 999, halfYearly: 4999, yearly: 8999 }, payLink: "https://razorpay.me/@YOUR_INDIAN_LINK" },
    "United States": { code: "us", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, subs: { monthly: 29, halfYearly: 149, yearly: 249 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "United Kingdom": { code: "gb", currency: "GBP", symbol: "£", cost: 2.50, bonus: 40, subs: { monthly: 25, halfYearly: 125, yearly: 200 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "Canada": { code: "ca", currency: "CAD", symbol: "C$", cost: 4.50, bonus: 70, subs: { monthly: 39, halfYearly: 199, yearly: 349 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "Australia": { code: "au", currency: "AUD", symbol: "A$", cost: 5.00, bonus: 75, subs: { monthly: 45, halfYearly: 220, yearly: 399 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "Germany": { code: "de", currency: "EUR", symbol: "€", cost: 3.00, bonus: 45, subs: { monthly: 29, halfYearly: 149, yearly: 249 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "United Arab Emirates": { code: "ae", currency: "AED", symbol: "AED", cost: 12.00, bonus: 180, subs: { monthly: 110, halfYearly: 550, yearly: 999 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" },
    "Global": { code: "gl", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, subs: { monthly: 29, halfYearly: 149, yearly: 249 }, payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" }
};

// --- 2. LOCALIZED DOCUMENT INTELLIGENCE ---
const LOCALIZED_DOCS = {
    "India": ["Affidavit / Undertaking", "Rent Agreement", "Sale Deed", "Freelance Agreement", "Employment Letter", "Partnership Deed", "Legal Notice", "Power of Attorney", "MoU"],
    "United States": ["Independent Contractor Agreement", "Consulting Agreement", "NDA", "Employment Letter", "Lease Agreement", "LLC Operating Agreement", "Privacy Policy", "Cease & Desist"],
    "United Kingdom": ["Freelance Agreement", "Consultancy Agreement", "AST (Tenancy)", "Employment Contract", "NDA", "Shareholders Agreement"],
    "Global": ["Service Agreement", "Consulting Contract", "NDA", "Employment Contract", "Rental Agreement", "Privacy Policy", "MoU"]
};

// --- 3. ERROR BOUNDARY ---
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("CRITICAL APP ERROR:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">System Interrupted</h2>
                        <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mt-6 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/> Reload Interface</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- 4. CUSTOM CURSOR ---
const CustomCursor = () => {
    const cursorRef = useRef(null);
    const cursorDotRef = useRef(null);
    useEffect(() => {
        const moveCursor = (e) => {
            if (cursorRef.current && cursorDotRef.current) {
                cursorRef.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
                cursorDotRef.current.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
            }
        };
        const clickDown = () => { if(cursorRef.current) cursorRef.current.style.transform += " scale(0.8)"; };
        const clickUp = () => { if(cursorRef.current) cursorRef.current.style.transform = cursorRef.current.style.transform.replace(" scale(0.8)", ""); };
        window.addEventListener('mousemove', moveCursor); window.addEventListener('mousedown', clickDown); window.addEventListener('mouseup', clickUp);
        return () => { window.removeEventListener('mousemove', moveCursor); window.removeEventListener('mousedown', clickDown); window.removeEventListener('mouseup', clickUp); };
    }, []);
    return <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block"><div ref={cursorRef} className="absolute w-8 h-8 border-2 border-blue-600 rounded-full transition-transform duration-100 ease-out"/><div ref={cursorDotRef} className="absolute w-2 h-2 bg-blue-600 rounded-full"/></div>;
};

// --- 5. CUSTOM DROPDOWN ---
const CustomDropdown = ({ options, value, onChange, type = "text" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                    {type === "country" && REGIONAL_CONFIG[value] && <img src={`https://flagcdn.com/w40/${REGIONAL_CONFIG[value].code}.png`} className="w-6 h-4 rounded shadow-sm object-cover" alt="flag"/>}
                    <span className="font-bold text-slate-800 truncate">{value}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
            </button>
            {isOpen && <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto">{options.map((opt, idx) => (
                <div key={idx} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${opt === value ? "bg-blue-50" : ""}`}>
                    {type === "country" && REGIONAL_CONFIG[opt] && <img src={`https://flagcdn.com/w40/${REGIONAL_CONFIG[opt].code}.png`} className="w-5 h-3.5 rounded shadow-sm" alt="flag"/>}
                    <span className={`flex-1 text-sm ${opt === value ? "font-bold text-blue-600" : "font-medium text-slate-700"}`}>{opt}</span>
                    {opt === value && <Check className="w-4 h-4 text-blue-600"/>}
                </div>
            ))}</div>}
        </div>
    );
};

// --- 6. APP CONTENT ---
function AppContent() {
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [userLocation, setUserLocation] = useState("Global"); 
  const [jurisdiction, setJurisdiction] = useState("United States"); 
  const [walletBalance, setWalletBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false); 

  // VIEW STATE: dashboard | story | contact
  const [currentView, setCurrentView] = useState("dashboard"); 
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState("topup"); 
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");

  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [transactionId, setTransactionId] = useState("");
  const [billingInfo, setBillingInfo] = useState({ address: "", city: "", state: "", zip: "" });
  
  const [transactions, setTransactions] = useState([]); 
  const [documentHistory, setDocumentHistory] = useState([]);
  const [risks, setRisks] = useState(null);
  const [docType, setDocType] = useState(""); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  const getConfig = () => REGIONAL_CONFIG[userLocation] || REGIONAL_CONFIG["Global"];
  const getLocalizedDocList = () => LOCALIZED_DOCS[jurisdiction] || LOCALIZED_DOCS["Global"];

  useEffect(() => {
    const setWorker = async () => { try { pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`; } catch (e) {} };
    setWorker();

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
        setUser(currentUser);
        const savedBalance = localStorage.getItem(`wallet_${currentUser.email}`);
        setWalletBalance(savedBalance ? parseFloat(savedBalance) : 0);
        const premiumStatus = localStorage.getItem(`premium_${currentUser.email}`);
        setIsPremium(premiumStatus === "true");
        
        const savedTxns = localStorage.getItem(`txns_${currentUser.email}`);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
        try { setDocumentHistory(historyService.getDocuments()); } catch(e) {}
    }

    detectUserLocation();
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
      const docs = getLocalizedDocList();
      if(docs.length > 0) setDocType(docs[0]);
  }, [jurisdiction]);

  const detectUserLocation = async () => {
      try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data && data.country_name) {
              const detectedName = Object.keys(REGIONAL_CONFIG).includes(data.country_name) ? data.country_name : "Global";
              setUserLocation(detectedName);
              if (Object.keys(REGIONAL_CONFIG).includes(data.country_name)) setJurisdiction(data.country_name);
          }
      } catch (e) { console.warn("Location detection failed"); }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  
  const goHome = () => { 
      scrollToTop(); 
      setCurrentView("dashboard");
      setActiveTab("analyze"); 
  };

  const handleContactSubmit = (e) => { e.preventDefault(); alert("Message sent! We will contact you at " + contactForm.email); setContactForm({name:"",email:"",phone:"",message:""}); setCurrentView("dashboard"); };

  const processPaymentCheck = () => {
      if (isPremium) return true; 
      const config = getConfig();
      if (walletBalance >= config.cost) {
          const newBalance = walletBalance - config.cost;
          setWalletBalance(parseFloat(newBalance.toFixed(2)));
          localStorage.setItem(`wallet_${user.email}`, newBalance);
          return true;
      } else {
          setWalletTab("topup"); 
          setShowWalletModal(true); 
          return false;
      }
  };

  const handlePaymentVerify = () => {
      if (!transactionId) { alert("Please enter Transaction ID"); return; }
      const config = getConfig();
      
      if (walletTab === "topup") {
          const rechargeAmount = config.currency === "INR" ? 100 : 50; 
          const newBalance = walletBalance + rechargeAmount;
          setWalletBalance(parseFloat(newBalance.toFixed(2)));
          if(user) localStorage.setItem(`wallet_${user.email}`, newBalance);
          alert(`${config.symbol}${rechargeAmount} Added to Wallet!`);
          
          const newTxn = { id: Math.floor(Math.random() * 10000000000).toString(), date: new Date().toLocaleDateString('en-GB'), amount: rechargeAmount, currency: config.currency, symbol: config.symbol, description: "Wallet Recharge", txnId: transactionId, billing: { ...billingInfo } };
          const updatedTxns = [newTxn, ...transactions];
          setTransactions(updatedTxns);
          if(user) localStorage.setItem(`txns_${user.email}`, JSON.stringify(updatedTxns));

      } else {
          setIsPremium(true);
          if(user) localStorage.setItem(`premium_${user.email}`, "true");
          alert("🎉 Congratulations! You are now a Unilex Pro member.");
          
          const newTxn = { id: Math.floor(Math.random() * 10000000000).toString(), date: new Date().toLocaleDateString('en-GB'), amount: config.subs.monthly, currency: config.currency, symbol: config.symbol, description: "Pro Subscription (Monthly)", txnId: transactionId, billing: { ...billingInfo } };
          const updatedTxns = [newTxn, ...transactions];
          setTransactions(updatedTxns);
          if(user) localStorage.setItem(`txns_${user.email}`, JSON.stringify(updatedTxns));
      }
      
      setShowWalletModal(false); setTransactionId("");
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault(); setAuthError(""); const config = getConfig();
    if (authView === "signup") { const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString(); setGeneratedOtp(fakeOtp); alert(`[SIMULATION] OTP: ${fakeOtp}`); setAuthView("otp"); } 
    else if (authView === "otp") {
      if (otpInput === generatedOtp) {
        const result = authService.signup(authForm.email, authForm.password, authForm.name, authForm.phone);
        if (result.success && result.user) { setUser(result.user); setWalletBalance(config.bonus); localStorage.setItem(`wallet_${result.user.email}`, config.bonus); setShowAuthModal(false); } 
        else { setAuthError(result.error || "Signup Failed"); }
      } else { setAuthError("Invalid OTP"); }
    } else if (authView === "login") {
        const result = authService.login(authForm.email, authForm.password);
        if (result.success) { setUser(result.user); const saved = localStorage.getItem(`wallet_${result.user.email}`); setWalletBalance(saved ? parseFloat(saved) : 0); setShowAuthModal(false); } 
        else { setAuthError(result.error); }
    }
  };

  const handleLogout = () => { authService.logout(); setUser(null); setWalletBalance(0); setIsPremium(false); setTransactions([]); };

  const handleCreateDoc = async () => {
      if (!user) { setAuthView("signup"); setShowAuthModal(true); return; }
      if (!processPaymentCheck()) return;
      setLoading(true);
      try {
          const genAI = new GoogleGenerativeAI(API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
          const prompt = `Unilex AI Drafting Engine. Create professional ${docType} for ${jurisdiction}. Scenario: ${userScenario}. Use Markdown.`;
          const result = await model.generateContent(prompt);
          setGeneratedDoc(result.response.text());
          historyService.saveDocument({ type: "generated", docType, country: jurisdiction, createdAt: new Date().toISOString() });
      } catch (e) { alert("Error generating draft. Please try again."); } 
      finally { setLoading(false); }
  };

  const downloadDocx = (text, name) => {
      try {
          const doc = new docx.Document({ sections: [{ children: text.split('\n').map(l => new docx.Paragraph({ children: [new docx.TextRun(l)] })) }] });
          docx.Packer.toBlob(doc).then(b => saveAs(b, name));
      } catch(e) { alert("Download failed. Please copy text manually."); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!user) { setAuthView("signup"); setShowAuthModal(true); return; }
    if (!processPaymentCheck()) return;
    setLoading(true); setRisks(null);
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
        const result = await model.generateContent(`Legal Expert for ${jurisdiction}. Analyze risks, compliance issues, and multi-party obligations in this document (Agreement, Undertaking, or Contract). JSON Output: [{title, risk, advice}]. Text: ${extractedText.substring(0, 5000)}`);
        setRisks(JSON.parse(result.response.text().replace(/```json|```/g, '').trim()));
        historyService.saveDocument({ type: "analysis", fileName: file.name, country: jurisdiction, createdAt: new Date().toISOString() });
    } catch (err) { 
        alert("Scan Failed. Credits Refunded."); if(!isPremium) { const c = getConfig(); setWalletBalance(prev => prev + c.cost); }
    } finally { setLoading(false); e.target.value = null; }
  };

  const config = getConfig();

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F0F4F8] selection:bg-blue-100 pb-24 relative cursor-default">
      <CustomCursor />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-4 md:px-8 py-4 flex justify-between items-center transition-all">
        <div onClick={goHome} className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center text-white shadow-lg">
                {!imgError ? <img src={logoImg} className="w-full h-full object-cover" onError={()=>setImgError(true)}/> : <Globe className="w-6 h-6"/>}
            </div>
            <div>
                <span className="text-xl font-black text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase"><Globe className="w-3 h-3"/> {userLocation}</div>
            </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:block w-48"><CustomDropdown options={Object.keys(REGIONAL_CONFIG).filter(k => k !== "Global")} value={jurisdiction} onChange={setJurisdiction} type="country" /></div>
            {user ? (
                <div className="flex items-center gap-4">
                    <button onClick={() => {setWalletTab('topup'); setShowWalletModal(true)}} className="flex items-center gap-0 bg-slate-900 text-white pl-4 pr-1 py-1 rounded-full shadow-lg border border-slate-700 active:scale-95 transition-transform">
                        {isPremium ? <Crown className="w-4 h-4 text-yellow-400 mr-2"/> : <Wallet className="w-4 h-4 text-yellow-400 mr-2"/>}
                        <span className="font-bold text-sm mr-3">{isPremium ? "PRO" : `${config.symbol}${walletBalance}`}</span>
                        <div className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">+</div>
                    </button>
                    <button onClick={handleLogout} className="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : <button onClick={() => {setAuthView("signup"); setShowAuthModal(true);}} className="bg-blue-600 hover:shadow-lg text-white px-6 py-2.5 rounded-full font-bold transition-transform hover:-translate-y-0.5">Start Free</button>}
        </div>
      </nav>

      {/* VIEW SWITCHING */}
      {currentView === "story" ? (
          /* STORY PAGE */
          <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8">
              <button onClick={goHome} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Tool</button>
              
              <div className="text-center mb-16">
                  <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">The Unilex Vision</h1>
                  <p className="text-2xl text-slate-500 font-medium">Why we built the world's most essential legal brain.</p>
              </div>

              <div className="prose prose-lg prose-slate mx-auto">
                  <p className="text-xl leading-relaxed mb-8">
                      For centuries, high-quality legal intelligence was locked behind the expensive doors of elite law firms. 
                      If you couldn't afford $500 an hour, you were left guessing.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 my-12">
                      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
                          <Lightbulb className="w-10 h-10 text-yellow-500 mx-auto mb-4"/>
                          <h3 className="font-bold text-lg mb-2">The Spark</h3>
                          <p className="text-sm text-slate-500">Why should justice be a luxury? We wanted to democratize access.</p>
                      </div>
                      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
                          <Globe className="w-10 h-10 text-blue-500 mx-auto mb-4"/>
                          <h3 className="font-bold text-lg mb-2">The Name</h3>
                          <p className="text-sm text-slate-500"><strong>Uni</strong>versal + <strong>Lex</strong> (Law). Law for everyone, everywhere.</p>
                      </div>
                      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
                          <Target className="w-10 h-10 text-red-500 mx-auto mb-4"/>
                          <h3 className="font-bold text-lg mb-2">The Mission</h3>
                          <p className="text-sm text-slate-500">To make legal drafting and auditing as simple as sending an email.</p>
                      </div>
                  </div>

                  <p className="text-xl leading-relaxed">
                      Unilex AI isn't just a tool. It's a movement to democratize justice. 
                      Whether you are a freelancer in Bangalore signing your first contract, or a startup in Texas hiring your first employee, 
                      Unilex ensures you never sign blindly again.
                  </p>
              </div>
          </div>
      ) : currentView === "contact" ? (
          /* CONTACT PAGE */
          <div className="max-w-xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8">
              <button onClick={goHome} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Tool</button>
              
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl relative border border-white/50">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8"/></div>
                      <h2 className="text-2xl font-black text-slate-900">Contact Us</h2>
                      <p className="text-slate-500 mt-2">Have questions? We're here to help.</p>
                  </div>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                      <input type="text" placeholder="Your Name" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500 transition-all font-medium" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}/>
                      <input type="email" placeholder="Email Address" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500 transition-all font-medium" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}/>
                      <input type="tel" placeholder="Phone Number" className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500 transition-all font-medium" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})}/>
                      <textarea placeholder="How can we help?" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500 h-32 resize-none transition-all font-medium" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>
                      <button className="w-full py-4 rounded-xl text-white font-bold bg-slate-900 hover:scale-[1.02] transition-transform">Send Message</button>
                  </form>
              </div>
          </div>
      ) : (
        /* MAIN DASHBOARD */
        <main className="max-w-6xl mx-auto px-4 mt-12 text-center animate-in fade-in duration-700">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">Universal Legal Intelligence.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Unified & Essential.</span></h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                Expert analysis for <strong>Agreements, Government Forms, and Multi-Party Contracts</strong>. 
                Instantly audit and draft compliant with <span className="font-bold text-slate-900">{jurisdiction} Law</span>.
            </p>
            
            <div className="sticky top-24 z-40 flex justify-center mb-12">
                <div className="p-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-slate-200/60 inline-flex gap-1">
                    <button onClick={() => setActiveTab("analyze")} className={`px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "analyze" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}><ShieldCheck className="w-4 h-4"/> Audit</button>
                    <button onClick={() => setActiveTab("create")} className={`px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "create" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}><PenTool className="w-4 h-4"/> Draft</button>
                    {user && <button onClick={() => setActiveTab("transactions")} className={`px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "transactions" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}><Receipt className="w-4 h-4"/> Billing</button>}
                </div>
            </div>

            {activeTab === "analyze" && (
                <div className="bg-white/60 backdrop-blur-sm rounded-[22px] p-12 min-h-[400px] flex flex-col justify-center border border-white shadow-2xl max-w-3xl mx-auto">
                    {!loading && !risks ? (
                        <label className="cursor-pointer group">
                            <input type="file" onChange={handleFileUpload} className="hidden"/>
                            <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border border-slate-100 group-hover:scale-110 transition-transform relative">
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><Lock className="w-3 h-3"/> 256-bit Encrypted</div>
                                <Upload className="w-10 h-10 text-blue-600"/>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Drop Any Legal Document</h3>
                            <p className="text-slate-500 mb-6">Agreements, Gov Forms, Undertakings • PDF, DOCX</p>
                            
                            <div className="flex justify-center gap-4 mb-6">
                                <div className="flex flex-col items-center gap-1 text-slate-400"><FileText className="w-6 h-6"/><span className="text-[10px] font-bold">PDF</span></div>
                                <div className="flex flex-col items-center gap-1 text-slate-400"><FileType className="w-6 h-6"/><span className="text-[10px] font-bold">DOCX</span></div>
                                <div className="flex flex-col items-center gap-1 text-slate-400"><ImageIcon className="w-6 h-6"/><span className="text-[10px] font-bold">IMG</span></div>
                            </div>

                            <div onClick={(e) => { e.preventDefault(); setWalletTab('topup'); setShowWalletModal(true); }} className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-sm border group-hover:border-blue-300 transition-colors">
                                <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">{isPremium ? "Plan" : "Balance"}</p><p className={`text-lg font-black ${walletBalance > 0 || isPremium ? "text-green-600" : "text-slate-900"}`}>{isPremium ? "UNLIMITED" : `${config.symbol}${walletBalance}`}</p></div>
                                <div className="ml-2 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-slate-400"/></div>
                            </div>
                        </label>
                    ) : loading ? <div className="flex flex-col items-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4"/><h3 className="text-xl font-bold">Analyzing...</h3></div> : (
                        <div className="text-left"><h3 className="text-2xl font-bold mb-6">Risk Report</h3><div className="space-y-4 max-h-[500px] overflow-y-auto">{risks.map((r, i) => <div key={i} className="p-5 rounded-2xl border bg-amber-50 border-amber-200"><h4 className="font-bold text-amber-900">{r.title}</h4><p className="text-sm mt-2">{r.advice}</p></div>)}</div><button onClick={()=>setRisks(null)} className="mt-6 text-sm underline text-slate-500">Scan New</button></div>
                    )}
                </div>
            )}

            {activeTab === "create" && (
                <div className="bg-white/60 backdrop-blur-sm rounded-[22px] p-12 max-w-3xl mx-auto text-left border border-white shadow-2xl">
                    <div className="space-y-8">
                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Type</label><CustomDropdown options={getLocalizedDocList()} value={docType} onChange={setDocType}/></div>
                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Scenario</label><textarea value={userScenario} onChange={e => setUserScenario(e.target.value)} placeholder="Describe details..." className="w-full p-5 bg-white rounded-xl border h-40 font-medium"></textarea></div>
                        <button onClick={handleCreateDoc} disabled={loading} className="w-full py-4 rounded-xl text-white font-bold bg-slate-900 flex justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform">{loading ? <Loader2 className="animate-spin"/> : <Sparkles className="w-5 h-5"/>} Generate ({isPremium ? "Free" : `${config.symbol}${config.cost}`})</button>
                    </div>
                    {generatedDoc && (
                        <div className="mt-10 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">Draft Ready</h3><button onClick={() => downloadDocx(generatedDoc, "Draft.docx")} className="text-blue-600 font-bold flex gap-2"><Download className="w-4 h-4"/> Download</button></div><div className="p-6 bg-white rounded-xl border h-80 overflow-y-auto whitespace-pre-wrap text-xs">{generatedDoc}</div></div>
                    )}
                </div>
            )}

            {activeTab === "transactions" && (
                <div className="max-w-4xl mx-auto">
                    {transactions.length === 0 ? <div className="p-12 text-slate-400 bg-white rounded-2xl border border-dashed"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-20"/>No history.</div> : <div className="grid gap-4">{transactions.map((txn, i) => <div key={i} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center hover:shadow-md transition-all"><div className="text-left"><p className="font-bold text-lg">{txn.description}</p><span className="text-xs text-slate-500">{txn.date} • {txn.id}</span></div><span className="text-xl font-black">{txn.symbol}{txn.amount}</span></div>)}</div>}
                </div>
            )}
        </main>
      )}

      {/* FOOTER */}
      <footer className="mt-24 border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-2 text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-8 h-8 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center text-white`}>{!imgError ? <img src={logoImg} alt="Logo" className="w-full h-full object-cover"/> : <Globe className="w-5 h-5"/>}</div>
                            <span className="text-xl font-black text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-medium">Democratizing high-end legal intelligence. We combine advanced Generative AI with localized legal frameworks to make all legal documentation instant, affordable, and accessible.</p>
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><button onClick={()=>{setCurrentView("dashboard"); setActiveTab('analyze'); scrollToTop()}} className="hover:text-blue-600">Document Audit</button></li>
                            <li><button onClick={()=>{setCurrentView("dashboard"); setActiveTab('create'); scrollToTop()}} className="hover:text-blue-600">Legal Drafting</button></li>
                        </ul>
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-900 mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><button onClick={() => {setCurrentView("story"); scrollToTop()}} className="hover:text-blue-600 font-bold flex items-center gap-1"><BookOpen className="w-3 h-3"/> Our Story</button></li>
                            <li><button onClick={() => {setCurrentView("contact"); scrollToTop()}} className="hover:text-blue-600 font-bold flex items-center gap-1"><Mail className="w-3 h-3"/> Contact Us</button></li>
                            <li><a href={config.payLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-pink-600 font-bold hover:text-pink-700 mt-2"><Heart className="w-4 h-4 fill-current"/> Support Us</a></li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                    <p>© 2025 Unilex AI. All rights reserved.</p>
                    <div className="flex items-center gap-2"><Building2 className="w-3 h-3"/><span>ISO 27001 Security • Data Processed Securely</span></div>
                </div>
            </div>
        </footer>

      {/* FLOATING ACTION BUTTON */}
      {showScrollTop && <button onClick={scrollToTop} className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-600 transition-all z-50 animate-in fade-in slide-in-from-bottom-4"><ArrowUp className="w-6 h-6"/></button>}

      {/* AUTH MODAL */}
      {showAuthModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full relative border border-white/50">
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">{authView === "login" ? "Welcome" : "Create Account"}</h2>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authView === "signup" && <input type="text" placeholder="Name" required className="w-full p-4 rounded-xl border focus:border-blue-500" onChange={e => setAuthForm({...authForm, name: e.target.value})}/>}
                      {authView !== "otp" && <><input type="email" placeholder="Email" required className="w-full p-4 rounded-xl border focus:border-blue-500" onChange={e => setAuthForm({...authForm, email: e.target.value})}/><input type="password" placeholder="Password" required className="w-full p-4 rounded-xl border focus:border-blue-500" onChange={e => setAuthForm({...authForm, password: e.target.value})}/></>}
                      {authView === "otp" && <input type="text" placeholder="OTP" className="w-full p-4 rounded-xl border text-center text-2xl focus:border-blue-500" onChange={e => setOtpInput(e.target.value)}/>}
                      <button className="w-full py-4 rounded-xl text-white font-bold bg-slate-900 hover:scale-[1.02] transition-transform">{authView === "login" ? "Login" : authView === "signup" ? `Get ${config.symbol}${config.bonus} Free` : "Verify"}</button>
                  </form>
              </div>
          </div>
      )}

      {/* PREMIUM WALLET MODAL */}
      {showWalletModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full text-center relative border border-white/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <button onClick={() => setShowWalletModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm z-50"><X className="w-5 h-5"/></button>
                  
                  {/* TABS SWITCHER */}
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                      <button onClick={() => setWalletTab('topup')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${walletTab === 'topup' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Top Up</button>
                      <button onClick={() => setWalletTab('premium')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${walletTab === 'premium' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Premium</button>
                  </div>

                  {walletTab === 'topup' ? (
                      <>
                          <div className="w-16 h-16 bg-amber-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Coins className="w-8 h-8"/></div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Available Balance</h3>
                          <h2 className="text-3xl font-black mb-6">{config.symbol}{walletBalance}</h2>
                          <a href={config.payLink} target="_blank" rel="noreferrer" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold mb-4 hover:scale-[1.02] transition-transform">Add Credits</a>
                          <p className="text-[10px] text-slate-400 mb-6">Pay as you go. No expiration.</p>
                      </>
                  ) : (
                      <>
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Crown className="w-8 h-8"/></div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Unilex Pro</h3>
                          <h2 className="text-3xl font-black mb-2">{config.symbol}{config.subs.monthly}<span className="text-sm text-slate-400 font-medium">/mo</span></h2>
                          <p className="text-slate-500 mb-6 text-xs">Unlimited Audits & Drafting. Priority Support.</p>
                          
                          <div className="space-y-2 mb-6">
                              <div className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500 bg-blue-50/50">
                                  <span className="font-bold text-xs">Monthly</span>
                                  <span className="font-black text-sm">{config.symbol}{config.subs.monthly}</span>
                              </div>
                              <div className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500">
                                  <span className="font-bold text-xs">6 Months <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">SAVE 15%</span></span>
                                  <span className="font-black text-sm">{config.symbol}{config.subs.halfYearly}</span>
                              </div>
                              <div className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500">
                                  <span className="font-bold text-xs">Yearly <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">BEST VALUE</span></span>
                                  <span className="font-black text-sm">{config.symbol}{config.subs.yearly}</span>
                              </div>
                          </div>
                          
                          <a href={config.payLink} target="_blank" rel="noreferrer" className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:scale-[1.02] transition-transform">Subscribe Now</a>
                          {/* NEW: Back Option for Premium Tab */}
                          <button onClick={() => setShowWalletModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mt-4 block w-full">Maybe Later</button>
                      </>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100">
                      <input type="text" placeholder="Transaction ID (Verification)" className="w-full p-2.5 rounded-lg border text-center text-xs font-mono mb-2" onChange={e => setTransactionId(e.target.value)}/>
                      <button onClick={handlePaymentVerify} className="text-xs font-bold text-green-600 hover:underline block w-full mb-2">Verify Transaction Manually</button>
                      {walletTab === 'topup' && <button onClick={() => setShowWalletModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Complete Later</button>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// Wrap App in Error Boundary
export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }