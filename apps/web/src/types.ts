export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type TransactionType =
  | 'TRANSFER'
  | 'CASH_OUT'
  | 'PAYMENT'
  | 'DEBIT'
  | 'CASH_IN';

// Alias for backwards compatibility
export type PaymentMethod = TransactionType;
export type PaySimType = TransactionType;

export type CaseStatus = 'QUEUED' | 'IN_REVIEW' | 'APPROVED' | 'BLOCKED' | 'ESCALATED';

export interface ShapContribution {
  feature: string;
  label?: string;
  contribution: number; // raw log-odds contribution from TreeSHAP (positive = increases fraud log-odds, negative = decreases)
  value?: number | string;
  category?: 'PAYMENT' | 'ACCOUNT' | 'VELOCITY' | 'STEP' | 'DRAIN' | 'TYPE' | 'MAGNITUDE' | 'RATIO';
  description?: string;
}

/**
 * Approved PaySim live inference payload contract.
 * Explicitly excludes oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest to prevent target leakage.
 */
export interface PaySimScoringInput {
  transaction_id: string;
  step: number;
  type: TransactionType;
  amount: number;
  sender_id: string;
  recipient_id: string;
}

export interface PaySimPayload {
  transaction_id?: string;
  step: number;
  type: TransactionType;
  amount: number;
  sender_id: string;
  recipient_id: string;
  oldbalanceOrg?: number;
  newbalanceOrig?: number;
  oldbalanceDest?: number;
  newbalanceDest?: number;
}

export interface ModelInferenceResult {
  fraud_probability: number; // [0, 1]
  fraud_prediction: 'FRAUD' | 'LEGITIMATE';
  anomaly_score: number; // [0, 1]
  anomaly_percentile: number; // [0, 1]
  risk_score: number; // [0, 100]
  risk_level: RiskLevel; // strictly LOW, MEDIUM, HIGH
  suspicious: boolean;
  reasons: string[];
  explanation: ShapContribution[];
  schema_version?: string;
  bundle_version?: string;
  feature_version?: string;
  policy_version?: string;
  fallback_used?: boolean;
}

export interface Transaction extends PaySimPayload {
  assessment: Assessment;
  decision: ScoringResponse['decision'];
  idempotent_replay: boolean;
  id: string; // matches transaction_id
  timestamp: string;
  rawTimestamp: number;
  method: TransactionType; // alias of type

  // Real ML outputs
  fraud_probability: number;
  fraud_prediction: 'FRAUD' | 'LEGITIMATE';
  anomaly_score: number;
  anomaly_percentile?: number;
  risk_score: number;
  risk_level: RiskLevel;
  suspicious?: boolean;
  reasons?: string[];
  explanation?: ShapContribution[];

  // Legacy aliases for component backwards-compatibility
  mlProb: number; // = fraud_probability
  anomalyScore?: number; // = anomaly_score
  fusedScore: number; // = risk_score
  riskLevel: RiskLevel; // = risk_level
  shapContributions?: ShapContribution[]; // = explanation

  primaryRiskSignature: string;
  status: CaseStatus;

  // PaySim Account Context (Sender / Recipient)
  account: {
    id: string; // sender_id
    holder: string;
    email?: string;
    tier?: string;
    createdDaysAgo?: number;
  };

  destination?: {
    routingOrAddress: string; // recipient_id
    beneficiaryName: string;
    institution?: string;
    isNewBeneficiary?: boolean;
  };

  // Demo metadata enrichment (clearly designated as DEMO EXTENSION)
  demoEnriched?: boolean;
  device?: {
    ip: string;
    geo: string;
    vpnOrProxy: boolean;
    torDetected: boolean;
    fingerprint: string;
    userAgent: string;
    deviceTrustScore: number;
  };
  network?: {
    asn: string;
    isp: string;
    travelVelocityMph?: number;
    subdivision?: string;
  };

  aiAnalysis: {
    summary: string;
    confidence?: number;
    recommendedAction: 'APPROVE' | 'REVIEW' | 'BLOCK';
    suggestedSarCode?: string;
  };

  notes?: string[];
  resolvedBy?: string;
  resolvedAt?: string;
  fallback_used?: boolean;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  rawTimestamp: number;
  authorType: 'HUMAN' | 'AI_AGENT' | 'RULE_ENGINE';
  authorName: string;
  action: string;
  txId?: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  metadata?: Record<string, string | number | boolean>;
}

export interface ChannelVelocity {
  channel: TransactionType;
  currentRate: number; // tx/m
  deltaPercent: number;
  status: 'nominal' | 'spike' | 'flat' | 'burst';
  statusText: string;
}

export interface ModelPipelineConfig {
  supervisedModel: string; // XGBoost Classifier
  supervisedVersion: string; // v1.2.0
  supervisedAucRoc: number;
  supervisedStatus: 'HEALTHY' | 'DEGRADED';
  anomalyModel: string; // Isolation Forest (no Autoencoder!)
  anomalyVersion: string; // v1.0.0
  anomalyDrift: number;
  anomalyStatus: 'ACTIVE' | 'RETRAINING';
  supervisedWeightAlpha: number; // Score fusion weight alpha
  anomalyWeightBeta: number; // Score fusion weight beta
  featurePipeline: string;
  featureCount: number;
  featurePipelineStatus: 'MODEL-READY' | 'INITIALIZING';
}

export interface AgenticRule {
  id: string;
  name: string;
  condition: string;
  action: 'AUTO_BLOCK' | 'STEP_UP_AUTH' | 'ESCALATE_QUEUE' | 'THROTTLE';
  status: 'ACTIVE' | 'SIMULATION' | 'DISABLED';
  triggeredCount24h: number;
  accuracyRate: number;
}

export interface BackendSummary {
 total_transactions: number;
 risk_counts: Record<RiskLevel, number>;
 fraud_prediction_counts: Record<'FRAUD' | 'LEGITIMATE', number>;
 decision_counts: Record<'APPROVE' | 'BLOCK' | 'PENDING', number>;
 average_risk_score: number | null;
 fallback_assessments: number;
}

export interface Assessment {
  schema_version: string; transaction_id: string; bundle_version: string;
  feature_version: string; policy_version: string;
  fraud_probability: number; fraud_prediction: 'FRAUD' | 'LEGITIMATE';
  anomaly_percentile: number; anomaly_score: number; risk_score: number;
  risk_level: RiskLevel; suspicious: boolean;
  reasons: {code: string; source: string; message: string}[];
  explanation: {units: string; raw_margin: number; base_value: number; contributions: ShapContribution[]};
  assessment_id: number; review_status: 'PENDING' | 'REVIEWED';
  recommended_action: 'APPROVE' | 'REVIEW' | 'BLOCK'; fallback_used: boolean; created_at: string;
}
export interface ScoringResponse {
 transaction: PaySimScoringInput; assessment: Assessment;
 decision: null | {transaction_id: string; decision: 'APPROVE' | 'BLOCK'; note: string | null; decided_by: string | null; timestamp: string};
 idempotent_replay: boolean;
}
