// --- CRITICAL FIX: THIS MUST BE THE FIRST LINE ---
window.global = window; 

import React, { useState, useEffect } from 'react';
// 1. IMPORT THE IMAGE DIRECTLY HERE:
import logoImg from './assets/logo.png'; 
import { Upload, FileText, AlertTriangle, Loader2, Download, ChevronDown, ShieldAlert, PenTool, Scale, Gavel, Sparkles, Image as ImageIcon, CheckCircle, XCircle, User, LogOut, History, CreditCard, X, Mail, Lock, Crown, Phone, ArrowRight, Heart, QrCode, ShieldCheck, Globe, Smartphone, Landmark } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
// PDF Worker Fix: Try local, fallback to CDN
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { authService } from './utils/auth';
import { historyService } from './utils/history';

// 🔒 SECURE MODE: Reads only from the .env file
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- BRAND PALETTE DEFINITION ---
const BRAND = {
  navy: "#1B2631",       // Primary Brand Color (Deep, Professional)
  slate: "#63707E",      // Secondary Text/Icons (Sophisticated Grey-Blue)
  accent: "#2563EB",     // Bright professional blue
  bg: "#F4F6F8",         // Ghost White Background
  white: "#FFFFFF",      // Pure White containers
  wiseGreen: "#9FE870",  // Wise Brand Green
  wiseDark: "#16335B"    // Wise Brand Dark Blue
};

// --- LEGAL CONTEXT DEFINITIONS ---
const legalContext = {
  "United States": "Focus on Uniform Commercial Code (UCC) for sales, and state-specific common law for services. highlight governing law clauses.",
  "India": "Ensure strict compliance with the Indian Contract Act, 1872, Information Technology Act, 2000, and specific stamp duty requirements.",
  "United Kingdom": "Apply English Common Law principles, Rights of Third Parties Act 1999, and GDPR (UK) data privacy standards.",
  "Canada": "Apply Canadian Common Law (excluding Quebec Civil Code unless specified) and PIPEDA for privacy.",
  "Australia": "Apply Australian Consumer Law (ACL) regarding unfair contract terms and the Privacy Act 1988.",
  "Germany": "Strictly adhere to the Bürgerliches Gesetzbuch (BGB), specifically AGB-Recht (General Terms & Conditions) and GDPR.",
  "United Arab Emirates": "Apply UAE Civil Code (Federal Law No. 5 of 1985) and relevant Federal Decree-Laws regarding commercial transactions.",
};

// --- PAYMENT CONFIGURATION (Your Single Account Links) ---
const PAYMENT_LINKS = {
    INDIA: "https://razorpay.me/@YOUR_INDIAN_LINK", // Configure this in Razorpay Dashboard
    GLOBAL: "https://razorpay.me/@YOUR_GLOBAL_LINK" // Enable International Payments in Razorpay
};

