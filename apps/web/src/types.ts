export type TransactionType = "CASH_IN" | "CASH_OUT" | "DEBIT" | "PAYMENT" | "TRANSFER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "APPROVE" | "BLOCK";
export interface ScoreInput { transaction_id: string; step: number; type: TransactionType; amount: number; sender_id: string; recipient_id: string; }
export interface Reason { code: string; source: "CLASSIFIER" | "ANOMALY" | "POLICY"; message: string; }
export interface Contribution { feature: string; label: string; value: number; contribution: number; }
export interface Assessment extends ScoreInput { schema_version?: string; bundle_version?: string; feature_version?: string; policy_version?: string; fraud_probability: number; fraud_prediction: "FRAUD" | "LEGITIMATE"; anomaly_percentile: number; anomaly_score: number; risk_score: number; risk_level: RiskLevel; suspicious: boolean; reasons: Reason[]; explanation: { units: "raw_log_odds"; raw_margin: number; base_value: number; contributions: Contribution[] }; fallback_used?: boolean; decision?: Decision; decision_note?: string | null; decided_at?: string | null; }
export interface Summary { total_transactions: number; suspicious_count: number; high_risk_count: number; medium_risk_count: number; low_risk_count: number; avg_risk_score: number; fallback_used?: boolean; }
export interface Health { online: boolean; fallbackUsed: boolean; endpoint: string; latencyMs: number | null; error?: string; }
export interface AuditEvent { id: string; timestamp: string; transactionId: string; decision: Decision; note?: string; }
