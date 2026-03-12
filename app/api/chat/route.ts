import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(`
      Kamu adalah Ouwibo Agent (PRIME). 
      Asisten AI cerdas untuk analisis market dan operasional sistem.
      Jawab dengan gaya teknis, profesional, dan ringkas.
      User Command: ${message}
    `);

    const response = await result.response;
    return NextResponse.json({ reply: response.text() });
  } catch (error) {
    return NextResponse.json({ reply: "⚠️ Neural link interrupted. Check API configuration." }, { status: 500 });
  }
}
