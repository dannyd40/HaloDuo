#!/usr/bin/env node
// Convertit un ou plusieurs PDFs en Markdown
// Usage: node scripts/pdf-to-md.js <fichier.pdf> [fichier2.pdf ...]
// Ou:    node scripts/pdf-to-md.js --all  (convertit tous les PDFs)

const fs = require('fs');
const path = require('path');
const pdfParse = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pdf-parse'));

async function convertir(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const { text, numpages, info } = await pdfParse(buffer);

  // Nettoyage basique du texte extrait
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')       // max 3 newlines
    .replace(/[ \t]+\n/g, '\n')          // trailing spaces
    .replace(/\n[ \t]+/g, '\n')          // leading spaces on lines
    .replace(/([a-zàâéèêëïîôùûüç,])\n([a-zàâéèêëïîôùûüç])/gi, '$1 $2')  // rejoin broken lines

  const titre = info?.Title || path.basename(pdfPath, '.pdf');
  const mdContent = `# ${titre}\n\n> Converti depuis ${path.basename(pdfPath)} (${numpages} pages)\n\n${cleaned}`;

  const mdPath = pdfPath.replace(/\.pdf$/i, '.md');
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✓ ${path.basename(pdfPath)} → ${path.basename(mdPath)} (${numpages} pages, ${Math.round(mdContent.length / 1024)} KB)`);
  return mdPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/pdf-to-md.js <fichier.pdf> [fichier2.pdf ...]');
    console.log('       node scripts/pdf-to-md.js --all');
    process.exit(1);
  }

  let files;
  if (args[0] === '--all') {
    const baseDir = path.join(__dirname, '..', 'backend', 'data', 'pdfs');
    files = [];
    for (const cadre of fs.readdirSync(baseDir)) {
      const cadreDir = path.join(baseDir, cadre);
      if (!fs.statSync(cadreDir).isDirectory()) continue;
      for (const f of fs.readdirSync(cadreDir)) {
        if (f.endsWith('.pdf')) files.push(path.join(cadreDir, f));
      }
    }
    // Also check root pdfs/ folder
    const rootPdfs = path.join(__dirname, '..', 'pdfs');
    if (fs.existsSync(rootPdfs)) {
      for (const f of fs.readdirSync(rootPdfs)) {
        if (f.endsWith('.pdf')) files.push(path.join(rootPdfs, f));
      }
    }
  } else {
    files = args.map(f => path.resolve(f));
  }

  if (files.length === 0) {
    console.log('Aucun PDF trouvé.');
    return;
  }

  console.log(`Conversion de ${files.length} PDF(s)...\n`);
  for (const f of files) {
    try {
      await convertir(f);
    } catch (err) {
      console.error(`✗ ${path.basename(f)}: ${err.message}`);
    }
  }
}

main();
