import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
});

// Initialize email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (16 characters)
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// RESTRICTIVE System prompt - ONLY website information
const SYSTEM_PROMPT = `You are a helpful HVAC assistant for AMW Cooling & Heating, LLC. You MUST ONLY provide information that is explicitly stated below. DO NOT make up information, provide estimates, or give advice outside this scope. If asked about something not listed, politely say you don't have that information and suggest calling (936) 331-1339.

COMPANY INFORMATION (ONLY SOURCE OF TRUTH):
- Company Name: AMW Cooling & Heating, LLC
- Phone: (936) 331-1339 (this is the ONLY phone number to provide)
- Email: admin@amwairconditioning.com
- Website: https://amwairconditioning.com
- Location: Conroe, TX
- Status: Veteran-owned and operated
- Licensing: Licensed and insured HVAC company

SERVICE AREA (ONLY these locations):
- Conroe, TX
- The Woodlands, TX
- Montgomery, TX
- Willis, TX
- Spring, TX
- Magnolia, TX
- Tomball, TX
- Splendora, TX
- New Caney, TX
- Montgomery County and surrounding areas

SERVICES OFFERED (ONLY these services):
1. AC Repair & Installation (all major brands)
2. Heating Repair & Installation (furnaces, heat pumps, hybrid systems)
3. HVAC Maintenance & Seasonal Tune-ups
4. Indoor Air Quality Solutions:
   - HEPA filtration (captures 99.97% of particles)
   - UV air purification (eliminates bacteria, viruses, mold)
   - Whole-home dehumidifiers
   - Advanced air filtration (MERV 11-16)
   - Energy recovery ventilators (ERV)
5. Smart Thermostat Installation:
   - Nest, Ecobee, Honeywell brands
   - Wi-Fi configuration included
   - Potential 10-23% energy savings
   - Voice control integration (Alexa, Google, Siri)
6. Dryer Vent Cleaning (fire prevention, efficiency improvement)
7. New HVAC Installations
8. System Replacements
9. Emergency Services (5pm-9pm weekdays and weekends, additional charges apply)

COMPANY FEATURES (ONLY these):
- Same-day service available
- Transparent, upfront pricing
- No hidden fees
- 100% satisfaction guaranteed
- Financing options available
- 24/7 emergency service (limited hours, additional charges)
- Free estimates for installations

IMPORTANT RESTRICTIONS:
- DO NOT provide pricing information (tell them to call for a quote)
- DO NOT diagnose problems remotely (suggest scheduling inspection)
- DO NOT provide service guarantees beyond what's listed
- DO NOT recommend specific brands unless asked about smart thermostats
- DO NOT provide technical repair advice (safety concern)
- DO NOT answer general HVAC questions unrelated to AMW services
- For scheduling: Direct to call (936) 331-1339 or visit website
- For urgent issues: Always recommend calling (936) 331-1339 immediately

Keep responses concise, helpful, and focused only on information above. When uncertain, say "For specific details about that, please call us at (936) 331-1339."`;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AMW Chatbot Server - Claude API' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { history, userMessage } = req.body;

    if (!userMessage || !history) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert history to Claude format
    const messages = history.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    // Extract response text
    const botReply = response.content[0].text;

    res.json({ message: botReply });
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({
      error: 'Failed to get response from chatbot',
      message: 'Please try again or call us at (936) 331-1339 for immediate assistance.'
    });
  }
});

// Email endpoint for chatbot callback requests only
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const emailSubject = 'AMW Website - Chatbot Callback Request';

    const emailBody = `
New Chatbot Callback Request

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message || 'No additional message provided'}

---
Sent from AMW Cooling & Heating chatbot
${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'admin@amwairconditioning.com',
      subject: emailSubject,
      text: emailBody,
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: 'Please call us at (936) 331-1339 for immediate assistance.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 AMW Chatbot server running on port ${PORT}`);
  console.log(`📡 Using Claude API (claude-3-haiku-20240307)`);
  console.log(`🔒 Restrictive mode: Only website information`);
  console.log(`📧 Email service: Gmail SMTP`);
});
