import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Path to the Ouwibo python worker script
const workerScript = path.resolve(process.cwd(), "../../scripts/acp_worker.py");

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const query = request.query || "No query provided";
  const depth = request.depth || "summary";

  try {
    // Call the Python agent to perform the research
    const command = `python3 "${workerScript}" "${query}" "${depth}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stdout) {
      return { deliverable: `Error executing research: ${stderr}` };
    }

    return { deliverable: stdout.trim() };
  } catch (error: any) {
    return { deliverable: `Failed to execute agent: ${error.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.query || typeof request.query !== "string") {
    return { valid: false, reason: "A valid 'query' string is required" };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Payment of 0.5 USDC is required for deep research on: ${request.query}`;
}
