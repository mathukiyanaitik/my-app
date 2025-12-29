// --- CRITICAL FIX: THIS MUST BE THE FIRST LINE ---
window.global = window; 

import React, { useState, useEffect } from 'react';
import { Upload, AlertTriangle, Loader2, Download, Scale, Sparkles, User, LogOut, X, Wallet, Coins, ShieldCheck, PenTool, BrainCircuit, Globe, Zap } from 'lucide-react';
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

// --- PRICING STRATEGY ---
const PRICING = {
    INDIA: {
        CURRENCY: '₹',
        SIGNUP_BONUS: 100, // ₹100 Free Credit
        COST_PER_ACTION: 15, // ₹15 per Scan/Draft
        RECHARGE_LINK: "https://razorpay.me/@YOUR_INDIAN_PAYMENT_PAGE" 
    },
    GLOBAL: {
        CURRENCY: '$',
        COST_PER_ACTION: 9.99, // $9.99 per doc
        PAY_LINK: "https://razorpay.me/@YOUR_GLOBAL_PAYMENT_PAGE"
    }
};

const BRAND = {
  bg: "#F8FAFC",
  navy: "#0F172A",
  ai_blue: "#2563EB"
};

const countries = [
    { name: "United States", code: "us" }, { name: "India", code: "in" }, { name: "United Kingdom", code: "gb" },
    { name: "Canada", code: "ca" }, { name: "Australia", code: "au" }, { name: "Germany", code: "de" },
    { name: "United Arab Emirates", code: "ae" },
];

