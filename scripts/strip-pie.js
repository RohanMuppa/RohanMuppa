const fs = require('fs');
const path = require('path');

const DIR = 'profile-3d-contrib';
const PIE_START = '<g transform="translate(40, 520)">';

function stripPie(svg) {
  const start = svg.indexOf(PIE_START);
  if (start === -1) return svg;

  let idx = start + PIE_START.length;
  let depth = 1;
  while (idx < svg.length && depth > 0) {
    const nextOpen = svg.indexOf('<g', idx);
    const nextClose = svg.indexOf('</g>', idx);
    if (nextClose === -1) return svg;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      idx = nextOpen + 2;
    } else {
      depth--;
      idx = nextClose + 4;
    }
  }
  return svg.slice(0, start) + svg.slice(idx);
}

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.svg')) continue;
  const p = path.join(DIR, file);
  const original = fs.readFileSync(p, 'utf8');
  const stripped = stripPie(original);
  if (stripped !== original) {
    fs.writeFileSync(p, stripped);
    console.log(`stripped pie from ${file}`);
  }
}
