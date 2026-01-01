// --- CRITICAL FIX: PREVENT GLOBAL NAMESPACE POLLUTION ---
window.global = window;

import React, { useState, useEffect, useRef, Component } from 'react';
import logoImg from './assets/logo.png'; 
import { 
    Upload, AlertTriangle, Loader2, Download, ShieldCheck, PenTool, 
    Zap, Heart, CheckCircle2, Building2, ChevronRight, Receipt, 
    ArrowUpRight, ChevronDown, Check, BookOpen, MessageSquare, 
    ArrowUp, Mail, Phone, Wallet, LogOut, X, Globe, Coins, RefreshCw,
    FileText, FileType, Image as ImageIcon, MousePointer2
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
// FIX: Wildcard import to prevent 'Document' naming conflict forever
import * as docx from "docx"; 
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- DYNAMIC GLOBAL CONFIGURATION ---
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
    "Global": { 
        code: "gl", currency: "USD", symbol: "$", cost: 3.33, bonus: 50, 
        payLink: "https://razorpay.me/@YOUR_GLOBAL_LINK" 
    }
};

const docTypes = ["Non-Disclosure Agreement (NDA)", "Employment Contract", "Freelance Agreement", "Rental Agreement", "SaaS License", "Privacy Policy", "Last Will", "Partnership Deed", "Legal Notice"];

