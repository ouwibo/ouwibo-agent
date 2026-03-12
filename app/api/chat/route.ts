import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// --- TOOL EXECUTORS ---
async function searchWeb(query: string) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const text = await res.text();
    const snippets = [...text.matchAll(/<a class="result__snippet[^>]*>(.*?)<\/a>/g)]
      .map(m => m[1].replace(/<\/?[^>]+(>|$)/g, ""))
      .slice(0, 3);
    return snippets.join("\n") || "No results found on the web.";
  } catch (e) {
    return "Web search failed.";
  }
}

async function getCryptoPrice(coinId: string) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const data = await res.json();
    return JSON.stringify(data);
  } catch (e) {
    return "Failed to fetch price. The API might be rate-limited.";
  }
}

function getSystemTime() {
  return new Date().toISOString();
}

const functions: Record<string, Function> = {
  searchWeb,
  getCryptoPrice,
  getSystemTime
};

// --- GEMINI TOOLS DEFINITION ---
const tools = [{
  functionDeclarations: [
    {
      name: "searchWeb",
      description: "Search the web for real-time information, news, or general knowledge.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description: "The search query."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "getCryptoPrice",
      description: "Get the current price of a cryptocurrency in USD.",
      parameters: {
        type: "OBJECT",
        properties: {
          coinId: {
            type: "STRING",
            description: "The ID of the cryptocurrency (e.g., 'bitcoin', 'ethereum', 'solana')."
          }
        },
        required: ["coinId"]
      }
    },
    {
      name: "getSystemTime",
      description: "Get the current system date and time in ISO format.",
      parameters: {
        type: "OBJECT",
        properties: {}
      }
    }
  ]
}];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: "No message provided." }, { status: 400 });
    }

    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "agent" ? "model" : "user",
      parts: [{ text: msg.content || " " }],
    }));

    const lastMessage = messages[messages.length - 1].content;
    const systemPrompt = "You are Ouwibo Agent (OUWIBO_MASTER_01), an elite autonomous AI. You have access to real-time web search and live cryptocurrency prices via your tools. Always use tools when asked for real-time data or prices. Respond professionally and technically using Markdown.";

    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Cast tools to any to bypass strict SDK typing issues if necessary
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: systemPrompt,
          tools: tools as any 
        });
        
        const chat = model.startChat({ history });
        let result = await chat.sendMessage(lastMessage);
        
        // --- FUNCTION CALL HANDLING LOOP ---
        let response = result.response;
        if (response.functionCalls()) {
          const calls = response.functionCalls();
          
          if (calls && calls.length > 0) {
            const call = calls[0];
            console.log(`[Tool Call] Executing ${call.name}(${JSON.stringify(call.args)})`);
            
            let funcResult;
            if (functions[call.name]) {
              funcResult = await functions[call.name](...Object.values(call.args || {}));
            } else {
              funcResult = "Tool not found.";
            }

            // Send tool result back to Gemini to synthesize final answer
            result = await chat.sendMessage([{
              functionResponse: {
                name: call.name,
                response: { result: funcResult }
              }
            }]);
            response = result.response;
          }
        }
        
        return NextResponse.json({ reply: response.text(), provider: "Gemini 1.5 Pro (Tool Enabled)" });
      } catch (e: any) { 
        console.error("Gemini failed:", e); 
        return NextResponse.json({ reply: "⚠️ Agent connection unstable. Try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ reply: "⚠️ All neural links disconnected. Please check API configurations." }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ reply: "⚠️ Internal Gateway Error." }, { status: 500 });
  }
}
