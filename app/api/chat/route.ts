import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json(); // Accept an array of messages
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: "No message provided." }, { status: 400 });
    }

    // Prepare history for Gemini
    // Gemini expects: { role: 'user' | 'model', parts: [{ text: '...' }] }
    // We map our custom roles ('agent' -> 'model') and format them correctly.
    // The very last message is extracted to be the current prompt.
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "agent" ? "model" : "user",
      parts: [{ text: msg.content || " " }],
    }));

    const lastMessage = messages[messages.length - 1].content;
    const systemPrompt = "You are Ouwibo Agent (OUWIBO_MASTER_01), an elite autonomous AI. Respond professionally, technically, and concisely using Markdown. If providing code, use markdown code blocks.";

    // 1. GEMINI (Primary - Context Aware)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: systemPrompt 
        });
        
        // Start a chat session with the historical context
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage);
        
        return NextResponse.json({ reply: result.response.text(), provider: "Gemini 1.5 Pro" });
      } catch (e: any) { 
        console.error("Gemini failed:", e); 
        // Fallback logic could be added here, but for history tracking, 
        // managing complex mappings across different SDKs (Mistral/HF) is intricate.
        // We will focus on making Gemini fully context-aware first.
      }
    }

    return NextResponse.json({ reply: "⚠️ All neural links disconnected. Please check API configurations." }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ reply: "⚠️ Internal Gateway Error." }, { status: 500 });
  }
}
