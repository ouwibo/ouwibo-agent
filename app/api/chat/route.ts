import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";
import { Mistral } from "@mistralai/mistralai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const context = `You are Ouwibo Agent (OUWIBO_MASTER_01), an elite autonomous AI gateway. Respond professionally, technically, and concisely using Markdown. User command: ${message}`;

    // 1. GEMINI (Primary)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(context);
        return NextResponse.json({ reply: result.response.text(), provider: "Gemini 1.5 Pro" });
      } catch (e) { console.error("Gemini failed, switching..."); }
    }

    // 2. MISTRAL (Fallback 1)
    if (process.env.MISTRAL_API_KEY) {
      try {
        const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
        const result = await client.chat.complete({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: context }],
        });
        return NextResponse.json({ reply: result.choices?.[0].message.content, provider: "Mistral Large" });
      } catch (e) { console.error("Mistral failed, switching..."); }
    }

    // 3. HUGGING FACE (Fallback 2)
    if (process.env.HF_TOKEN) {
      try {
        const hf = new HfInference(process.env.HF_TOKEN);
        const result = await hf.textGeneration({
          model: "meta-llama/Llama-3.1-8B-Instruct",
          inputs: context,
          parameters: { max_new_tokens: 500 }
        });
        return NextResponse.json({ reply: result.generated_text, provider: "Llama 3.1" });
      } catch (e) { console.error("HF failed."); }
    }

    return NextResponse.json({ reply: "⚠️ All neural links disconnected. Please check API configurations." }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ reply: "⚠️ Internal Gateway Error." }, { status: 500 });
  }
}
