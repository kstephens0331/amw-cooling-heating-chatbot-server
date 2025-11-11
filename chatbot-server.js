import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const apiKey = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY)?.trim();
console.log('🔑 API Key detected:', apiKey ? `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING');
console.log('🔑 API Key length:', apiKey?.length);
console.log('🔑 API Key starts with sk-ant:', apiKey?.startsWith('sk-ant'));
const anthropic = new Anthropic({
  apiKey: apiKey,
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
const SYSTEM_PROMPT = `You are a friendly representative for AMW Cooling & Heating. Speak naturally and conversationally, like a helpful person would talk - not like a formal assistant.

CRITICAL COMMUNICATION RULES:
- Use "we" and "our" language (e.g., "We offer AC repair" NOT "AMW offers AC repair")
- Be direct and brief - 1-2 sentences max per response
- Sound human and conversational
- ALWAYS collect customer contact info early: name, phone, address, email
- If they haven't provided contact info yet, ask for it naturally in the conversation

WHAT WE DO:
We're a veteran-owned HVAC company in Conroe, TX. Licensed and insured.

SERVICE AREA:
Conroe, The Woodlands, Montgomery, Willis, Spring, Magnolia, Tomball, Splendora, New Caney, and surrounding areas.

SERVICES:
- AC repair and installation
- Heating repair and installation (furnaces, heat pumps)
- HVAC maintenance and tune-ups
- Indoor air quality (air purifiers, dehumidifiers, filtration)
- Smart thermostat installation (Nest, Ecobee, Honeywell)
- Dryer vent cleaning
- Emergency service available

WHAT WE OFFER:
Same-day service, upfront pricing, no hidden fees, 100% satisfaction guaranteed, financing available, free installation estimates.

CONTACT: (936) 331-1339

RULES:
- No pricing over chat - say "Let me get you a quote. What's your phone number so we can call you back?"
- No remote diagnosis - say "I'd like to schedule someone to check that out. What's your address?"
- Always collect: name, phone, address, email
- Keep it simple and friendly
- If you don't know something, say "Let me have someone call you about that - what's your number?"

Example good responses:
"We handle all AC and heating repairs. What's going on with your system?"
"Got it. What's your name and phone number so we can get someone out there?"
"We service that area. What's your address?"
"Perfect. What's the best email to send the quote to?"`;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AMW Chatbot Server - Claude API' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { history, userMessage } = req.body;

    console.log('📥 Incoming request:', { userMessage, historyLength: history?.length });

    if (!userMessage || !history) {
      console.error('❌ Missing fields:', { userMessage: !!userMessage, history: !!history });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert history to Claude format
    const messages = history.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    console.log('🔄 Calling Claude API with', messages.length, 'messages');

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    // Extract response text
    const botReply = response.content[0].text;

    console.log('✅ Claude API success, reply length:', botReply.length);
    res.json({ message: botReply });
  } catch (error) {
    console.error('❌ Claude API Error Details:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
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

// Email endpoint for chat history when chat is closed
app.post('/api/send-chat-history', async (req, res) => {
  try {
    const { chatHistory, timestamp } = req.body;

    if (!chatHistory) {
      return res.status(400).json({ error: 'Chat history is required' });
    }

    const emailSubject = 'AMW Website - Chatbot Conversation History';

    const emailBody = `
Chat Conversation History

Timestamp: ${timestamp}

Conversation:
${chatHistory}

---
Sent from AMW Cooling & Heating chatbot
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'admin@amwairconditioning.com',
      subject: emailSubject,
      text: emailBody,
    });

    res.json({ success: true, message: 'Chat history sent successfully' });
  } catch (error) {
    console.error('Chat History Email Error:', error);
    res.status(500).json({
      error: 'Failed to send chat history',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 AMW Chatbot server running on port ${PORT}`);
  console.log(`📡 Using Claude API (claude-3-haiku-20240307)`);
  console.log(`🔒 Restrictive mode: Only website information`);
  console.log(`📧 Email service: Gmail SMTP`);
});
