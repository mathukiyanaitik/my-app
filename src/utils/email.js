import emailjs from '@emailjs/browser';

// ============================================================
// 🔐 EMAIL CONFIGURATION
// Go to EmailJS.com > Account/dashboard to find these
// ============================================================
const SERVICE_ID = "service_51ta7ke"; 
const TEMPLATE_ID = "template_tk6eo6e"; // The ID of the "Master_Template" you created
const PUBLIC_KEY = "ZOrDrsE-awVOiTHGZ";

// ============================================================
// 🎨 HTML GENERATORS
// These functions build the beautiful designs dynamically
// ============================================================

// 1. WELCOME EMAIL DESIGN
const getWelcomeHTML = (name) => `
    <div style="padding: 40px 30px;">
        <h2 style="color: #1e293b; text-align: center; margin-top:0;">Your Legal Superpowers are Active.</h2>
        <p style="color: #475569; font-size: 16px; text-align: center;">Hi ${name}, welcome to <strong>Unilex AI</strong>. You've hired a 24/7 legal expert tailored to your needs.</p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <p style="text-align: center; font-weight: bold; color: #64748b; font-size: 11px; letter-spacing: 2px;">YOUR CAPABILITIES</p>
            <div style="margin-bottom: 15px;"><strong>✨ Context-Aware Drafting:</strong> <span style="color: #64748b;">Create tailored agreements.</span></div>
            <div style="margin-bottom: 15px;"><strong>🔍 Risk-Free Audits:</strong> <span style="color: #64748b;">Find loopholes instantly.</span></div>
            <div><strong>🌍 Global Compliance:</strong> <span style="color: #64748b;">Localized for your region.</span></div>
        </div>

        <div style="text-align: center;">
            <a href="https://www.unilexai.com" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">Start Drafting Now</a>
        </div>
    </div>
`;

// 2. WALLET RECEIPT DESIGN
const getReceiptHTML = (amount, newBalance, txnId) => `
    <div style="padding: 40px 30px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
        <h2 style="color: #1e293b; margin: 0;">Payment Confirmed</h2>
        <p style="color: #64748b;">Your wallet has been recharged.</p>

        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: left;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #64748b;">Amount Added</span>
                <span style="font-weight: bold; color: #0f172a;">${amount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #64748b;">New Balance</span>
                <span style="font-weight: bold; color: #16a34a;">${newBalance}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #64748b;">Transaction ID</span>
                <span style="font-family: monospace;">${txnId}</span>
            </div>
        </div>
        <a href="https://www.unilexai.com" style="color: #2563eb; font-weight: bold; text-decoration: none;">View Wallet History</a>
    </div>
`;

// 3. PRO UPGRADE DESIGN
const getProHTML = (name) => `
    <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #ca8a04; margin: 0;">Welcome to Pro 👑</h2>
        <p style="color: #475569;">Congratulations ${name}, you have unlocked unlimited access.</p>
        <ul style="text-align: left; margin: 30px 0; color: #334155; list-style: none; padding: 0;">
            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">🚀 Unlimited Audits</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">✍️ Unlimited Drafting</li>
            <li style="padding: 10px 0;">⚡ Priority AI Processing</li>
        </ul>
        <a href="https://www.unilexai.com" style="background-color: #ca8a04; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">Go to Pro Dashboard</a>
    </div>
`;

// ============================================================
// 📤 EXPORTED SERVICE
// This is what App.js uses to send emails
// ============================================================
export const emailService = {
    sendWelcome: async (user) => {
        if (!user || !user.email) return;
        const userName = user.name || 'there';
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                to_email: user.email,
                subject: `Welcome to Unilex AI, ${userName}!`,
                content_html: getWelcomeHTML(userName) // 👈 Injecting Welcome Design
            }, PUBLIC_KEY);
            console.log("Welcome Email Sent");
        } catch (error) { console.error("Email Error:", error); }
    },

    sendRechargeSuccess: async (user, amount, txnId, newBalance) => {
        if (!user || !user.email) return;
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                to_email: user.email,
                subject: `Receipt: ${amount} Added to Wallet`,
                content_html: getReceiptHTML(amount, newBalance, txnId) // 👈 Injecting Receipt Design
            }, PUBLIC_KEY);
            console.log("Receipt Email Sent");
        } catch (error) { console.error("Email Error:", error); }
    },

    sendProUpgrade: async (user) => {
        if (!user || !user.email) return;
        const userName = user.name || 'there';
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                to_email: user.email,
                subject: "You are now a Unilex Pro Member",
                content_html: getProHTML(userName) // 👈 Injecting Pro Design
            }, PUBLIC_KEY);
            console.log("Pro Email Sent");
        } catch (error) { console.error("Email Error:", error); }
    },
    
    sendDeduction: async (user, service, cost, remaining) => {
        // We keep this function here so App.js doesn't crash, 
        // but we leave it empty to avoid spamming users for small deductions.
    }
};