import test from 'node:test';
import assert from 'node:assert';
import { decodeJwtPayload, isBackendTokenExpired } from './backendToken';

function fakeJwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.firma`;
}

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const sec = (ms: number) => Math.floor(ms / 1000);

test('decodeJwtPayload legge sub, role ed exp', () => {
  const p = decodeJwtPayload(fakeJwt({ sub: 'a@b.it', role: 'admin', exp: 123 }));
  assert.deepStrictEqual(p, { sub: 'a@b.it', role: 'admin', exp: 123 });
});

test('decodeJwtPayload restituisce null per token malformati', () => {
  assert.strictEqual(decodeJwtPayload('non-un-jwt'), null);
  assert.strictEqual(decodeJwtPayload('a.%%%.c'), null);
});

test('token scaduto (es. emesso 63 giorni fa con validità 60) è scaduto', () => {
  const exp = sec(NOW - 3 * 24 * 3600 * 1000);
  assert.strictEqual(isBackendTokenExpired(fakeJwt({ exp }), NOW), true);
});

test('token valido per altri 30 giorni non è scaduto', () => {
  const exp = sec(NOW + 30 * 24 * 3600 * 1000);
  assert.strictEqual(isBackendTokenExpired(fakeJwt({ exp }), NOW), false);
});

test('token che scade entro il margine di 1 minuto è considerato scaduto', () => {
  const exp = sec(NOW + 30 * 1000);
  assert.strictEqual(isBackendTokenExpired(fakeJwt({ exp }), NOW), true);
});

test('token senza exp leggibile non chiude la sessione', () => {
  assert.strictEqual(isBackendTokenExpired(fakeJwt({ sub: 'x' }), NOW), false);
  assert.strictEqual(isBackendTokenExpired('non-un-jwt', NOW), false);
});