// --- 1. GLOBAL ERROR BOUNDARY (THE SAFETY NET) ---
class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("CRITICAL APP ERROR:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8"/></div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">System Interrupted</h2>
                        <p className="text-slate-500 mb-6">A critical component encountered an issue. We have logged this event.</p>
                        <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4"/> Reload Interface
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- 2. PREMIUM CUSTOM CURSOR ---
const CustomCursor = () => {
    const cursorRef = useRef(null);
    const cursorDotRef = useRef(null);

    useEffect(() => {
        const moveCursor = (e) => {
            if (cursorRef.current && cursorDotRef.current) {
                // Main circle with delay
                cursorRef.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
                // Dot is instant
                cursorDotRef.current.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
            }
        };
        const clickDown = () => {
            if(cursorRef.current) cursorRef.current.style.transform += " scale(0.8)";
            if(cursorRef.current) cursorRef.current.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
        };
        const clickUp = () => {
            if(cursorRef.current) cursorRef.current.style.transform = cursorRef.current.style.transform.replace(" scale(0.8)", "");
            if(cursorRef.current) cursorRef.current.style.backgroundColor = "transparent";
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
            {/* Outer Ring */}
            <div 
                ref={cursorRef} 
                className="absolute w-8 h-8 border-2 border-blue-600 rounded-full transition-transform duration-100 ease-out will-change-transform"
                style={{ top: 0, left: 0 }}
            />
            {/* Inner Dot */}
            <div 
                ref={cursorDotRef}
                className="absolute w-2 h-2 bg-blue-600 rounded-full will-change-transform"
                style={{ top: 0, left: 0 }}
            />
        </div>
    );
};

// --- 3. CUSTOM DROPDOWN COMPONENT ---
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
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {options.map((opt, idx) => (
                        <div key={idx} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${opt === value ? "bg-blue-50" : ""}`}>
                            {type === "country" && REGIONAL_CONFIG[opt] && <img src={`https://flagcdn.com/w40/${REGIONAL_CONFIG[opt].code}.png`} className="w-5 h-3.5 rounded shadow-sm" alt="flag"/>}
                            <span className={`flex-1 text-sm ${opt === value ? "font-bold text-blue-600" : "font-medium text-slate-700"}`}>{opt}</span>
                            {opt === value && <Check className="w-4 h-4 text-blue-600"/>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- 4. MAIN APP LOGIC ---
function AppContent() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Location & Context
  const [userLocation, setUserLocation] = useState("Global"); 
  const [jurisdiction, setJurisdiction] = useState("United States"); 
  const [walletBalance, setWalletBalance] = useState(0);

  // Modals & Views
  const [showStory, setShowStory] = useState(false); 
  const [showContact, setShowContact] = useState(false); 
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Authentication
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");

  // Forms & Data
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [transactionId, setTransactionId] = useState("");
  const [billingInfo, setBillingInfo] = useState({ address: "", city: "", state: "", zip: "" });
  
  // Core Business Data
  const [transactions, setTransactions] = useState([]); 
  const [documentHistory, setDocumentHistory] = useState([]);
  const [risks, setRisks] = useState(null);
  const [docType, setDocType] = useState("Non-Disclosure Agreement (NDA)"); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  const getConfig = () => REGIONAL_CONFIG[userLocation] || REGIONAL_CONFIG["Global"];

  // --- INITIALIZATION EFFECTS ---
  useEffect(() => {
    // Initialize PDF Worker safely
    const setWorker = async () => {
        try { pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`; } 
        catch (e) { console.error("PDF Worker Error", e); }
    };
    setWorker();

    // Load User Data
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
        setUser(currentUser);
        const savedBalance = localStorage.getItem(`wallet_${currentUser.email}`);
        setWalletBalance(savedBalance ? parseFloat(savedBalance) : 0);
        const savedTxns = localStorage.getItem(`txns_${currentUser.email}`);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
        // Load history safely
        try { setDocumentHistory(historyService.getDocuments()); } catch(e) {}
    }

    detectUserLocation();

    // Scroll Listener
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const detectUserLocation = async () => {
      try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data && data.country_name) {
              const detectedName = Object.keys(REGIONAL_CONFIG).includes(data.country_name) ? data.country_name : "Global";
              setUserLocation(detectedName);
              if (REGIONAL_CONFIG[data.country_name]) setJurisdiction(data.country_name);
          }
      } catch (e) { console.warn("Location detection failed"); }
  };

  // --- NAVIGATION HELPERS ---
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const goHome = () => { scrollToTop(); setShowStory(false); setShowContact(false); setActiveTab("analyze"); };
  const handleContactSubmit = (e) => { 
      e.preventDefault(); 
      alert("Message sent! We will contact you at " + contactForm.email); 
      setContactForm({name:"",email:"",phone:"",message:""}); 
      setShowContact(false); 
  };

  // --- PAYMENT LOGIC ---
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
      setShowWalletModal(false); setTransactionId("");
  };

  // --- AUTH LOGIC ---
  const openAuth = (view) => { setAuthView(view); setShowAuthModal(true); setAuthError(""); setAuthForm({email:"",password:"",name:"",phone:""}); setOtpInput(""); };

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

  const handleLogout = () => { authService.logout(); setUser(null); setWalletBalance(0); setTransactions([]); };

  // --- AI GENERATION (SAFE MODE) ---
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
      } catch (e) { alert("Error generating draft. Please try again."); console.error(e); } 
      finally { setLoading(false); }
  };

  // --- DOCX DOWNLOAD (CRASH PROOF) ---
  const downloadDocx = (text, name) => {
      try {
          // Using the aliased 'docx' import from 'import * as docx'
          const doc = new docx.Document({
              sections: [{ children: text.split('\n').map(l => new docx.Paragraph({ children: [new docx.TextRun(l)] })) }]
          });
          docx.Packer.toBlob(doc).then(b => saveAs(b, name));
      } catch(e) {
          console.error("DOCX Generation Failed:", e);
          alert("Download failed. Please copy text manually.");
      }
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
        const result = await model.generateContent(`Legal Expert for ${jurisdiction}. Analyze risks. JSON Output: [{title, risk, advice}]. Text: ${extractedText.substring(0, 5000)}`);
        setRisks(JSON.parse(result.response.text().replace(/```json|```/g, '').trim()));
        historyService.saveDocument({ type: "analysis", fileName: file.name, country: jurisdiction, createdAt: new Date().toISOString() });
    } catch (err) { 
        alert("Scan Failed. Credits Refunded."); const c = getConfig(); setWalletBalance(prev => prev + c.cost); 
    } finally { setLoading(false); e.target.value = null; }
  };

  const config = getConfig();

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F0F4F8] selection:bg-blue-100 pb-24 relative cursor-default">
      {/* 3D Cursor */}
      <CustomCursor />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-4 md:px-8 py-4 flex justify-between items-center transition-all">
        <div onClick={goHome} className="flex items-center gap-3 cursor-pointer group">
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
                    <button onClick={() => setShowWalletModal(true)} className="flex items-center gap-0 bg-slate-900 text-white pl-4 pr-1 py-1 rounded-full shadow-lg border border-slate-700 active:scale-95 transition-transform">
                        <Wallet className="w-4 h-4 text-yellow-400 mr-2"/><span className="font-bold text-sm mr-3">{config.symbol}{walletBalance}</span><div className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">+</div>
                    </button>
                    <button onClick={handleLogout} className="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : <button onClick={() => {setAuthView("signup"); setShowAuthModal(true);}} className="bg-blue-600 hover:shadow-lg text-white px-6 py-2.5 rounded-full font-bold transition-transform hover:-translate-y-0.5">Start Free</button>}
        </div>
      </nav>

      {/* VIEW SWITCHING */}
      {showStory ? (
          <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in">
              <button onClick={goHome} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold"><ChevronRight className="w-4 h-4 rotate-180"/> Back</button>
              <div className="text-center mb-16"><h1 className="text-6xl font-black text-slate-900 mb-6">The Unilex Vision</h1><p className="text-2xl text-slate-500 font-medium">Why we built the world's most essential legal brain.</p></div>
              <div className="prose prose-lg prose-slate mx-auto"><p className="text-xl leading-relaxed mb-8">For centuries, high-quality legal intelligence was locked behind the expensive doors of elite law firms.</p><div className="my-12 p-8 bg-blue-50 rounded-3xl border border-blue-100"><h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Globe className="w-6 h-6"/> Uni + Lex</h3><p className="text-blue-800"><strong>Uni</strong>versal Access + <strong>Lex</strong> (Law). We combined military-grade encryption with AI.</p></div></div>
          </div>
      ) : showContact ? (
          <div className="max-w-xl mx-auto px-6 py-20 animate-in fade-in">
              <button onClick={goHome} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold"><ChevronRight className="w-4 h-4 rotate-180"/> Back</button>
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl relative border border-white/50">
                  <div className="text-center mb-6"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8"/></div><h2 className="text-2xl font-black text-slate-900">Contact Us</h2></div>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                      <input type="text" placeholder="Name" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}/>
                      <input type="email" placeholder="Email" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}/>
                      <textarea placeholder="Message" required className="w-full p-4 bg-slate-50 rounded-xl border focus:border-blue-500 h-32" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>
                      <button className="w-full py-4 rounded-xl text-white font-bold bg-slate-900 hover:scale-[1.02] transition-transform">Send</button>
                  </form>
                  <div className="mt-6 pt-6 border-t flex justify-center gap-6 text-slate-400"><div className="flex items-center gap-2"><Mail className="w-5 h-5"/> support@unilexai.com</div></div>
              </div>
          </div>
      ) : (
        /* MAIN DASHBOARD */
        <main className="max-w-6xl mx-auto px-4 mt-12 text-center animate-in fade-in">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6">Universal Legal Intelligence.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Unified & Essential.</span></h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">We are experts in global legal frameworks. Instant Contract Audits and Drafting compliant with <span className="font-bold text-slate-900">{jurisdiction} Law</span>.</p>
            
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
                            <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border border-slate-100 group-hover:scale-110 transition-transform"><Upload className="w-10 h-10 text-blue-600"/></div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Drop Contract</h3>
                            <p className="text-slate-500 mb-6">PDF, DOCX • {config.symbol}{config.cost} / Scan</p>
                            
                            {/* FILE TYPE ICONS */}
                            <div className="flex justify-center gap-4 mb-6">
                                <div className="flex flex-col items-center gap-1 text-slate-400"><FileText className="w-6 h-6"/><span className="text-[10px] font-bold">PDF</span></div>
                                <div className="flex flex-col items-center gap-1 text-slate-400"><FileType className="w-6 h-6"/><span className="text-[10px] font-bold">DOCX</span></div>
                                <div className="flex flex-col items-center gap-1 text-slate-400"><ImageIcon className="w-6 h-6"/><span className="text-[10px] font-bold">IMG</span></div>
                            </div>

                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-sm border group-hover:border-blue-300 transition-colors">
                                <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">Balance</p><p className={`text-lg font-black ${walletBalance > 0 ? "text-green-600" : "text-slate-900"}`}>{config.symbol}{walletBalance}</p></div>
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
                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Type</label><CustomDropdown options={docTypes} value={docType} onChange={setDocType}/></div>
                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Scenario</label><textarea value={userScenario} onChange={e => setUserScenario(e.target.value)} placeholder="Describe details..." className="w-full p-5 bg-white rounded-xl border h-40"></textarea></div>
                        <button onClick={handleCreateDoc} disabled={loading} className="w-full py-4 rounded-xl text-white font-bold bg-slate-900 flex justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform">{loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} Generate ({config.symbol}{config.cost})</button>
                    </div>
                    {generatedDoc && (
                        <div className="mt-10 pt-8 border-t"><div className="flex justify-between mb-4"><h3 className="font-bold">Draft Ready</h3><button onClick={() => downloadDocx(generatedDoc, "Draft.docx")} className="text-blue-600 font-bold flex gap-2"><Download className="w-4 h-4"/> Download</button></div><div className="p-6 bg-white rounded-xl border h-80 overflow-y-auto whitespace-pre-wrap text-xs">{generatedDoc}</div></div>
                    )}
                </div>
            )}

            {activeTab === "transactions" && (
                <div className="max-w-4xl mx-auto">
                    {transactions.length === 0 ? <div className="p-12 text-slate-400 bg-white rounded-2xl border border-dashed"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-20"/>No history.</div> : <div className="grid gap-4">{transactions.map((txn, i) => <div key={i} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center"><div className="text-left"><p className="font-bold text-lg">{txn.description}</p><span className="text-xs text-slate-500">{txn.date} • {txn.id}</span></div><span className="text-xl font-black">{txn.symbol}{txn.amount}</span></div>)}</div>}
                </div>
            )}
        </main>
      )}

      {/* FOOTER */}
      {!showStory && !showContact && (
        <footer className="mt-24 border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-2 text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-8 h-8 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center text-white`}>{!imgError ? <img src={logoImg} alt="Logo" className="w-full h-full object-cover"/> : <Globe className="w-5 h-5"/>}</div>
                            <span className="text-xl font-black text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-medium">Making elite legal intelligence seamless, instant, and accessible to everyone.</p>
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
                            <li><a href={config.payLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-pink-600 font-bold hover:text-pink-700 mt-2"><Heart className="w-4 h-4 fill-current"/> Support Us</a></li>
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

      {/* WALLET MODAL */}
      {showWalletModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative border border-white/50">
                  <button onClick={() => setShowWalletModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  <div className="w-20 h-20 bg-amber-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Coins className="w-10 h-10"/></div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-1">Balance</h3>
                  <h2 className="text-4xl font-black mb-8">{config.symbol}{walletBalance}</h2>
                  <a href={config.payLink} target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 text-white rounded-xl font-bold mb-4 hover:scale-[1.02] transition-transform">Recharge {config.symbol}{config.currency === "INR" ? 100 : 50}</a>
                  <input type="text" placeholder="Transaction ID" className="w-full p-4 rounded-xl border text-center mb-4 focus:border-green-500" onChange={e => setTransactionId(e.target.value)}/>
                  <button onClick={handlePaymentVerify} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:scale-[1.02] transition-transform">Verify</button>
              </div>
          </div>
      )}
    </div>
  );
}

// Wrap App in Error Boundary
export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }