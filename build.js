// Crea l'app in un solo file: inserisce src/lifeforms.js, src/engine.js, src/importer.js e src/changelog.js in src/app.html -> index.html
// Avvio: node build.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'src/app.html'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, 'src/engine.js'), 'utf8');
const changelog = fs.readFileSync(path.join(__dirname, 'src/changelog.js'), 'utf8');
const lifeforms = fs.readFileSync(path.join(__dirname, 'src/lifeforms.js'), 'utf8');
const importer = fs.readFileSync(path.join(__dirname, 'src/importer.js'), 'utf8');
for (const ph of ['/*LIFEFORMS*/', '/*ENGINE*/', '/*IMPORTER*/', '/*CHANGELOG*/'])
  if (!html.includes(ph)) throw new Error(`Segnaposto ${ph} non trovato in src/app.html`);

fs.writeFileSync(path.join(__dirname, 'index.html'), html.replace('/*LIFEFORMS*/', () => lifeforms).replace('/*ENGINE*/', () => engine).replace('/*IMPORTER*/', () => importer).replace('/*CHANGELOG*/', () => changelog));
console.log('index.html creato');
