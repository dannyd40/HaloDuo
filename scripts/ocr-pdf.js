// OCR a scanned PDF using pdftoppm + tesseract
// Usage: node scripts/ocr-pdf.js <input.pdf> <output.md> [lang]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PDFTOPPM = String.raw`C:\Users\Daniel\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin\pdftoppm.exe`;
const TESSERACT = String.raw`C:\Program Files\Tesseract-OCR\tesseract.exe`;

const inputPdf = process.argv[2];
const outputMd = process.argv[3];
const lang = process.argv[4] || 'fra';

if (!inputPdf || !outputMd) {
  console.log('Usage: node scripts/ocr-pdf.js <input.pdf> <output.md> [lang]');
  process.exit(1);
}

const tmpDir = path.join(__dirname, '..', 'tmp-ocr');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Clean tmp dir
for (const f of fs.readdirSync(tmpDir)) fs.unlinkSync(path.join(tmpDir, f));

console.log('1/3 Conversion PDF → images (300 DPI)...');
execSync(`"${PDFTOPPM}" -png -r 300 "${inputPdf}" "${path.join(tmpDir, 'page')}"`, { stdio: 'inherit' });

const pages = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort();
console.log(`    ${pages.length} pages trouvées`);

console.log(`2/3 OCR avec Tesseract (langue: ${lang})...`);
let fullText = `# ${path.basename(inputPdf, '.pdf')}\n\n> OCR depuis ${path.basename(inputPdf)} (${pages.length} pages)\n\n`;

for (let i = 0; i < pages.length; i++) {
  const pagePath = path.join(tmpDir, pages[i]);
  const outBase = path.join(tmpDir, `ocr-${i}`);

  process.stdout.write(`    Page ${i + 1}/${pages.length}...\r`);
  execSync(`"${TESSERACT}" "${pagePath}" "${outBase}" -l ${lang} 2>nul`, { stdio: 'pipe' });

  const text = fs.readFileSync(outBase + '.txt', 'utf-8').trim();
  if (text.length > 20) {
    fullText += text + '\n\n---\n\n';
  }
}

console.log(`\n3/3 Écriture ${outputMd}...`);
fs.writeFileSync(outputMd, fullText, 'utf-8');

// Cleanup
for (const f of fs.readdirSync(tmpDir)) fs.unlinkSync(path.join(tmpDir, f));
fs.rmdirSync(tmpDir);

console.log(`Terminé ! ${Math.round(fullText.length / 1024)} KB de texte extrait.`);
