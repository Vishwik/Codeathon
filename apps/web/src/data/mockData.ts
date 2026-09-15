import { Transaction, AuditLogEvent, ChannelVelocity, ModelPipelineConfig, AgenticRule } from '../types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogEvent[] = [];
export const CHANNEL_VELOCITIES: ChannelVelocity[] = [
  {
    channel: 'TRANSFER',
    currentRate: 0,
    deltaPercent: 0,
    status: 'spike',
    statusText: 'Unavailable'
  },
  {
    channel: 'CASH_OUT',
    currentRate: 0,
    deltaPercent: 0,
    status: 'burst',
    statusText: 'Unavailable'
  },
  {
    channel: 'PAYMENT',
    currentRate: 0,
    deltaPercent: 0,
    status: 'nominal',
    statusText: 'Unavailable'
  },
  {
    channel: 'DEBIT',
    currentRate: 0,
    deltaPercent: 0,
    status: 'flat',
    statusText: 'Unavailable'
  },
  {
    channel: 'CASH_IN',
    currentRate: 0,
    deltaPercent: 0,
    status: 'nominal',
    statusText: 'Unavailable'
  }
];

// Design preview only; not applied to scoring (NO Redis, NO Autoencoder, NO Bayesian claims)
export const INITIAL_MODEL_CONFIG: ModelPipelineConfig = {
  supervisedModel: 'XGBoost Classifier',
  supervisedVersion: 'v1.2.0',
  supervisedAucRoc: 0.984,
  supervisedStatus: 'HEALTHY',
  anomalyModel: 'Isolation Forest',
  anomalyVersion: 'v1.0.0',
  anomalyDrift: 0.02,
  anomalyStatus: 'ACTIVE',
  supervisedWeightAlpha: 0.65,
  anomalyWeightBeta: 0.35,
  featurePipeline: 'Static features; preview metadata',
  featureCount: 10,
  featurePipelineStatus: 'MODEL-READY'
};

export const INITIAL_RULES: AgenticRule[] = [
  {
    id: 'RULE-01',
    name: 'Autonomous High-Confidence Auto-Block',
    condition: 'Risk Score ≥ 92 AND Fraud Probability > 0.85',
    action: 'AUTO_BLOCK',
    status: 'SIMULATION',
    triggeredCount24h: 0,
    accuracyRate: 0
  },
  {
    id: 'RULE-02',
    name: 'High-Value Transfer Drain Escalation',
    condition: 'Type == "TRANSFER" AND Amount > 25,000 units AND oldbalanceOrg == Amount',
    action: 'ESCALATE_QUEUE',
    status: 'SIMULATION',
    triggeredCount24h: 0,
    accuracyRate: 0
  },
  {
    id: 'RULE-03',
    name: 'Step Anomaly Temporal Spike Interception',
    condition: 'Step Hour in [1..5] AND Amount > 15,000 units',
    action: 'STEP_UP_AUTH',
    status: 'SIMULATION',
    triggeredCount24h: 0,
    accuracyRate: 0
  },
  {
    id: 'RULE-04',
    name: 'CASH_OUT Rapid Liquidation Throttle',
    condition: 'Type == "CASH_OUT" AND Amount > 30,000 units',
    action: 'THROTTLE',
    status: 'SIMULATION',
    triggeredCount24h: 0,
    accuracyRate: 0
  }
];
