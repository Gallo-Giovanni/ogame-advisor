// Avvio: node tests/changelog.test.js
const assert = require('assert');
const CHANGELOG = require('../src/changelog.js');
const ids = CHANGELOG.map(u => u.id);
assert.strictEqual(new Set(ids).size, ids.length, 'gli id devono essere unici');
assert.deepStrictEqual(ids, [...ids].sort((a, b) => b - a), 'la voce più recente va in cima');
CHANGELOG.forEach(u => assert.ok(u.title && u.text && /^\d{4}-\d{2}-\d{2}$/.test(u.date), `entry ${u.id} incomplete`));
console.log('Novità OK:', ids.length, 'voci');
