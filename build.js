// Builds the single-file app: inlines src/engine.js into src/app.html -> index.html
// Run with: node build.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'src/app.html'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, 'src/engine.js'), 'utf8');
if (!html.includes('/*ENGINE*/')) throw new Error('Placeholder /*ENGINE*/ not found in src/app.html');

fs.writeFileSync(path.join(__dirname, 'index.html'), html.replace('/*ENGINE*/', () => engine));
console.log('index.html built');
