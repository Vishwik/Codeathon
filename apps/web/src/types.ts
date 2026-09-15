export type TransactionType = "CASH_IN" | "CASH_OUT" | "DEBIT" | "PAYMENT" | "TRANSFER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "APPROVE" | "BLOCK";

export interface ScoreInput {
  transaction_id: string;
  step: number;
  type: TransactionType;
  amount: number;
  sender_id: string;
  recipient_id: string;
}

export interface Transaction extends ScoreInput {}
export interface Reason { code: string; source: "CLASSIFIER" | "ANOMALY" | "POLICY"; message: string; }
export interface Contribution { feature: string; label: string; value: number; contribution: number; }
export interface Explanation {
  units: "raw_log_odds";
  raw_margin: number;
  base_value: number;
  contributions: Contribution[];
}

export interface Assessment {
  schema_version: string;
  transaction_id: string;
  bundle_version: string;
  feature_version: string;
  policy_version: string;
  fraud_probability: number;
  fraud_prediction: "FRAUD" | "LEGITIMATE";
  anomaly_percentile: number;
  anomaly_score: number;
  risk_score: number;
  risk_level: RiskLevel;
  suspicious: boolean;
  reasons: Reason[];
  explanation: Explanation;
  assessment_id: number;
  review_status: "PENDING" | "REVIEWED";
  recommended_action: "APPROVE" | "REVIEW" | "BLOCK";
  fallback_used: boolean;
  created_at: string;
}

export interface DecisionResponse {
  transaction_id: string;
  decision: Decision;
  note: string | null;
  decided_by: string | null;
  timestamp: string;
}

export interface TransactionRecord {
  transaction: Transaction;
  assessment: Assessment;
  decision: DecisionResponse | null;
  idempotent_replay: boolean;
}

export interface TransactionListResponse {
  items: TransactionRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface Summary {
  total_transactions: number;
  risk_counts: Record<RiskLevel, number>;
  fraud_prediction_counts: Record<"FRAUD" | "LEGITIMATE", number>;
  decision_counts: Record<Decision | "PENDING", number>;
  average_risk_score: number;
  fallback_assessments: number;
}

export interface Health {
  online: boolean;
  endpoint: string;
  latencyMs: number | null;
  error?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  transactionId: string;
  decision: Decision;
  note?: string | null;
}
