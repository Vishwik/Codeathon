import type {PaySimScoringInput, BackendSummary, Transaction, CaseStatus, ScoringResponse} from '../types';
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000').trim().replace(/\/+$/, '');
export interface ApiHealthStatus {
 online: boolean; observedLatencyMs: number | null; fallbackMode: boolean;
 endpoint: string; errorMessage?: string; bundleVersion?: string;
}
export function adaptTransaction(data: ScoringResponse): Transaction {
 const {transaction: tx, assessment: a, decision: d} = data;
 if (!a || !tx || !Array.isArray(a.explanation?.contributions) ||
     !['LOW','MEDIUM','HIGH'].includes(a.risk_level) ||
     !['FRAUD','LEGITIMATE'].includes(a.fraud_prediction) || typeof a.suspicious !== 'boolean' ||
     !Array.isArray(a.reasons) ||
     ![a.fraud_probability,a.anomaly_score,a.anomaly_percentile,a.risk_score].every(Number.isFinite))
   throw new Error('Invalid backend assessment response');
 const stamp = /(?:Z|[+-]\d\d:\d\d)$/.test(a.created_at) ? a.created_at : a.created_at + 'Z';
 return {...tx, assessment: a, decision: d, idempotent_replay: data.idempotent_replay,
 id: tx.transaction_id, timestamp: new Date(stamp).toLocaleString(), rawTimestamp: Date.parse(stamp), method: tx.type,
 fraud_probability:a.fraud_probability, fraud_prediction:a.fraud_prediction, anomaly_score:a.anomaly_score,
 anomaly_percentile:a.anomaly_percentile,risk_score:a.risk_score,risk_level:a.risk_level,suspicious:a.suspicious,
 reasons:a.reasons.map(r=>r.message),explanation:a.explanation.contributions,
 mlProb:a.fraud_probability,anomalyScore:a.anomaly_score,fusedScore:a.risk_score,riskLevel:a.risk_level,
 shapContributions:a.explanation.contributions, primaryRiskSignature:a.reasons[0]?.message || 'No reason supplied',
 status:d?.decision === 'APPROVE' ? 'APPROVED' : d?.decision === 'BLOCK' ? 'BLOCKED' : 'QUEUED',
 account:{id:tx.sender_id,holder:tx.sender_id},
 destination:{routingOrAddress:tx.recipient_id,beneficiaryName:tx.recipient_id},
 aiAnalysis:{summary:a.reasons.map(r=>r.message).join('; '),recommendedAction:a.recommended_action},
 notes:d?.note ? [d.note] : [],resolvedBy:d?.decided_by || undefined,resolvedAt:d?.timestamp,
 fallback_used:a.fallback_used};
}
class ApiClient {
 private baseUrl = API_BASE_URL;
 private latency: number | null = null;
 private online: boolean | null = null;
 getBaseUrl() { return this.baseUrl; }
 setBaseUrl(url: string) { this.baseUrl = url.trim().replace(/\/+$/, ''); }
 getLastObservedLatency() { return this.latency; }
 isBackendOnline() { return this.online; }
 private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),15000);
  const start = performance.now();
  try {
   const response = await fetch(this.baseUrl+path,{...init,signal:controller.signal,headers:{Accept:'application/json','Content-Type':'application/json',...init.headers}});
   this.latency = Math.round(performance.now()-start);
   const body = await response.json().catch(()=>({detail:response.statusText || 'Invalid response'}));
   if (!response.ok) throw new Error('HTTP '+response.status+': '+JSON.stringify(body.detail ?? body));
   return body as T;
  } finally { clearTimeout(timer); }
 }
 async checkHealth(): Promise<ApiHealthStatus> {
  try {
   const health = await this.request<{status:string;database:string;ml:{status:string;bundle_version:string}}>('/health');
   if(health.status !== 'ok' || health.database !== 'ok' || health.ml?.status !== 'ready') throw new Error('Backend is not ready');
   this.online=true;
   return {online:true,observedLatencyMs:this.latency,fallbackMode:false,endpoint:this.baseUrl,bundleVersion:health.ml.bundle_version};
  } catch(error) {
   this.online=false;
   return {online:false,observedLatencyMs:null,fallbackMode:false,endpoint:this.baseUrl,errorMessage:error instanceof Error ? error.message : 'Backend unavailable'};
  }
 }
 async getTransactions(params: {limit?:number;offset?:number} = {}): Promise<Transaction[]> {
  const data=await this.request<{items:ScoringResponse[]}>('/api/v1/transactions?limit='+(params.limit ?? 100)+'&offset='+(params.offset ?? 0));
  if(!Array.isArray(data.items)) throw new Error('Invalid backend transaction list');
  return data.items.map(adaptTransaction);
 }
 async getTransaction(id:string):Promise<Transaction> {
  return adaptTransaction(await this.request<ScoringResponse>('/api/v1/transactions/'+encodeURIComponent(id)));
 }
 async scoreTransaction(input:PaySimScoringInput):Promise<Transaction> {
  const {transaction_id,step,type,amount,sender_id,recipient_id}=input;
  const payload={transaction_id:transaction_id.trim(),step,type,amount,sender_id:sender_id.trim(),recipient_id:recipient_id.trim()};
  if(!['TRANSFER','CASH_OUT','PAYMENT','DEBIT','CASH_IN'].includes(type)||!Number.isInteger(step)||step<0||!Number.isFinite(amount)||amount<=0||
     [payload.transaction_id,payload.sender_id,payload.recipient_id].some(v=>!v||v.length>200)) throw new Error('Enter valid IDs, a nonnegative integer step, and a positive amount.');
  return adaptTransaction(await this.request<ScoringResponse>('/api/v1/transactions/score',{method:'POST',body:JSON.stringify(payload)}));
 }
 getSummary():Promise<BackendSummary> { return this.request('/api/v1/summary'); }
 async recordDecision(id:string,status:CaseStatus,note?:string,sarCode?:string):Promise<Transaction> {
  if(status!=='APPROVED' && status!=='BLOCKED') throw new Error('Only APPROVE and BLOCK are supported. Review and freeze controls are previews.');
  await this.request('/api/v1/transactions/'+encodeURIComponent(id)+'/decision',{method:'PATCH',body:JSON.stringify({
   decision:status==='APPROVED'?'APPROVE':'BLOCK',note:[note,sarCode].filter(Boolean).join('\n')||null,decided_by:'Demo investigator'
  })});
  return this.getTransaction(id);
 }
}
export const apiClient = new ApiClient();
