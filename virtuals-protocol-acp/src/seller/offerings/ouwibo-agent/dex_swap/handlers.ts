import { exec } from "child_process";
import { promisify } from "util";
import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

const execAsync = promisify(exec);

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { fromToken, toToken, amount, fromChain, toChain } = request;
  
  try {
    const runPath = `/Users/rhmnhsim/ouwibo-agent/venv/bin/python /Users/rhmnhsim/ouwibo-agent/scripts/acp_swap_worker.py ${fromToken} ${toToken} ${amount} ${fromChain} ${toChain}`;
    const { stdout, stderr } = await execAsync(runPath, { cwd: "/Users/rhmnhsim/ouwibo-agent" });
    
    return { deliverable: stdout.trim() || stderr.trim() };
  } catch (error: any) {
    return { deliverable: `Error executing swap: ${error.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.fromToken || !request.toToken || !request.amount || !request.fromChain || !request.toChain) {
    return { valid: false, reason: "Missing required parameters (fromToken, toToken, amount, fromChain, toChain)." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return "Payment accepted for Dex Swap";
}