function App() {
  const [activeTab, setActiveTab] = useState("analyze"); 
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  
  // --- 1. SMART LOCATION & COUNTRY STATE ---
  const [country, setCountry] = useState("United States"); 
  const [userLocation, setUserLocation] = useState({ code: 'US', currency: '$', symbol: '$' });

  // Load saved preference or detect location on first load
  useEffect(() => {
    const savedCountry = localStorage.getItem("user_selected_country");
    if (savedCountry) {
        setCountry(savedCountry);
        detectUserLocation(); 
    } else {
        detectUserLocation(true); 
    }
  }, []);

  // Location Detection Service
  const detectUserLocation = async (updateDropdown = false) => {
      try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          
          if (data && data.country_name) {
              const isIndia = data.country_code === 'IN';
              
              setUserLocation({
                  code: data.country_code,
                  currency: isIndia ? 'INR' : 'USD',
                  symbol: isIndia ? '₹' : '$',
                  isIndia: isIndia
              });

              if (updateDropdown) {
                  const matchedCountry = countries.find(c => c.name === data.country_name) ? data.country_name : "United States";
                  setCountry(matchedCountry);
                  localStorage.setItem("user_selected_country", matchedCountry);
              }
          }
      } catch (error) {
          console.warn("Location detection failed, using defaults.");
      }
  };

  const handleCountryChange = (e) => {
      const newCountry = e.target.value;
      setCountry(newCountry);
      localStorage.setItem("user_selected_country", newCountry);
  };

  // Auth State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState("login"); 
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "", confirmPassword: "" });
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // History State
  const [documentHistory, setDocumentHistory] = useState([]);
  
  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false); 
  const [transactionId, setTransactionId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi"); // Default to UPI

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Analyze State
  const [risks, setRisks] = useState(null);
  const [contractText, setContractText] = useState("");
  const [safeVersion, setSafeVersion] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");

  // Create/Generate State
  const [docType, setDocType] = useState("Non-Disclosure Agreement (NDA)");
  const [userScenario, setUserScenario] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");

  const countries = [
    { name: "United States", code: "us" },
    { name: "India", code: "in" },
    { name: "United Kingdom", code: "gb" },
    { name: "Canada", code: "ca" },
    { name: "Australia", code: "au" },
    { name: "Germany", code: "de" },
    { name: "United Arab Emirates", code: "ae" },
  ];

  const docTypes = [
    "Non-Disclosure Agreement (NDA)",
    "Freelance Service Agreement",
    "Employment Offer Letter",
    "Rental/Lease Agreement",
    "Last Will and Testament",
    "Privacy Policy / Terms of Service",
    "Cease and Desist Letter",
    "Custom Request"
  ];

  const getFlagUrl = (countryName) => {
    const c = countries.find(c => c.name === countryName);
    return c ? `https://flagcdn.com/w40/${c.code}.png` : "";
  };

  // --- WORKER INITIALIZATION ---
  useEffect(() => {
    const setWorker = async () => {
        try {
            if (pdfWorker) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
            } else {
                throw new Error("Local worker not found");
            }
        } catch (e) {
            console.warn("Switching to CDN for PDF Worker");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
    };
    setWorker();
  }, []);

  // Load user on mount and load history
  useEffect(() => {
    try {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          loadHistory();
        }
    } catch (e) { console.error("Auth load error:", e); }
  }, []);

  const loadHistory = () => {
    try {
        const history = historyService.getDocuments();
        setDocumentHistory(history);
    } catch (e) { console.error("History load error", e); }
  };

  // --- AUTH HANDLERS ---
  const openAuth = (view = "login") => {
    setAuthView(view);
    setShowAuthModal(true);
    setAuthError("");
    setAuthSuccessMsg("");
    setAuthForm({ email: "", password: "", name: "", phone: "", confirmPassword: "" });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");

    if (authView === "signup") {
      if (!authForm.name || !authForm.email || !authForm.phone || !authForm.password) {
        setAuthError("All fields are required");
        return;
      }
      const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(fakeOtp);
      alert(`[SIMULATION] Your verification OTP is: ${fakeOtp}`);
      setAuthView("otp"); 
    }
    else if (authView === "otp") {
      if (otpInput === generatedOtp) {
        const result = authService.signup(authForm.email, authForm.password, authForm.name, authForm.phone);
        if (result.success) {
          setUser(result.user);
          setShowAuthModal(false);
          loadHistory();
          alert("Account verified and created successfully!");
        } else {
          setAuthError(result.error);
        }
      } else {
        setAuthError("Invalid OTP. Please try again.");
      }
    }
    else if (authView === "login") {
      // --- ADMIN BACKDOOR ---
      if (authForm.email === "admin@legallens.com" && authForm.password === "admin123") {
          const adminUser = {
              id: "admin_001",
              name: "Admin User",
              email: "admin@legallens.com",
              subscription: { plan: "premium", limit: Infinity }
          };
          localStorage.setItem("currentUser", JSON.stringify(adminUser));
          setUser(adminUser);
          setShowAuthModal(false);
          loadHistory();
          alert("Logged in as Admin (Unlimited Access)");
          return;
      }
      
      const result = authService.login(authForm.email, authForm.password);
      if (result.success) {
        setUser(result.user);
        setShowAuthModal(false);
        loadHistory();
      } else {
        setAuthError(result.error);
      }
    }
    else if (authView === "forgot-password") {
        if(!authForm.email) { setAuthError("Email is required"); return; }
        alert(`[SIMULATION] Password reset link sent to ${authForm.email}`);
        setAuthView("reset-password");
    }
    else if (authView === "reset-password") {
        if(authForm.password !== authForm.confirmPassword) {
            setAuthError("Passwords do not match");
            return;
        }
        const result = authService.resetPassword(authForm.email, authForm.password);
        if(result.success) {
            alert("Password updated! Please login.");
            setAuthView("login");
        } else {
            setAuthError(result.error);
        }
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setDocumentHistory([]);
    setRisks(null);
    setSafeVersion("");
    setGeneratedDoc("");
    setActiveTab("analyze");
  };

  // 📊 SMART PROGRESS BAR
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95; 
          const increment = prev < 50 ? 5 : prev < 80 ? 2 : 1;
          return prev + increment;
        });
      }, 200); 
    } else {
      setProgress(100); 
      setTimeout(() => setProgress(0), 1000); 
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const downloadDocx = (textToDownload, filename) => {
    if (!textToDownload) return;
    try {
      const lines = textToDownload.split('\n');
      const docChildren = [];
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return; 
        if (cleanLine.startsWith('# ')) {
          docChildren.push(new Paragraph({ text: cleanLine.replace('# ', '').toUpperCase(), heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 }, run: { font: "Times New Roman", bold: true, size: 28, color: "000000" } }));
        } else if (cleanLine.startsWith('## ')) {
          docChildren.push(new Paragraph({ text: cleanLine.replace('## ', ''), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.LEFT, spacing: { before: 300, after: 100 }, run: { font: "Times New Roman", bold: true, size: 24, color: "000000" } }));
        } else {
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g); 
          const textRuns = parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) return new TextRun({ text: part.replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 24 });
            return new TextRun({ text: part, font: "Times New Roman", size: 24 });
          });
          docChildren.push(new Paragraph({ children: textRuns, alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } }));
        }
      });
      const doc = new Document({ sections: [{ properties: {}, children: docChildren }], styles: { default: { document: { run: { font: "Times New Roman", size: 24, color: "000000" } } } } });
      Packer.toBlob(doc).then(blob => saveAs(blob, filename));
    } catch (err) { alert("Error creating Word Doc: " + err.message); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const usageCheck = authService.checkUsageLimit(user);
        if (!usageCheck.allowed) {
            if(!user) {
                if(window.confirm(usageCheck.reason)) { openAuth("signup"); }
            } else {
                alert(usageCheck.reason);
                setShowPaymentModal(true);
            }
            e.target.value = null; 
            return;
        }
    } catch (err) { console.error("Auth Check Failed:", err); }

    setFileName(file.name);
    setFileType(file.type);
    setLoading(true);
    setRisks(null);
    setSafeVersion("");
    setContractText("");

    try {
      let extractedText = "";
      let imagePart = null;

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map(item => item.str).join(" ");
        }
      } 
      else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      }
      else if (file.type.startsWith("image/")) {
        imagePart = await fileToGenerativePart(file);
        extractedText = "Image Uploaded"; 
      }

      setContractText(extractedText);

      if (!API_KEY) {
        alert("Security Alert: API Key missing! Check .env file.");
        setLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const specificLaw = legalContext[country] || "Apply standard international legal principles.";

      let prompt = `Today is ${currentDate}. You are a top legal expert in ${country} Law. 
      CRITICAL LEGAL CONTEXT: ${specificLaw}
      
      Analyze this uploaded legal document.
      Task:
      1. Identify document type.
      2. Identify 3 distinct legal risks/ambiguities based on ${country} law.
      Output ONLY a raw JSON array.
      Format: [{ "title": "Legal Issue", "risk": "High", "advice": "Advice citing ${country} law" }]
      Document Text: ${extractedText}`;

      const result = await model.generateContent(imagePart ? [prompt, imagePart] : prompt);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedRisks = JSON.parse(responseText);
      setRisks(parsedRisks);

      try {
          authService.incrementUsage();
          if(user) {
            historyService.saveDocument({
                type: "analysis",
                fileName: file.name,
                country,
                risks: parsedRisks,
                contractText: extractedText,
                createdAt: new Date().toISOString()
            });
            loadHistory();
          }
      } catch(e) { console.error("Save/Increment failed", e); }

    } catch (error) {
      alert("Error: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
      e.target.value = null; 
    }
  };

  const handleFixIt = async () => {
    if (!contractText && !fileType.startsWith("image/")) return;
    
    if (!user) {
      if(window.confirm("You must be logged in to save fixed documents. Login now?")) { openAuth("login"); }
      return;
    }

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const specificLaw = legalContext[country] || "Standard principles";
      const fixPrompt = `Professional legal editor for ${country}. Date: ${currentDate}.
      CRITICAL CONTEXT: ${specificLaw}.
      Rewrite this document to be legally solid, fair, and compliant with ${country} regulations.
      Use # Title, ## Headings, **bold** terms. Times New Roman style.
      Return ONLY Markdown.`;
      
      const result = await model.generateContent([fixPrompt, contractText]);
      const fixedVersion = result.response.text();
      setSafeVersion(fixedVersion);

      historyService.saveDocument({
        type: "fixed",
        fileName: fileName || "Document",
        country,
        safeVersion: fixedVersion,
        originalText: contractText,
        createdAt: new Date().toISOString()
      });
      loadHistory();

    } catch (error) { alert("Could not generate safe version."); } finally { setLoading(false); }
  };

  const handleCreateDoc = async () => {
    if (!userScenario) return;

    try {
        const usageCheck = authService.checkUsageLimit(user);
        if (!usageCheck.allowed) {
            if(!user) {
                if(window.confirm(usageCheck.reason)) { openAuth("signup"); }
            } else {
                alert(usageCheck.reason);
                setShowPaymentModal(true);
            }
            return;
        }
    } catch (err) { console.error("Auth check failed", err); }

    setLoading(true);
    setGeneratedDoc("");
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const specificLaw = legalContext[country] || "Standard principles";
      const prompt = `Top lawyer in ${country}. Create professional ${docType}. Date: ${currentDate}.
      CRITICAL CONTEXT: ${specificLaw}.
      Scenario: "${userScenario}". 
      Use # Title, ## Headings, **bold** terms. Standard clauses for ${country}.
      Output only Markdown.`;
      
      const result = await model.generateContent(prompt);
      const generated = result.response.text();
      setGeneratedDoc(generated);

      authService.incrementUsage();

      if(user) {
        historyService.saveDocument({
            type: "generated",
            docType,
            country,
            generatedDoc: generated,
            scenario: userScenario,
            createdAt: new Date().toISOString()
        });
        loadHistory();
      }

    } catch (error) { alert("Error generating document."); } finally { setLoading(false); }
  };

  // --- PAYMENT HANDLER (MANUAL) ---
  const handleVerifyPayment = () => {
      if (!transactionId.trim()) {
          alert("Please enter the Transaction ID.");
          return;
      }
      alert("Payment Verification Pending. For this demo, we are upgrading you instantly!");
      if (user) {
          authService.updateSubscription('premium');
          setUser(authService.getCurrentUser());
          setShowPaymentModal(false);
      } else {
          openAuth("login");
      }
  };

  // --- STYLES ---
  const containerShadow = "shadow-[0_8px_30px_rgb(0,0,0,0.08)]"; 
  const primaryButtonGradient = `bg-gradient-to-br from-[#1B2631] to-[#2C3E50] hover:from-[#2563EB] hover:to-[#1B2631]`;

  // --- DYNAMIC PAYMENT DATA ---
  const planPrice = userLocation.isIndia ? "₹849" : "$9.99";
  const payLink = userLocation.isIndia ? PAYMENT_LINKS.INDIA : PAYMENT_LINKS.GLOBAL;

  return (
    <div className="min-h-screen font-sans pb-32" style={{ backgroundColor: BRAND.bg, '--tw-selection-color': BRAND.white, '--tw-selection-bg': BRAND.slate }}>
      
      {/* NAVBAR */}
      <nav className="w-full p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 overflow-hidden rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm relative group">
             <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity"></div>
             {!imgError ? (
               <img src={logoImg} alt="Legal Lens" className="w-full h-full object-cover relative z-10" onError={() => setImgError(true)} />
             ) : (
               <div className="w-full h-full flex items-center justify-center relative z-10" style={{ backgroundColor: BRAND.navy }}>
                  <Scale className="w-6 h-6 text-white" />
               </div>
             )}
          </div>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: BRAND.navy }}>Legal Lens</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold hidden sm:block" style={{ color: BRAND.slate }}>Jurisdiction:</span>
          <div className="relative group">
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group-hover:bg-blue-50/50">
              <img src={getFlagUrl(country)} alt={country} className="w-6 h-4 rounded object-cover shadow-sm" />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent text-sm font-bold outline-none border-none cursor-pointer appearance-none pr-8 z-10 relative" style={{ color: BRAND.navy, WebkitAppearance: 'none', MozAppearance: 'none' }}>
                {countries.map((c) => <option key={c.name} value={c.name} className="text-black">{c.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 pointer-events-none transition-transform group-hover:rotate-180" style={{ color: BRAND.accent }} />
            </div>
          </div>

          {/* USER MENU */}
          {user ? (
            <div className="flex items-center gap-3">
              {user.subscription?.plan === 'premium' && (
                <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-white text-xs font-bold">
                  <Crown className="w-3 h-3" /> Premium
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full hover:border-blue-300 hover:shadow-md transition-all">
                <User className="w-4 h-4" style={{ color: BRAND.navy }} />
                <span className="text-sm font-bold" style={{ color: BRAND.navy }}>{user.name}</span>
              </div>
              <button onClick={handleLogout} className="p-2 bg-white border border-slate-200 rounded-full hover:border-red-300 hover:bg-red-50 transition-all" title="Logout">
                <LogOut className="w-4 h-4" style={{ color: BRAND.slate }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => openAuth("login")} className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:shadow-md" style={{ color: BRAND.navy, backgroundColor: BRAND.white, border: `1px solid ${BRAND.slate}` }}>Login</button>
              <button onClick={() => openAuth("signup")} className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:shadow-md" style={{ backgroundColor: BRAND.accent }}>Sign Up</button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto mt-16 px-6 flex flex-col items-center text-center">
        
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight" style={{ color: BRAND.navy }}>Your AI Legal Assistant.</h1>
        <p className="text-xl mb-12 max-w-2xl font-medium leading-relaxed" style={{ color: BRAND.slate }}>
          Review documents for risks or generate new legal agreements instantly, tailored to {country} law.
        </p>

        {/* TAB SWITCHER */}
        <div className="flex p-2 bg-white rounded-full mb-16 shadow-md border border-slate-100 relative">
          <button onClick={() => setActiveTab("analyze")} className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === "analyze" ? "text-white shadow-md" : "hover:bg-slate-50"}`} style={{ backgroundColor: activeTab === "analyze" ? BRAND.accent : 'transparent', color: activeTab === "analyze" ? BRAND.white : BRAND.slate }}>
            <ShieldAlert className="w-5 h-5" /> Audit
          </button>
          <button onClick={() => setActiveTab("create")} className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === "create" ? "text-white shadow-md" : "hover:bg-slate-50"}`} style={{ backgroundColor: activeTab === "create" ? BRAND.accent : 'transparent', color: activeTab === "create" ? BRAND.white : BRAND.slate }}>
            <PenTool className="w-5 h-5" /> Create
          </button>
          <button onClick={() => { if(user) { setActiveTab("history") } else { alert("Please login to view history."); openAuth("login"); }}} className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === "history" ? "text-white shadow-md" : "hover:bg-slate-50"}`} style={{ backgroundColor: activeTab === "history" ? BRAND.accent : 'transparent', color: activeTab === "history" ? BRAND.white : BRAND.slate }}>
            <History className="w-5 h-5" /> History
            {!user && <Lock className="w-3 h-3 ml-1" />}
          </button>
        </div>

        {/* ==================== TAB 1: ANALYZE ==================== */}
        {activeTab === "analyze" && (
             <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* UPLOAD BOX WITH RESTORED DECORATIONS */}
                <div className={`w-full max-w-2xl mx-auto bg-white border-3 border-dashed p-12 rounded-[2.5rem] relative group transition-all duration-300 cursor-pointer overflow-hidden ${containerShadow}`} style={{ borderColor: loading ? BRAND.accent : (imgError ? BRAND.slate : '#E2E8F0'), backgroundColor: BRAND.white }}>
                    <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                    <input type="file" accept=".pdf, .docx, .png, .jpg, .jpeg" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="relative">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 group-hover:bg-blue-100 transition-all duration-300 shadow-sm border border-slate-100 group-hover:border-blue-200">
                                {loading ? <Loader2 className="w-10 h-10 animate-spin" style={{ color: BRAND.accent }} /> : <Upload className="w-10 h-10 transition-colors group-hover:text-blue-600" style={{ color: BRAND.navy }} />}
                            </div>
                            {/* RESTORED FLOATING ICONS */}
                            {!loading && (
                                <>
                                <div className="absolute -right-5 top-0 bg-white p-3 rounded-xl shadow-md border border-slate-100 rotate-12 group-hover:rotate-6 transition-transform z-20 pointer-events-none">
                                    <FileText className="w-5 h-5" style={{ color: BRAND.accent }}/>
                                </div>
                                <div className="absolute -left-5 bottom-0 bg-white p-3 rounded-xl shadow-md border border-slate-100 -rotate-12 group-hover:-rotate-6 transition-transform z-20 pointer-events-none">
                                    <ImageIcon className="w-5 h-5" style={{ color: BRAND.slate }}/>
                                </div>
                                </>
                            )}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold transition-colors group-hover:text-blue-600" style={{ color: BRAND.navy }}>{loading ? `Analyzing for ${country}...` : "Click or Drop to Upload"}</h3>
                            {loading && <p className="font-bold mt-3 text-sm" style={{ color: BRAND.accent }}>{progress}% Complete</p>}
                            {!loading && (
                                <div className="flex items-center justify-center gap-3 mt-4">
                                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg uppercase">PDF</span>
                                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg uppercase">DOCX</span>
                                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg uppercase">IMG</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RISKS & SAFE VERSION - Display Logic */}
                {risks && Array.isArray(risks) && (
                    <div className="mt-12 w-full max-w-4xl mx-auto space-y-6">
                        {/* RESTORED RISK COUNTER BOX */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
                            <h2 className="text-3xl font-bold text-left" style={{ color: BRAND.navy }}>Risk Analysis</h2>
                            <div className="flex items-center gap-2 px-5 py-3 rounded-xl shadow-sm border" style={{ backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }}>
                                <AlertTriangle className="w-6 h-6 text-rose-600"/>
                                <span className="font-extrabold text-rose-700 text-lg">{risks.length} Issues Detected</span>
                            </div>
                        </div>

                        {risks.map((risk, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl shadow-md border-l-4 text-left" style={{ borderLeftColor: risk.risk === "High" ? "#EF4444" : risk.risk === "Medium" ? "#F59E0B" : "#10B981" }}>
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: risk.risk === "High" ? "#EF4444" : risk.risk === "Medium" ? "#F59E0B" : "#10B981" }} />
                                    <div>
                                        <h3 className="text-xl font-bold mb-2" style={{ color: BRAND.navy }}>{risk.title}</h3>
                                        <p className="text-base" style={{ color: BRAND.slate }}>{risk.advice}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {contractText && (
                            <button onClick={handleFixIt} disabled={loading} className={`mt-8 px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all ${primaryButtonGradient} disabled:opacity-50 flex items-center gap-3 mx-auto`}>
                                <Sparkles className="w-5 h-5" /> Fix Document with AI
                            </button>
                        )}
                    </div>
                )}

                {safeVersion && (
                    <div className="mt-12 w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
                         <div className="flex items-center justify-between mb-6">
                             <h2 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Fixed Version</h2>
                             <button onClick={() => downloadDocx(safeVersion, "Fixed_Doc.docx")} className="px-5 py-2 rounded-lg font-bold text-white shadow-md flex items-center gap-2" style={{ backgroundColor: BRAND.accent }}><Download className="w-4 h-4" /> Download</button>
                         </div>
                         <div className="prose max-w-none text-left p-6 bg-slate-50 rounded-xl border border-slate-200 overflow-y-auto max-h-96">
                             <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" style={{ color: BRAND.navy }}>{safeVersion}</pre>
                         </div>
                    </div>
                )}
             </div>
        )}

        {/* ==================== TAB 2: CREATE ==================== */}
        {activeTab === "create" && (
             <div className="w-full max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                 <h2 className="text-3xl font-bold mb-6 text-left" style={{ color: BRAND.navy }}>Draft a Document</h2>
                 <div className="space-y-6 text-left">
                     <div>
                         <label className="block text-sm font-bold mb-2" style={{ color: BRAND.slate }}>TYPE</label>
                         <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold" style={{ color: BRAND.navy }}>{docTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-2" style={{ color: BRAND.slate }}>SCENARIO</label>
                         <textarea value={userScenario} onChange={(e) => setUserScenario(e.target.value)} placeholder="Describe the parties, terms, and conditions..." className="w-full p-4 rounded-xl border border-slate-200 h-32 resize-none outline-none" style={{ color: BRAND.navy }}></textarea>
                     </div>
                     
                     {/* PROGRESS BUTTON */}
                     <button onClick={handleCreateDoc} disabled={loading || !userScenario} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${primaryButtonGradient} relative overflow-hidden`}>
                         {loading && (
                             <div className="absolute inset-0 bg-white/20 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                         )}
                         <div className="relative z-10 flex items-center justify-center gap-2">
                             {loading ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" /> 
                                  Drafting... {progress}%
                                </>
                             ) : (
                                <>
                                  <Gavel className="w-5 h-5" /> Generate Document
                                </>
                             )}
                         </div>
                     </button>
                 </div>
                 {generatedDoc && (
                     <div className="mt-8 pt-8 border-t border-slate-200 text-left">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-xl font-bold" style={{ color: BRAND.navy }}>Draft Ready</h3>
                             <button onClick={() => downloadDocx(generatedDoc, "Draft.docx")} className="text-sm font-bold text-blue-600 hover:underline">Download Word Doc</button>
                         </div>
                         <div className="p-6 bg-slate-50 rounded-xl max-h-80 overflow-y-auto"><pre className="whitespace-pre-wrap text-sm">{generatedDoc}</pre></div>
                     </div>
                 )}
             </div>
        )}
        
        {/* ==================== TAB 3: HISTORY ==================== */}
        {activeTab === "history" && user && (
            <div className="w-full max-w-4xl mx-auto">
                {documentHistory.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-lg"><p className="font-bold text-slate-400">No history found.</p></div>
                ) : (
                    <div className="space-y-4">
                        {documentHistory.map((doc, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                                <div className="text-left">
                                    <h4 className="font-bold text-lg" style={{ color: BRAND.navy }}>{doc.fileName || doc.docType || "Document"}</h4>
                                    <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleString()} • {doc.type.toUpperCase()}</p>
                                </div>
                                <button onClick={() => downloadDocx(doc.safeVersion || doc.generatedDoc || doc.contractText, "History_Doc.docx")} className="p-2 hover:bg-slate-50 rounded-full"><Download className="w-5 h-5 text-slate-400"/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* RESTORED DISCLAIMER (Always Visible above footer) */}
        <div className="mt-20 border-t border-slate-200 pt-8 pb-12 max-w-4xl mx-auto text-center px-6">
            <div className="flex items-center justify-center gap-2 mb-3" style={{ color: BRAND.slate }}>
                <ShieldAlert className="w-5 h-5" />
                <span className="text-sm font-extrabold uppercase tracking-wider">Important Legal Disclaimer</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Legal Lens uses Artificial Intelligence to generate information. It is <strong>not a law firm or a substitute for an attorney</strong>. 
                Laws vary significantly by jurisdiction ({country}) and change frequently. You should strictly review all generated documents and analysis with a qualified legal professional before executing them. Use at your own risk.
            </p>
        </div>

      </main>

      {/* DONATION FOOTER - DYNAMIC */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
         <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
             <p className="text-sm text-slate-500">© 2025 Legal Lens. AI Legal Assistant.</p>
             <div className="flex items-center gap-4">
                 <span className="text-sm font-semibold" style={{ color: BRAND.navy }}>Find this helpful?</span>
                 {/* DYNAMIC PAYMENT LINK */}
                 <a href={payLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-full font-bold text-white flex items-center gap-2 shadow-md hover:-translate-y-0.5 transition-transform" style={{ backgroundColor: BRAND.wiseDark }}>
                     <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: BRAND.wiseGreen }}><ArrowRight className="w-3 h-3 text-black" /></div>
                     Donate via Cards/UPI
                 </a>
             </div>
         </div>
      </footer>

      {/* MULTI-STEP AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: BRAND.navy }}>
                    {authView === "login" ? "Welcome Back" : authView === "signup" ? "Create Account" : authView === "otp" ? "Verify Phone" : "Reset Password"}
                </h2>
                <button onClick={() => setShowAuthModal(false)}><X className="w-6 h-6 text-slate-400"/></button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* SIGNUP FIELDS */}
                {authView === "signup" && (
                    <>
                        <div className="relative"><User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/><input type="text" placeholder="Full Name" required className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} /></div>
                        <div className="relative"><Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/><input type="tel" placeholder="Phone Number" required className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} /></div>
                    </>
                )}

                {/* EMAIL & PASSWORD (Common) */}
                {(authView === "login" || authView === "signup" || authView === "forgot-password") && (
                     <div className="relative"><Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/><input type="email" placeholder="Email Address" required className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} /></div>
                )}

                {(authView === "login" || authView === "signup" || authView === "reset-password") && (
                     <div className="relative"><Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/><input type="password" placeholder="Password" required className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} /></div>
                )}

                {authView === "reset-password" && (
                     <div className="relative"><Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/><input type="password" placeholder="Confirm Password" required className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500" value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})} /></div>
                )}

                {/* OTP FIELD */}
                {authView === "otp" && (
                    <div className="text-center">
                        <p className="mb-4 text-sm text-slate-500">We sent a code to {authForm.phone}</p>
                        <input type="text" placeholder="Enter 4-digit OTP" maxLength={4} className="w-full text-center text-2xl tracking-widest p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono" value={otpInput} onChange={e => setOtpInput(e.target.value)} />
                    </div>
                )}

                {authError && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg">{authError}</p>}

                <button type="submit" className="w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: BRAND.accent }}>
                    {authView === "login" ? "Login" : authView === "signup" ? "Send OTP" : authView === "otp" ? "Verify & Create" : authView === "forgot-password" ? "Send Reset Link" : "Update Password"}
                </button>

                {/* LINKS */}
                <div className="text-center space-y-2 mt-4">
                    {authView === "login" && (
                        <>
                            <button type="button" onClick={() => setAuthView("forgot-password")} className="text-xs font-bold text-slate-400 hover:text-blue-500 block w-full">Forgot Password?</button>
                            <p className="text-sm">Don't have an account? <button type="button" onClick={() => setAuthView("signup")} className="font-bold text-blue-600">Sign Up</button></p>
                        </>
                    )}
                    {authView === "signup" && <p className="text-sm">Already have an account? <button type="button" onClick={() => setAuthView("login")} className="font-bold text-blue-600">Login</button></p>}
                    {(authView === "forgot-password" || authView === "otp") && <button type="button" onClick={() => setAuthView("login")} className="text-sm font-bold text-slate-500">Back to Login</button>}
                </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (WITH METHOD SELECTOR) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                    <Crown className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Upgrade to Premium</h3>
                <p className="text-slate-500 mb-6 text-sm">Select a payment method to unlock unlimited access.</p>
                
                {/* PAYMENT METHOD SELECTOR UI */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={() => setSelectedPaymentMethod('card')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedPaymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <CreditCard className="w-6 h-6"/>
                        <span className="text-xs font-bold">Credit/Debit</span>
                    </button>
                    <button onClick={() => setSelectedPaymentMethod('upi')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedPaymentMethod === 'upi' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Smartphone className="w-6 h-6"/>
                        <span className="text-xs font-bold">UPI / GPay</span>
                    </button>
                    <button onClick={() => setSelectedPaymentMethod('netbanking')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedPaymentMethod === 'netbanking' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Landmark className="w-6 h-6"/>
                        <span className="text-xs font-bold">NetBanking</span>
                    </button>
                    <button onClick={() => setSelectedPaymentMethod('global')} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedPaymentMethod === 'global' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Globe className="w-6 h-6"/>
                        <span className="text-xs font-bold">International</span>
                    </button>
                </div>

                {/* PAYMENT ACTION */}
                <div className="space-y-4">
                    <a href={payLink} target="_blank" rel="noreferrer" className="block w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-xl flex items-center justify-center gap-2">
                        <span>Pay {planPrice} Securely</span>
                        <ArrowRight className="w-4 h-4" />
                    </a>
                    
                    <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5 py-2">
                        <ShieldCheck className="w-3 h-3" /> Secure Payment to Legal Lens
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-2">
                        <input type="text" placeholder="Paste Transaction ID here..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-2 outline-none focus:border-blue-500 text-center" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                        <button onClick={handleVerifyPayment} className="w-full py-2.5 rounded-lg bg-green-500 text-white font-bold text-sm hover:bg-green-600 shadow-sm">Activate Premium</button>
                    </div>
                </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;