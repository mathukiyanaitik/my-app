// --- CRITICAL FIX: THIS MUST BE THE FIRST LINE ---
window.global = window; 

import React, { useState, useEffect } from 'react';
// 1. YOUR CUSTOM LOGO IMPORT
import logoImg from './assets/logo.png'; 
import { Upload, AlertTriangle, Loader2, Download, Scale, Sparkles, User, LogOut, X, Wallet, Coins, ShieldCheck, PenTool, BrainCircuit, Globe, Zap, Heart, CheckCircle2, Building2, Lock, ChevronRight, Receipt, Printer, History, ArrowUpRight } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
// PDF Worker Fix: Try local, fallback to CDN
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- CONFIGURATION ---
const PRICING = {
    INDIA: {
        CURRENCY: '₹',
        SIGNUP_BONUS: 100,
        COST_PER_ACTION: 15,
        RECHARGE_LINK: "https://razorpay.me/@YOUR_INDIAN_PAYMENT_PAGE" 
    },
    GLOBAL: {
        CURRENCY: '$',
        COST_PER_ACTION: 9.99,
        PAY_LINK: "https://razorpay.me/@YOUR_GLOBAL_PAYMENT_PAGE"
    }
};

const THEME = {
    primary: "from-slate-900 to-slate-800",
    accent: "from-blue-600 to-indigo-600",
};

const countries = [
    { name: "United States", code: "us" }, { name: "India", code: "in" }, { name: "United Kingdom", code: "gb" },
    { name: "Canada", code: "ca" }, { name: "Australia", code: "au" }, { name: "Germany", code: "de" },
    { name: "United Arab Emirates", code: "ae" },
];

const docTypes = ["Non-Disclosure Agreement (NDA)", "Employment Contract", "Freelance Service Agreement", "Rental/Lease Agreement", "SaaS / Software License", "Privacy Policy & TOS", "Last Will and Testament", "Partnership Deed", "Custom Legal Request"];

