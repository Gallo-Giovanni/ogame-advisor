// Run with: node tests/changelog.test.js
const assert = require('assert');
const CHANGELOG = require('../src/changelog.js');
const ids = CHANGELOG.map(u => u.id);
assert.strictEqual(new Set(ids).size, ids.length, 'ids must be unique');
assert.deepStrictEqual(ids, [...ids].sort((a, b) => b - a), 'newest entry first');
CHANGELOG.forEach(u => assert.ok(u.title && u.text && /^\d{4}-\d{2}-\d{2}$/.test(u.date), `entry ${u.id} incomplete`));
console.log('Changelog OK:', ids.length, 'entries');
