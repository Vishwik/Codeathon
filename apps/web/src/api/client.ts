import type { Assessment, Decision, Health, ScoreInput, Summary } from "../types";
const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";
export const API_BASE_URL = rawBase.replace(/\/+$/, "");
export class ApiError extends Error { constructor(message: string, readonly status?: number) { super(message); this.name = "ApiError"; } }
async function request<T>(path: string, init?: RequestInit, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(API_BASE_URL + path, { ...init, signal: controller.signal, headers: { Accept: "application/json", ...init?.headers } });
    if (!response.ok) throw new ApiError("Backend returned " + response.status + " " + response.statusText, response.status);
    return await response.json() as T;
  } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(error instanceof DOMException && error.name === "AbortError" ? "Backend request timed out" : "Backend offline • ML unavailable"); }
  finally { window.clearTimeout(timer); }
}
function normalize(value: Assessment): Assessment { return { ...value, reasons: (value.reasons ?? []).map((reason) => typeof reason === "string" ? { code: "BACKEND_REASON", source: "POLICY", message: reason } : reason), explanation: value.explanation ?? { units: "raw_log_odds", raw_margin: 0, base_value: 0, contributions: [] } }; }
function validate(input: ScoreInput): ScoreInput {
 const payload = { transaction_id: String(input.transaction_id).trim(), step: Number(input.step), type: input.type, amount: Number(input.amount), sender_id: String(input.sender_id).trim(), recipient_id: String(input.recipient_id).trim() };
 if (!payload.transaction_id || !payload.sender_id || !payload.recipient_id || !Number.isInteger(payload.step) || payload.step < 0 || !["CASH_IN","CASH_OUT","DEBIT","PAYMENT","TRANSFER"].includes(payload.type) || !Number.isFinite(payload.amount) || payload.amount <= 0) throw new ApiError("Enter a valid six-field PaySim transaction.");
 return payload;
}
export const apiClient = {
 async health(): Promise<Health> { const started = performance.now(); try { const response = await request<{ fallback_used?: boolean }>("/health", undefined, 1800); return { online: true, fallbackUsed: response.fallback_used === true, endpoint: API_BASE_URL, latencyMs: Math.round(performance.now() - started) }; } catch (error) { return { online: false, fallbackUsed: false, endpoint: API_BASE_URL, latencyMs: null, error: error instanceof Error ? error.message : "Backend offline • ML unavailable" }; } },
 async score(input: ScoreInput) { return normalize(await request<Assessment>("/api/v1/transactions/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validate(input)) })); },
 async transactions() { const result = await request<Assessment[] | { transactions: Assessment[] }>("/api/v1/transactions"); return (Array.isArray(result) ? result : result.transactions).map(normalize); },
 async summary() { return request<Summary>("/api/v1/summary"); },
 async decision(id: string, decision: Decision, note: string) { return normalize(await request<Assessment>("/api/v1/transactions/" + encodeURIComponent(id) + "/decision", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note: note.trim() || null }) })); },
};
