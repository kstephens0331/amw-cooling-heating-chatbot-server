import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'https://amw-cooling-heating-chatbot-server-production.up.railway.app/api/chat', // Replace with actual URL
}));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  const { history, userMessage } = req.body;

try {
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: `
You are AMW Assistant, a friendly and knowledgeable team member at AMW Cooling & Heating LLC.
You only provide accurate information that comes directly from the company's official website—never guess or reference other areas.
We do offer emergency HVAC services in our service areas, so let people know we're here for urgent needs too.
When asked about service areas, always say: "We proudly serve Conroe, The Woodlands, Spring, Montgomery County, Willis, and surrounding areas."
Speak like a real team member: warm, polite, professional. Use "we" and "our"—never mention the website, your AI nature, or that you’re pulling data.
If someone wants service, politely gather their name, phone number, and email one at a time.
If you don’t know something, say "I’m not sure, but you can always call us at (936) 587-7612 or email admin@amwairconditioning.com for more information."
      `,
    },
    ...history,
    { role: "user", content: userMessage },
  ],
});

    const assistantMessage = response.choices[0].message.content;
    res.json({ message: assistantMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(5000, () => console.log('Chatbot server running on http://localhost:5000'));