function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  
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

  // Core Data
  const [documentHistory, setDocumentHistory] = useState([]);
  const [risks, setRisks] = useState(null);
  const [contractText, setContractText] = useState("");
  const [docType, setDocType] = useState("NDA"); 
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  // Payment UI
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionId, setTransactionId] = useState("");

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
      
      alert("Payment Verified by Unilex AI System.");

      if (isIndia) {
          const newBalance = walletBalance + 100;
          setWalletBalance(newBalance);
          if(user) localStorage.setItem(`wallet_${user.email}`, newBalance);
          alert("₹100 Added to Wallet!");
      } else {
          alert("Payment Accepted. Please click the button again to proceed.");
      }
      
      setShowPaymentModal(false);
      setTransactionId("");
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
      alert(`[SIMULATION] Unilex Verification Code: ${fakeOtp}`);
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
              alert(`Welcome to Unilex AI! ₹${PRICING.INDIA.SIGNUP_BONUS} Free Credit added.`);
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
        const prompt = `Unilex AI Legal Expert for ${country}. Analyze risks in this text. JSON Output: [{title, risk, advice}]. Text: ${extractedText.substring(0, 5000)}`;
        
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
        setRisks(JSON.parse(jsonText));

        historyService.saveDocument({ type: "analysis", fileName: file.name, country, createdAt: new Date().toISOString() });
        loadHistory();

    } catch (err) { 
        alert("Analysis failed. Wallet refunded."); 
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
          const prompt = `Unilex AI Drafting System. Create professional ${docType} for ${country}. Scenario: ${userScenario}. Use Markdown.`;
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
    <div className="min-h-screen font-sans pb-20" style={{ backgroundColor: BRAND.bg }}>
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
            {/* BRANDING: Unilex AI */}
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <BrainCircuit className="w-6 h-6"/>
            </div>
            <div>
                <span className="text-xl font-black text-slate-900 tracking-tight">Unilex AI</span>
                {isIndia && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2 font-bold">INDIA</span>}
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <img src={getFlagUrl(country)} className="w-5 h-3.5 rounded shadow-sm" alt="flag"/>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none">
                    {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
            </div>

            {user ? (
                <div className="flex items-center gap-3">
                    {isIndia && (
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg border border-slate-700">
                            <Wallet className="w-4 h-4 text-yellow-400"/>
                            <span className="font-bold">₹{walletBalance}</span>
                            <button onClick={() => setShowPaymentModal(true)} className="ml-2 text-xs bg-green-500 hover:bg-green-600 px-2 py-1 rounded font-bold transition-colors">ADD +</button>
                        </div>
                    )}
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
                </div>
            ) : (
                <button onClick={() => openAuth("signup")} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-md transition-all">Get Started</button>
            )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 mt-12 text-center">
          {/* HERO SECTION */}
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              Universal Legal Intelligence. <span className="text-blue-600">Unified.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">
              Unilex AI automates your legal operations with next-gen precision.
              {isIndia ? " Start with ₹100 Free Credit." : " Professional legal AI from $9.99/doc."}
          </p>

          <div className="flex justify-center mb-8">
              <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 inline-flex">
                  <button onClick={() => setActiveTab("analyze")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "analyze" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>Audit Contract</button>
                  <button onClick={() => setActiveTab("create")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "create" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>Draft New</button>
                  {user && <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "history" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>History</button>}
              </div>
          </div>

          {activeTab === "analyze" && (
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  
                  {!loading && !risks ? (
                      <div className="py-10">
                          <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload"/>
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><ShieldCheck className="w-10 h-10"/></div>
                              <div>
                                  <h3 className="text-xl font-bold text-slate-800">Scan with Unilex</h3>
                                  <p className="text-slate-500 text-sm mt-1">PDF, DOCX supported • AI Risk Detection</p>
                              </div>
                              <div className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                  Cost: {isIndia ? `₹${PRICING.INDIA.COST_PER_ACTION}` : `$${PRICING.GLOBAL.COST_PER_ACTION}`}
                              </div>
                          </label>
                      </div>
                  ) : loading ? (
                      <div className="py-20 flex flex-col items-center">
                          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4"/>
                          <p className="font-bold text-slate-600">Unilex AI is processing...</p>
                      </div>
                  ) : (
                      <div className="text-left space-y-6">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                              <h3 className="text-xl font-bold text-slate-800">Unilex Report</h3>
                              <button onClick={() => {setRisks(null); setContractText("");}} className="text-sm text-slate-400 hover:text-slate-600">Scan New</button>
                          </div>
                          {risks.map((r, i) => (
                              <div key={i} className={`p-4 rounded-xl border-l-4 ${r.risk === "High" ? "bg-red-50 border-red-500" : "bg-yellow-50 border-yellow-500"}`}>
                                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {r.title}</h4>
                                  <p className="text-sm text-slate-600 mt-1">{r.advice}</p>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {activeTab === "create" && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto text-left">
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Document Type</label>
                          <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none">
                              {["NDA", "Employment Contract", "Rental Agreement", "SLA"].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Requirements</label>
                          <textarea value={userScenario} onChange={e => setUserScenario(e.target.value)} placeholder="E.g. Full time employee, 20LPA salary, Bangalore location..." className="w-full mt-1 p-4 bg-slate-50 rounded-xl h-32 resize-none outline-none"></textarea>
                      </div>
                      <button onClick={handleCreateDoc} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                          Generate via Unilex ({isIndia ? `₹${PRICING.INDIA.COST_PER_ACTION}` : `$${PRICING.GLOBAL.COST_PER_ACTION}`})
                      </button>
                  </div>
                  {generatedDoc && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-slate-800">Draft Ready</h3>
                              <button onClick={() => downloadDocx(generatedDoc, "Unilex_Draft.docx")} className="text-blue-600 font-bold text-sm flex items-center gap-1"><Download className="w-4 h-4"/> Download Word</button>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-600 max-h-60 overflow-y-auto whitespace-pre-wrap">{generatedDoc}</div>
                      </div>
                  )}
              </div>
          )}
          
          {activeTab === "history" && (
              <div className="max-w-2xl mx-auto space-y-3">
                  {documentHistory.length === 0 ? <p className="text-slate-400">No history yet.</p> : documentHistory.map((doc, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                          <div className="text-left">
                              <p className="font-bold text-slate-800">{doc.fileName || doc.docType}</p>
                              <p className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()} • {doc.type.toUpperCase()}</p>
                          </div>
                          <button className="p-2 bg-slate-50 rounded-lg text-slate-400"><Download className="w-4 h-4"/></button>
                      </div>
                  ))}
              </div>
          )}
      </main>

      {/* --- MODALS --- */}
      
      {showAuthModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full relative">
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">{authView === "login" ? "Welcome to Unilex" : "Create Account"}</h2>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authView === "signup" && (
                          <>
                             <input type="text" placeholder="Full Name" required className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})}/>
                             <input type="tel" placeholder="Phone Number" required className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})}/>
                          </>
                      )}
                      {authView !== "otp" && (
                          <>
                              <input type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})}/>
                              <input type="password" placeholder="Password" required className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})}/>
                          </>
                      )}
                      {authView === "otp" && <input type="text" placeholder="Enter OTP" className="w-full p-3 bg-slate-50 rounded-xl text-center text-xl tracking-widest font-bold outline-none border border-slate-200" value={otpInput} onChange={e => setOtpInput(e.target.value)}/>}
                      
                      {authError && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">{authError}</p>}
                      
                      <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
                          {authView === "login" ? "Login" : authView === "signup" ? "Claim ₹100 Free Credit" : "Verify & Start"}
                      </button>
                  </form>
                  <div className="mt-4 text-center text-sm text-slate-500">
                      {authView === "login" ? <button type="button" onClick={() => setAuthView("signup")} className="text-blue-600 font-bold hover:underline">New? Claim Bonus</button> : <button type="button" onClick={() => setAuthView("login")} className="hover:text-slate-800">Have an account? Login</button>}
                  </div>
              </div>
          </div>
      )}

      {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative">
                  <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><Coins className="w-8 h-8"/></div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{isIndia ? "Unilex Wallet" : "One-Time Payment"}</h3>
                  <p className="text-slate-500 text-sm mb-6">
                      {isIndia ? "Add credits to continue." : "Secure global payment gateway."}
                  </p>
                  
                  <div className="space-y-4">
                      <a 
                        href={isIndia ? PRICING.INDIA.RECHARGE_LINK : PRICING.GLOBAL.PAY_LINK} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
                      >
                          {isIndia ? "Pay ₹100 via UPI/Card" : `Pay $${PRICING.GLOBAL.COST_PER_ACTION} via Card`}
                      </a>
                      
                      <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Then</span></div>
                      </div>

                      <input type="text" placeholder="Enter Transaction ID" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-center text-sm font-mono" value={transactionId} onChange={e => setTransactionId(e.target.value)}/>
                      <button onClick={handlePaymentVerify} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-md">Verify & Proceed</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;