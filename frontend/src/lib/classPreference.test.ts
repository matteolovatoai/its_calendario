import test from 'node:test';
import assert from 'node:assert';
import { pickSelectedClassId } from './classPreference';

const IDS = ['gemma-id', 'lambda-id'];

test('senza link né cookie: prima classe', () => {
  assert.strictEqual(pickSelectedClassId(IDS, null, null), 'gemma-id');
});

test('cookie valido: classe salvata', () => {
  assert.strictEqual(pickSelectedClassId(IDS, null, 'lambda-id'), 'lambda-id');
});

test('link valido vince sul cookie', () => {
  assert.strictEqual(pickSelectedClassId(IDS, 'gemma-id', 'lambda-id'), 'gemma-id');
});

test('link non valido: si usa il cookie', () => {
  assert.strictEqual(pickSelectedClassId(IDS, 'garbage', 'lambda-id'), 'lambda-id');
});

test('cookie di una classe cancellata: prima classe', () => {
  assert.strictEqual(pickSelectedClassId(IDS, null, 'cancellata'), 'gemma-id');
});

test('nessuna classe: null', () => {
  assert.strictEqual(pickSelectedClassId([], 'x', 'y'), null);
});
