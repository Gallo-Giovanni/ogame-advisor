// Builds the single-file app: inlines src/lifeforms.js, src/engine.js and src/changelog.js into src/app.html -> index.html
// Run with: node build.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'src/app.html'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, 'src/engine.js'), 'utf8');
const changelog = fs.readFileSync(path.join(__dirname, 'src/changelog.js'), 'utf8');
const lifeforms = fs.readFileSync(path.join(__dirname, 'src/lifeforms.js'), 'utf8');
for (const ph of ['/*LIFEFORMS*/', '/*ENGINE*/', '/*CHANGELOG*/'])
  if (!html.includes(ph)) throw new Error(`Placeholder ${ph} not found in src/app.html`);

fs.writeFileSync(path.join(__dirname, 'index.html'), html.replace('/*LIFEFORMS*/', () => lifeforms).replace('/*ENGINE*/', () => engine).replace('/*CHANGELOG*/', () => changelog));
console.log('index.html built');