function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  
  // Location & Wallet
  const [country, setCountry] = useState("India"); 
  const [isIndia, setIsIndia] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Auth
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");

  // Data
  const [documentHistory, setDocumentHistory] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [risks, setRisks] = useState(null);
  const [contractText, setContractText] = useState("");
  const [docType, setDocType] = useState("Non-Disclosure Agreement (NDA)"); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  // Payment UI
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [billingInfo, setBillingInfo] = useState({ address: "", city: "", state: "", zip: "" });

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
        setWalletBalance(savedBalance ? parseInt(savedBalance) : 0);
        
        const savedTxns = localStorage.getItem(`txns_${currentUser.email}`);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
    }

    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
      try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data && data.country_name) {
              const detectedIndia = data.country_code === 'IN';
              setIsIndia(detectedIndia);
              const matchedCountry = countries.find(c => c.name === data.country_name) ? data.country_name : (detectedIndia ? "India" : "United States");
              setCountry(matchedCountry);
          }
      } catch (e) { console.warn("Location detection failed"); }
  };

  const getFlagUrl = (countryName) => {
    const c = countries.find(c => c.name === countryName);
    return c ? `https://flagcdn.com/w40/${c.code}.png` : "";
  };

  // --- NAVIGATION LOGIC ---
  const goHome = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab("analyze");
  };

  // --- RECEIPT GENERATOR (GoDaddy Style) ---
  const generateReceipt = (txn) => {
      const totalAmount = parseFloat(txn.amount);
      const fees = 17.60; 
      const subTotalWithTax = totalAmount - fees;
      const taxRate = 0.18; 
      const baseAmount = (subTotalWithTax / (1 + taxRate)).toFixed(2);
      const taxAmount = (subTotalWithTax - baseAmount).toFixed(2);
      const subTotal = baseAmount; 

      const receiptHTML = `
        <html>
        <head>
          <title>Receipt ${txn.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; padding: 40px; max-width: 800px; mx-auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; }
            .title { font-size: 32px; font-weight: 900; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .label { font-size: 10px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: bold; margin-bottom: 12px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 8px 0; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .right { text-align: right; }
            .totals { width: 40%; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .grand-total { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; font-weight: 900; font-size: 18px; margin-top: 10px; }
            .footer { font-size: 10px; color: #666; margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
             <div class="logo">Unilex AI</div>
             <div class="title">Receipt</div>
          </div>
          
          <div class="grid">
             <div>
                <div class="label">Date</div>
                <div class="value">${txn.date}</div>
                <div class="label">Receipt #</div>
                <div class="value">${txn.id}</div>
                <div class="label">Customer #</div>
                <div class="value">${Math.floor(Math.random() * 90000000) + 10000000}</div>
             </div>
             <div>
                <div class="label">Bill To</div>
                <div class="value">
                   ${user.name.toUpperCase()}<br/>
                   ${txn.billing.address.toUpperCase()}<br/>
                   ${txn.billing.city.toUpperCase()}, ${txn.billing.state.toUpperCase()} ${txn.billing.zip}<br/>
                   ${country}<br/>
                   ${user.phone || "+91.XXXXXXXXXX"}
                </div>
                <div class="label">Payment Method</div>
                <div class="value">Verified Transaction •••• ${txn.txnId.slice(-4)}<br/>${isIndia ? '₹' : '$'}${totalAmount.toFixed(2)}</div>
             </div>
          </div>

          <table>
            <thead>
               <tr>
                  <th>Term</th>
                  <th>Product</th>
                  <th class="right">Amount</th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td>Lifetime</td>
                  <td><b>${txn.description}</b><br/><span style="font-size:10px; color:#666">unilexai.com secure service</span></td>
                  <td class="right">${isIndia ? '₹' : '$'}${subTotal}</td>
               </tr>
            </tbody>
          </table>

          <div class="totals">
             <div class="total-row"><span>Subtotal</span><span>${isIndia ? '₹' : '$'}${subTotal}</span></div>
             <div class="total-row"><span>Taxes (18% GST)</span><span>${isIndia ? '₹' : '$'}${taxAmount}</span></div>
             <div class="total-row"><span>Fees</span><span>${isIndia ? '₹' : '$'}${fees}</span></div>
             <div class="total-row grand-total"><span>Total</span><span>${isIndia ? '₹' : '$'}${totalAmount.toFixed(2)}</span></div>
          </div>

          <div class="footer">
             <p><b>Unilex AI Technologies Pvt Ltd</b></p>
             <p>12th Floor, Tech Park, Cyber City, Gurugram, India 122002</p>
             <p>GSTIN: 9917IND29016OS6</p>
             <p style="margin-top: 10px">Thank you for your business.</p>
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
  };

  // --- WALLET & PAYMENT LOGIC ---
  const processPaymentCheck = () => {
      if (isIndia) {
          if (walletBalance >= PRICING.INDIA.COST_PER_ACTION) {
              const newBalance = walletBalance - PRICING.INDIA.COST_PER_ACTION;
              setWalletBalance(newBalance);
              localStorage.setItem(`wallet_${user.email}`, newBalance);
              return true;
          } else {
              setShowPaymentModal(true); 
              return false;
          }
      } else {
          setShowPaymentModal(true); 
          return false; 
      }
  };

  const handlePaymentVerify = () => {
      if (!transactionId) { alert("Please enter Transaction ID"); return; }
      if (!billingInfo.address || !billingInfo.city) { alert("Please complete Billing Address for Receipt"); return; }
      
      const amount = isIndia ? 100 : PRICING.GLOBAL.COST_PER_ACTION;
      
      if (isIndia) {
          const newBalance = walletBalance + amount;
          setWalletBalance(newBalance);
          if(user) localStorage.setItem(`wallet_${user.email}`, newBalance);
          alert("₹100 Added to Wallet!");
      } else {
          alert("Global Payment Accepted.");
      }

      const newTxn = {
          id: Math.floor(Math.random() * 10000000000).toString(),
          date: new Date().toLocaleDateString('en-GB'),
          amount: amount,
          description: isIndia ? "Wallet Recharge - 100 Credits" : "One-Time Document Process",
          txnId: transactionId,
          billing: { ...billingInfo }
      };

      const updatedTxns = [newTxn, ...transactions];
      setTransactions(updatedTxns);
      if(user) localStorage.setItem(`txns_${user.email}`, JSON.stringify(updatedTxns));
      
      generateReceipt(newTxn);

      setShowPaymentModal(false);
      setTransactionId("");
      setBillingInfo({ address: "", city: "", state: "", zip: "" });
  };

  // --- AUTH HANDLERS ---
  const openAuth = (view) => { 
      setAuthView(view); 
      setShowAuthModal(true); 
      setAuthError("");
      setAuthForm({ email: "", password: "", name: "", phone: "" });
      setOtpInput("");
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (authView === "signup") {
      const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(fakeOtp);
      alert(`[SIMULATION] Verification Code: ${fakeOtp}`);
      setAuthView("otp"); 
    }
    else if (authView === "otp") {
      if (otpInput === generatedOtp) {
        const result = authService.signup(authForm.email, authForm.password, authForm.name, authForm.phone);
        
        if (result.success && result.user) {
          setUser(result.user);
          if (isIndia) {
              setWalletBalance(PRICING.INDIA.SIGNUP_BONUS);
              localStorage.setItem(`wallet_${result.user.email}`, PRICING.INDIA.SIGNUP_BONUS);
          }
          setShowAuthModal(false);
        } else { 
            setAuthError(result.error || "Signup Failed"); 
        }
      } else { setAuthError("Invalid OTP"); }
    }
    else if (authView === "login") {
        const result = authService.login(authForm.email, authForm.password);
        if (result.success) {
            setUser(result.user);
            const saved = localStorage.getItem(`wallet_${result.user.email}`);
            setWalletBalance(saved ? parseInt(saved) : 0);
            
            const savedTxns = localStorage.getItem(`txns_${result.user.email}`);
            setTransactions(savedTxns ? JSON.parse(savedTxns) : []);

            setShowAuthModal(false);
            loadHistory();
        } else { setAuthError(result.error); }
    }
  };

  const handleLogout = () => {
      authService.logout();
      setUser(null);
      setWalletBalance(0);
      setDocumentHistory([]);
      setTransactions([]);
  };

  const loadHistory = () => {
      setDocumentHistory(historyService.getDocuments());
  };

  // --- AI HANDLERS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) { openAuth("signup"); e.target.value = null; return; }
    if (!processPaymentCheck()) { e.target.value = null; return; }

    setLoading(true);
    setRisks(null);
    setContractText("");

    try {
        let extractedText = "";
        if (file.type.includes("pdf")) {
            const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
            for (let i = 1; i <= pdf.numPages; i++) extractedText += (await (await pdf.getPage(i)).getTextContent()).items.map(s => s.str).join(" ");
        } else if (file.type.includes("word")) {
            extractedText = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
        } else {
            extractedText = "Image Scan"; 
        }
        
        setContractText(extractedText);

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = `Unilex AI Legal Expert for ${country}. Strict Analysis. Output JSON: [{title, risk, advice}]. Text: ${extractedText.substring(0, 5000)}`;
        
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
        setRisks(JSON.parse(jsonText));

        historyService.saveDocument({ type: "analysis", fileName: file.name, country, createdAt: new Date().toISOString() });
        loadHistory();

    } catch (err) { 
        alert("Scan Failed. Credits Refunded."); 
        if(isIndia) {
            const refund = walletBalance + PRICING.INDIA.COST_PER_ACTION;
            setWalletBalance(refund);
            localStorage.setItem(`wallet_${user.email}`, refund);
        }
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
          const prompt = `Unilex AI Drafting Engine. Create professional ${docType} for ${country}. Scenario: ${userScenario}. Use Markdown.`;
          const result = await model.generateContent(prompt);
          setGeneratedDoc(result.response.text());
          
          historyService.saveDocument({ type: "generated", docType, country, createdAt: new Date().toISOString() });
          loadHistory();
      } catch (e) { alert("Error generating."); } 
      finally { setLoading(false); }
  };

  const downloadDocx = (text, name) => {
      const doc = new Document({ sections: [{ children: text.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
      Packer.toBlob(doc).then(b => saveAs(b, name));
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F0F4F8] selection:bg-blue-100 pb-24">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-4 md:px-8 py-4 flex justify-between items-center transition-all">
        {/* CLICKABLE LOGO TO HOME */}
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
                {isIndia && <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 tracking-widest uppercase"><Globe className="w-3 h-3"/> India</div>}
            </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                <img src={getFlagUrl(country)} className="w-5 h-3.5 rounded-sm shadow-sm" alt="flag"/>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                    {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
            </div>

            {user ? (
                <div className="flex items-center gap-4">
                    {isIndia && (
                        <div className="flex items-center gap-0 bg-slate-900 text-white pl-4 pr-1 py-1 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700">
                            <Wallet className="w-4 h-4 text-yellow-400 mr-2"/>
                            <span className="font-bold text-sm mr-3">₹{walletBalance}</span>
                            <button onClick={() => setShowPaymentModal(true)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 flex items-center gap-1">
                                ADD <span className="hidden sm:inline">CREDITS</span>
                            </button>
                        </div>
                    )}
                    <button onClick={handleLogout} className="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Logout"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button onClick={() => openAuth("signup")} className={`bg-gradient-to-r ${THEME.accent} hover:shadow-lg hover:shadow-blue-500/30 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:-translate-y-0.5`}>
                        Start Free
                    </button>
                </div>
            )}
        </div>
      </nav>

      {/* HERO */}
      <main className="max-w-6xl mx-auto px-4 mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
              <Zap className="w-3 h-3 fill-current"/> Powered by Gemini 1.5 Pro
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Universal Legal Intelligence. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Unified & Addictive.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              We turned complex law into a simple, addictive superpower. 
              Instant Contract Audits and Drafting tailored for <span className="font-bold text-slate-900">{country}</span>.
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

          {/* MAIN CONTENT AREA */}
          
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
                                
                                {/* RESTORED UPLOAD VISUALS */}
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-200 group-hover:border-blue-300 transition-colors">
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cost / Scan</p>
                                        <p className="text-lg font-black text-slate-900">{isIndia ? `₹${PRICING.INDIA.COST_PER_ACTION}` : `$${PRICING.GLOBAL.COST_PER_ACTION}`}</p>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200"></div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Your Wallet</p>
                                        <p className={`text-lg font-black ${walletBalance > 0 ? "text-green-600" : "text-slate-900"}`}>{isIndia ? `₹${walletBalance}` : "N/A"}</p>
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

          {activeTab === "create" && (
              <div className="relative p-1 rounded-3xl bg-gradient-to-b from-white to-blue-50 shadow-2xl max-w-3xl mx-auto border border-white text-left">
                  <div className="bg-white/60 backdrop-blur-sm rounded-[22px] p-8 md:p-12">
                      <div className="space-y-8">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Select Document Type</label>
                              <div className="relative">
                                  <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full p-4 bg-white rounded-xl font-bold text-slate-800 outline-none border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 appearance-none transition-all">
                                      {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <ChevronRight className="absolute right-4 top-4 w-5 h-5 text-slate-400 rotate-90 pointer-events-none"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Define Parameters</label>
                              <textarea value={userScenario} onChange={e => setUserScenario(e.target.value)} placeholder="Describe your requirement..." className="w-full p-5 bg-white rounded-xl border border-slate-200 shadow-sm h-40 resize-none outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"></textarea>
                          </div>
                          <button onClick={handleCreateDoc} disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl shadow-blue-500/20 bg-gradient-to-r ${THEME.accent} hover:scale-[1.01] transition-all flex items-center justify-center gap-3`}>
                              {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Sparkles className="w-6 h-6"/>}
                              <span>Generate Draft</span>
                              <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-medium">{isIndia ? `₹${PRICING.INDIA.COST_PER_ACTION}` : `$${PRICING.GLOBAL.COST_PER_ACTION}`}</span>
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
          
          {/* --- TRANSACTIONS & BILLING TAB --- */}
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
                                              <span>REF: {txn.txnId}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                                      <span className="text-xl font-black text-slate-900">{isIndia ? '₹' : '$'}{txn.amount}</span>
                                      <button onClick={() => generateReceipt(txn)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors flex items-center gap-2 text-sm font-bold">
                                          <Printer className="w-4 h-4"/> Receipt
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </main>

      {/* FOOTER - THE STORY */}
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
                          {/* NAME IDENTICAL TO TOP */}
                          <span className="text-xl font-black text-slate-900">Unilex<span className="text-blue-600">AI</span></span>
                      </div>
                      
                      {/* THE ADDICTIVE STORY */}
                      <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-medium">
                          <strong className="text-slate-900">Uni</strong>versal + <strong className="text-slate-900">Lex</strong> (Law). 
                          <br/><br/>
                          Born from the belief that justice shouldn't have a price tag. 
                          We combined military-grade encryption with the world's smartest LLMs to build a legal brain that fits in your pocket. 
                          We are making elite legal intelligence addictive, instant, and accessible to 8 billion people.
                      </p>
                  </div>
                  <div className="text-left">
                      <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
                      <ul className="space-y-2 text-sm text-slate-500">
                          <li><button onClick={()=>setActiveTab('analyze')} className="hover:text-blue-600">Contract Audit</button></li>
                          <li><button onClick={()=>setActiveTab('create')} className="hover:text-blue-600">Legal Drafting</button></li>
                      </ul>
                  </div>
                  <div className="text-left">
                      <h4 className="font-bold text-slate-900 mb-4">Company</h4>
                      <ul className="space-y-2 text-sm text-slate-500">
                          <li><a href="#" className="hover:text-blue-600">Our Story</a></li>
                          <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
                          <li><a href={PRICING.GLOBAL.PAY_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-pink-600 font-bold hover:text-pink-700 mt-2">
                                  <Heart className="w-4 h-4 fill-current"/> Support Us
                              </a>
                          </li>
                      </ul>
                  </div>
              </div>
              
              <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                  <p>© 2025 Unilex AI. All rights reserved.</p>
                  <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3"/>
                      <span>Registered Entity • Data Processed Securely via 256-bit SSL</span>
                  </div>
              </div>
          </div>
      </footer>

      {/* --- MODALS (Auth & Payment) --- */}
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
                      
                      <button className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg bg-gradient-to-r ${THEME.primary} hover:scale-[1.02] transition-all`}>
                          {authView === "login" ? "Login" : authView === "signup" ? "Get ₹100 Free" : "Verify"}
                      </button>
                  </form>
                  <div className="mt-6 text-center text-sm">
                      {authView === "login" ? <p className="text-slate-500">New? <button onClick={() => setAuthView("signup")} className="text-blue-600 font-bold hover:underline">Claim Bonus</button></p> : <button onClick={() => setAuthView("login")} className="text-slate-400 font-bold hover:text-slate-600">Back to Login</button>}
                  </div>
              </div>
          </div>
      )}

      {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative border border-white/50">
                  <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Billing Details</h3>
                  <p className="text-slate-500 text-sm mb-6">Required for Tax Invoice generation.</p>
                  
                  <div className="space-y-3 mb-6">
                      <input type="text" placeholder="Street Address" className="w-full p-3 bg-slate-50 rounded-lg text-sm border border-slate-200 outline-none" value={billingInfo.address} onChange={e => setBillingInfo({...billingInfo, address: e.target.value})}/>
                      <div className="flex gap-2">
                        <input type="text" placeholder="City" className="w-1/2 p-3 bg-slate-50 rounded-lg text-sm border border-slate-200 outline-none" value={billingInfo.city} onChange={e => setBillingInfo({...billingInfo, city: e.target.value})}/>
                        <input type="text" placeholder="State" className="w-1/2 p-3 bg-slate-50 rounded-lg text-sm border border-slate-200 outline-none" value={billingInfo.state} onChange={e => setBillingInfo({...billingInfo, state: e.target.value})}/>
                      </div>
                      <input type="text" placeholder="Zip Code" className="w-full p-3 bg-slate-50 rounded-lg text-sm border border-slate-200 outline-none" value={billingInfo.zip} onChange={e => setBillingInfo({...billingInfo, zip: e.target.value})}/>
                  </div>

                  <a href={isIndia ? PRICING.INDIA.RECHARGE_LINK : PRICING.GLOBAL.PAY_LINK} target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl transition-all">
                      {isIndia ? "Add ₹100" : `Pay $${PRICING.GLOBAL.COST_PER_ACTION}`}
                  </a>
                  
                  <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                      <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest"><span className="bg-white px-3 text-slate-300">Verification</span></div>
                  </div>

                  <input type="text" placeholder="Transaction ID" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none text-center text-sm font-mono" value={transactionId} onChange={e => setTransactionId(e.target.value)}/>
                  <button onClick={handlePaymentVerify} className="w-full py-4 mt-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg transition-all">Verify & Get Receipt</button>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;