import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Path to the Ouwibo python crypto worker script
const workerScript = path.resolve(process.cwd(), "../../scripts/acp_crypto_worker.py");

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const token = request.token_or_project || "BTC";
  const analysisType = request.analysis_type || "snapshot";

  try {
    const command = `python3 "${workerScript}" "${token}" "${analysisType}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stdout) {
      return { deliverable: `Error executing crypto analysis: ${stderr}` };
    }

    return { deliverable: stdout.trim() };
  } catch (error: any) {
    return { deliverable: `Failed to execute agent: ${error.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.token_or_project || typeof request.token_or_project !== "string") {
    return { valid: false, reason: "A valid 'token_or_project' string is required" };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Payment of 0.5 USDC is required for crypto analysis on: ${request.token_or_project}`;
}
