// --- CRITICAL: PREVENT GLOBAL NAMESPACE POLLUTION (Fixes Draft Crash) ---
window.global = window;

import React, { useState, useEffect, useRef, Component } from 'react';
import logoImg from './assets/logo.png'; 
import { 
    Upload, AlertTriangle, Loader2, Download, ShieldCheck, PenTool, 
    Zap, Heart, CheckCircle2, Building2, ChevronRight, Receipt, 
    ArrowUpRight, ChevronDown, Check, BookOpen, MessageSquare, 
    ArrowUp, Mail, Phone, Wallet, LogOut, X, Globe, Coins, RefreshCw,
    FileText, FileType, Image as ImageIcon, MousePointer2, Sparkles, Crown, CreditCard, History, Scale, Lock
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
// FIX: Wildcard import to prevent 'Document' naming conflict with Browser DOM
import * as docx from "docx"; 
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE: ACCESS KEY FROM ENVIRONMENT
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- 1. DYNAMIC GLOBAL CONFIGURATION (Pricing, Currency & Subscriptions) ---
const REGIONAL_CONFIG = {
    "India": { 
        code: "in", currency: "INR", symbol: "₹", cost: 15, bonus: 100, 
        subs: { monthly: 999, halfYearly: 4999, yearly: 8999 },
        payLink: "https://razorpay.me/@YOUR_INDIAN_LINK" 
    },
    "United States": { 
        code: "us", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, 
        subs: { monthly: 29, halfYearly: 149, yearly: 249 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "United Kingdom": { 
        code: "gb", currency: "GBP", symbol: "£", cost: 2.50, bonus: 40, 
        subs: { monthly: 25, halfYearly: 125, yearly: 200 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Canada": { 
        code: "ca", currency: "CAD", symbol: "C$", cost: 4.50, bonus: 70, 
        subs: { monthly: 39, halfYearly: 199, yearly: 349 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Australia": { 
        code: "au", currency: "AUD", symbol: "A$", cost: 5.00, bonus: 75, 
        subs: { monthly: 45, halfYearly: 220, yearly: 399 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Germany": { 
        code: "de", currency: "EUR", symbol: "€", cost: 3.00, bonus: 45, 
        subs: { monthly: 29, halfYearly: 149, yearly: 249 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "United Arab Emirates": { 
        code: "ae", currency: "AED", symbol: "AED", cost: 12.00, bonus: 180, 
        subs: { monthly: 110, halfYearly: 550, yearly: 999 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    },
    "Global": { 
        code: "gl", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, 
        subs: { monthly: 29, halfYearly: 149, yearly: 249 },
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    }
};

// --- 2. LOCALIZED DOCUMENT INTELLIGENCE ---
// Maps jurisdiction to specific local document names
const LOCALIZED_DOCS = {
    "India": [
        "Affidavit / Undertaking",
        "Rent Agreement (11 Months)", 
        "Sale Deed", 
        "Freelance/Consultancy Agreement", 
        "Employment Letter", 
        "Partnership Deed", 
        "GST Invoice Format", 
        "Legal Notice", 
        "Power of Attorney",
        "Memorandum of Understanding (MoU)"
    ],
    "United States": [
        "Independent Contractor Agreement", 
        "Consulting Agreement",
        "NDA (Non-Disclosure)", 
        "Employment Offer Letter", 
        "Residential Lease", 
        "LLC Operating Agreement", 
        "Privacy Policy (GDPR/CCPA)", 
        "Cease & Desist Letter",
        "Affidavit of Residence"
    ],
    "United Kingdom": [
        "Freelance Services Agreement",
        "Consultancy Agreement",
        "AST (Tenancy Agreement)", 
        "Employment Contract", 
        "NDA", 
        "Shareholders Agreement", 
        "Privacy Policy", 
        "Service Agreement"
    ],
    "United Arab Emirates": [
        "Freelance Permit Contract",
        "Service Agreement (Free Zone)",
        "Tenancy Contract (Ejari)", 
        "Employment Contract (MOL)", 
        "Memorandum of Association (MoA)", 
        "Power of Attorney", 
        "NOC (No Objection Certificate)"
    ],
    "Germany": [
        "Freier Mitarbeitervertrag (Freelance)",
        "Beratervertrag (Consulting)",
        "Arbeitsvertrag (Employment)", 
        "Mietvertrag (Rental)", 
        "Geschäftsführervertrag", 
        "NDA", 
        "Datenschutzerklärung (GDPR)"
    ],
    "Australia": [
        "Independent Contractor Agreement",
        "Services Agreement",
        "Residential Tenancy Agreement", 
        "Employment Contract", 
        "Statutory Declaration", 
        "Privacy Policy"
    ],
    "Global": [
        "Freelance Service Agreement", 
        "Consulting Contract",
        "Non-Disclosure Agreement (NDA)", 
        "Service Agreement", 
        "Employment Contract", 
        "Rental Agreement", 
        "Privacy Policy", 
        "Memorandum of Understanding"
    ]
};

// --- 3. GLOBAL ERROR BOUNDARY (THE SAFETY NET) ---
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    
    static getDerivedStateFromError(error) { 
        return { hasError: true }; 
    }
    
    componentDidCatch(error, errorInfo) { 
        console.error("CRITICAL APP ERROR:", error, errorInfo); 
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8"/>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">System Interrupted</h2>
                        <p className="text-slate-500 mb-6">A critical component encountered an issue. We have logged this event.</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4"/> Reload Interface
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- 4. PREMIUM CUSTOM CURSOR (3D FEEL) ---
const CustomCursor = () => {
    const cursorRef = useRef(null);
    const cursorDotRef = useRef(null);

    useEffect(() => {
        const moveCursor = (e) => {
            if (cursorRef.current && cursorDotRef.current) {
                // Main circle with delay (Physics)
                cursorRef.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
                // Dot is instant
                cursorDotRef.current.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
            }
        };
        const clickDown = () => {
            if(cursorRef.current) {
                cursorRef.current.style.transform += " scale(0.8)";
                cursorRef.current.style.backgroundColor = "rgba(37, 99, 235, 0.1)";
            } 
        };
        const clickUp = () => {
            if(cursorRef.current) {
                cursorRef.current.style.transform = cursorRef.current.style.transform.replace(" scale(0.8)", "");
                cursorRef.current.style.backgroundColor = "transparent";
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mousedown', clickDown);
        window.addEventListener('mouseup', clickUp);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mousedown', clickDown);
            window.removeEventListener('mouseup', clickUp);
        };
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
            <div 
                ref={cursorRef} 
                className="absolute w-8 h-8 border-2 border-blue-600 rounded-full transition-transform duration-100 ease-out will-change-transform"
                style={{ top: 0, left: 0 }}
            />
            <div 
                ref={cursorDotRef}
                className="absolute w-2 h-2 bg-blue-600 rounded-full will-change-transform"
                style={{ top: 0, left: 0 }}
            />
        </div>
    );
};

// --- 5. CUSTOM DROPDOWN COMPONENT ---
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
                    <span className="font-bold text-slate-800 truncate">{value}</span>
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

// --- 6. MAIN APP CONTENT ---
function AppContent() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Location & Data
  const [userLocation, setUserLocation] = useState("Global"); 
  const [jurisdiction, setJurisdiction] = useState("United States"); 
  const [walletBalance, setWalletBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false); 

  // Views & Modals
  const [showStory, setShowStory] = useState(false); 
  const [showContact, setShowContact] = useState(false); 
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState("topup"); // 'topup' or 'premium'
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auth
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");

  // Forms
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [transactionId, setTransactionId] = useState("");
  const [billingInfo, setBillingInfo] = useState({ address: "", city: "", state: "", zip: "" });
  
  // App Data
  const [transactions, setTransactions] = useState([]); 
  const [documentHistory, setDocumentHistory] = useState([]);
  const [risks, setRisks] = useState(null);
  const [docType, setDocType] = useState(""); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  const getConfig = () => REGIONAL_CONFIG[userLocation] || REGIONAL_CONFIG["Global"];
  const getLocalizedDocList = () => LOCALIZED_DOCS[jurisdiction] || LOCALIZED_DOCS["Global"];

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. PDF Worker Safe Init
    const setWorker = async () => {
        try { 
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        } catch (e) { console.error("PDF Worker Error", e); }
    };
    setWorker();

    // 2. Load User Data
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

    // 3. Location Detection
    detectUserLocation();

    // 4. Scroll Listener
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update doc types when jurisdiction changes
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
      setShowStory(false); 
      setShowContact(false); 
      setActiveTab("analyze"); 
  };

  const handleContactSubmit = (e) => { 
      e.preventDefault(); 
      alert("Message sent! We will contact you at " + contactForm.email); 
      setContactForm({name:"",email:"",phone:"",message:""}); 
      setShowContact(false); 
  };

  // --- PAYMENT LOGIC ---
  const processPaymentCheck = () => {
      if (isPremium) return true; // Premium bypass
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
          // Recharge Logic
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
          // Premium Logic
          setIsPremium(true);
          if(user) localStorage.setItem(`premium_${user.email}`, "true");
          alert("🎉 Congratulations! You are now a Unilex Pro member.");
          
          const newTxn = { id: Math.floor(Math.random() * 10000000000).toString(), date: new Date().toLocaleDateString('en-GB'), amount: config.subs.monthly, currency: config.currency, symbol: config.symbol, description: "Pro Subscription (Monthly)", txnId: transactionId, billing: { ...billingInfo } };
          const updatedTxns = [newTxn, ...transactions];
          setTransactions(updatedTxns);
          if(user) localStorage.setItem(`txns_${user.email}`, JSON.stringify(updatedTxns));
      }
      
      setShowWalletModal(false); 
      setTransactionId("");
  };

  // --- AUTH LOGIC ---
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

  const openAuth = (view) => { setAuthView(view); setShowAuthModal(true); setAuthError(""); setAuthForm({email:"",password:"",name:"",phone:""}); setOtpInput(""); };

  // --- AI HANDLERS ---
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
          // SAFE DOCX USAGE
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
                    <button onClick={handleLogout} className="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Logout"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : <button onClick={() => openAuth("signup")} className="bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 text-white px-6 py-2.5 rounded-full font-bold transition-transform hover:-translate-y-0.5">Start Free</button>}
        </div>
      </nav>

      {/* VIEW: OUR STORY */}
      {showStory ? (
          <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8">
              <button onClick={goHome} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors"><ChevronRight className="w-4 h-4 rotate-180"/> Back</button>
              <div className="text-center mb-16"><h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">The Unilex Vision</h1><p className="text-2xl text-slate-500 font-medium">Why we built the world's most essential legal brain.</p></div>
              <div className="prose prose-lg prose-slate mx-auto">
                  <p className="text-xl leading-relaxed mb-8">For centuries, high-quality legal intelligence was locked behind the expensive doors of elite law firms. If you couldn't afford $500 an hour, you were left guessing.</p>
                  <div className="my-12 p-8 bg-blue-50 rounded-3xl border border-blue-100">
                      <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Globe className="w-6 h-6"/> Uni + Lex</h3>
                      <p className="text-blue-800"><strong>Uni</strong>versal Access + <strong>Lex</strong> (Law). We combined military-grade encryption with state-of-the-art Gener