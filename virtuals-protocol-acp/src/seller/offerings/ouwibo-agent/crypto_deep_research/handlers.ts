import { exec } from "child_process";
import { promisify } from "util";
import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

const execAsync = promisify(exec);

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { tokenName } = request;
  
  try {
    const prompt = `Perform Crypto Deep Research on the token/project: ${tokenName}. Compile smart contract audit info, VC funding data, and developer Twitter footprint.`;
    const runPath = `/Users/rhmnhsim/ouwibo-agent/venv/bin/python main.py --task "${prompt}" --verbose`;
    const { stdout, stderr } = await execAsync(runPath, { cwd: "/Users/rhmnhsim/ouwibo-agent" });
    
    return { deliverable: stdout.trim() || stderr.trim() };
  } catch (error: any) {
    return { deliverable: `Error executing research: ${error.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.tokenName) {
    return { valid: false, reason: "Missing tokenName requirement." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return "Payment of 1 USDC accepted for Institutional Crypto Deep Research.";
}
