import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {afterEach, test} from 'node:test';
import ts from 'typescript';

// Compile in memory with the existing TypeScript dependency; no test runner package.
const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020}}).outputText;
const {apiClient, adaptTransaction} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
// Captured from the running synthetic bundle, not a trained PaySim assessment.
const fixture = JSON.parse(await readFile(new URL('./fixtures/assessment.json', import.meta.url), 'utf8'));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

test('adapter preserves assessment, reasons and TreeSHAP without recalculation', () => {
  const tx = adaptTransaction(fixture);
  for (const field of ['fraud_probability','fraud_prediction','anomaly_score','anomaly_percentile','risk_score','risk_level','suspicious'])
    assert.equal(tx[field], fixture.assessment[field]);
  assert.deepEqual(tx.shapContributions, fixture.assessment.explanation.contributions);
  assert.deepEqual(tx.reasons, fixture.assessment.reasons.map(reason => reason.message));
  assert.equal(tx.assessment, fixture.assessment);
});
test('risk never creates a human decision', () => {
  const tx = adaptTransaction({...fixture, decision: null});
  assert.equal(tx.status, 'QUEUED');
});
test('malformed assessment is rejected', () => {
  assert.throws(() => adaptTransaction({...fixture, assessment: {...fixture.assessment, risk_score: undefined}}));
});
test('score sends only six whitelisted fields and unwraps envelope', async () => {
  globalThis.fetch = async (url, init) => {
    assert.ok(url.endsWith('/api/v1/transactions/score'));
    assert.equal(init.method, 'POST');
    assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(), ['amount','recipient_id','sender_id','step','transaction_id','type']);
    return json(fixture, 201);
  };
  assert.equal((await apiClient.scoreTransaction({...fixture.transaction, oldbalanceOrg: 123})).id, fixture.transaction.transaction_id);
});
test('invalid input fails before making a request', async () => {
  globalThis.fetch = async () => { assert.fail('unexpected fetch'); };
  for (const invalid of [{amount:0},{step:1.5},{type:'WIRE'},{sender_id:''}])
    await assert.rejects(apiClient.scoreTransaction({...fixture.transaction,...invalid}));
});
test('list supports items envelope and empty lists', async () => {
  globalThis.fetch = async () => json({items:[fixture]});
  assert.equal((await apiClient.getTransactions()).length, 1);
  globalThis.fetch = async () => json({items:[]});
  assert.deepEqual(await apiClient.getTransactions(), []);
});
test('decision PATCH sends contract then refetches authoritative detail', async () => {
  const methods = [];
  globalThis.fetch = async (url, init) => {
    methods.push(init.method || 'GET');
    if(init.method === 'PATCH') {
      assert.ok(url.endsWith('/decision'));
      assert.deepEqual(JSON.parse(init.body), {decision:'APPROVE',note:'Reviewed',decided_by:'Demo investigator'});
      return json(fixture.decision);
    }
    return json(fixture);
  };
  const result = await apiClient.recordDecision(fixture.transaction.transaction_id, 'APPROVED', 'Reviewed');
  assert.deepEqual(methods, ['PATCH','GET']);
  assert.equal(result.status, 'APPROVED');
});
test('503, conflict and network errors never produce fallback scores or saved decisions', async () => {
  for(const status of [409,503]) {
    globalThis.fetch = async () => json({detail:'Test failure'}, status);
    await assert.rejects(apiClient.scoreTransaction(fixture.transaction), new RegExp('HTTP '+status));
    await assert.rejects(apiClient.recordDecision(fixture.transaction.transaction_id,'BLOCKED'));
  }
  globalThis.fetch = async () => {throw new TypeError('Failed to fetch');};
  await assert.rejects(apiClient.scoreTransaction(fixture.transaction), /Failed to fetch/);
});
test('unsupported decision extensions are rejected without HTTP', async () => {
  globalThis.fetch = async () => {assert.fail('unexpected fetch');};
  await assert.rejects(apiClient.recordDecision(fixture.transaction.transaction_id,'ESCALATED'), /Only APPROVE and BLOCK/);
});
test('unready health never advertises local fallback', async () => {
  globalThis.fetch = async () => json({status:'ok',database:'ok',ml:{status:'unavailable'}});
  const health = await apiClient.checkHealth();
  assert.equal(health.online, false);
  assert.equal(health.fallbackMode, false);
});
