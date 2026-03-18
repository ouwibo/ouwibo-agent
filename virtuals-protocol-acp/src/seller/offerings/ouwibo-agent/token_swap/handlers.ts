import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Execute the swap logic by calling the python worker
export async function executeJob(request: any): Promise<ExecuteJobResult> {
  try {
    const scriptPath = path.resolve(process.cwd(), "../scripts/acp_swap_worker.py");
    const fromToken = request.fromToken;
    const toToken = request.toToken;
    const amount = request.amountStr;
    const fromChain = request.fromChain || "base";
    const toChain = request.toChain || fromChain;

    // Pass arguments to the python worker
    const { stdout, stderr } = await execAsync(
      `python3 "${scriptPath}" "${fromToken}" "${toToken}" "${amount}" "${fromChain}" "${toChain}"`
    );

    let resultData: any;
    try {
      resultData = JSON.parse(stdout.trim());
    } catch (e) {
      console.error("Worker output parsing error:", e);
      console.error("Raw output:", stdout);
      return { deliverable: "Error parsing worker response" };
    }

    if (resultData.error) {
      return { deliverable: `Swap execution failed: ${resultData.error}` };
    }

    // Return the deliverable and the funds to the buyer
    return {
      deliverable: `Successfully swapped ${amount} of ${fromToken} to ${resultData.outputAmountDisplay} of ${toToken}. TX Hash: ${resultData.txHash}`,
      payableDetail: {
        tokenAddress: toToken,
        amount: resultData.outputAmountBase, // The numeric format of the returned token
      },
    };
  } catch (e: any) {
    return { deliverable: `Worker execution hard failed: ${e.message}` };
  }
}

// Basic validation
export function validateRequirements(request: any): ValidationResult {
  if (!request.fromToken || !request.toToken || !request.amountStr) {
    return {
      valid: false,
      reason: "Missing required parameters: fromToken, toToken, and amountStr",
    };
  }
  const amt = parseFloat(request.amountStr);
  if (isNaN(amt) || amt <= 0) {
    return { valid: false, reason: "amountStr must be a valid positive number" };
  }
  return { valid: true };
}

// Request the seller agent to send the tokens needed for the swap
export function requestAdditionalFunds(request: any): {
  content?: string;
  amount: number;
  tokenAddress: string;
  recipient: string;
} {
  return {
    content: `Transfer ${request.amountStr} of ${request.fromToken} for swap execution via LI.FI`,
    amount: parseFloat(request.amountStr),
    tokenAddress: request.fromToken,
    recipient: process.env.AGENT_WALLET_ADDRESS || "", // Ensure you have AGENT_WALLET_ADDRESS
  };
}
