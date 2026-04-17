const fs = require('fs');
const path = require('path');

const DIR = 'profile-3d-contrib';
const PIE_START = '<g transform="translate(40, 520)">';

function findMatchingClose(svg, startIdx, openTag) {
  let idx = startIdx + openTag.length;
  let depth = 1;
  while (idx < svg.length && depth > 0) {
    const nextOpen = svg.indexOf('<g', idx);
    const nextClose = svg.indexOf('</g>', idx);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      idx = nextOpen + 2;
    } else {
      depth--;
      idx = nextClose + 4;
    }
  }
  return idx;
}

function stripPie(svg) {
  const start = svg.indexOf(PIE_START);
  if (start === -1) return svg;
  const end = findMatchingClose(svg, start, PIE_START);
  if (end === -1) return svg;
  return svg.slice(0, start) + svg.slice(end);
}

function extractStats(chunk) {
  const contribMatch = chunk.match(/x="384" y="830"[^>]*>([0-9,]+)</);
  const starMatch = chunk.match(/x="650" y="830"[^>]*>([0-9,]+)</);
  const forkMatch = chunk.match(/x="772" y="830"[^>]*>([0-9,]+)</);
  if (!contribMatch) return null;
  return {
    contributions: contribMatch[1],
    stars: starMatch ? starMatch[1] : '0',
    forks: forkMatch ? forkMatch[1] : '0',
  };
}

function buildStatsBlock(stats, strongColor, fgColor) {
  return [
    '<g transform="translate(80, 580)">',
    `<text x="0" y="0" style="font-size: 96px; font-weight: bold;" fill="${strongColor}">${stats.contributions}</text>`,
    `<text x="0" y="32" style="font-size: 22px;" fill="${fgColor}">contributions past year</text>`,
    '<g transform="translate(0, 130)">',
    `<text x="0" y="0" style="font-size: 56px; font-weight: bold;" fill="${strongColor}">${stats.stars}</text>`,
    `<text x="0" y="28" style="font-size: 20px;" fill="${fgColor}">stars</text>`,
    '</g>',
    '<g transform="translate(180, 130)">',
    `<text x="0" y="0" style="font-size: 56px; font-weight: bold;" fill="${strongColor}">${stats.forks}</text>`,
    `<text x="0" y="28" style="font-size: 20px;" fill="${fgColor}">forks</text>`,
    '</g>',
    '</g>',
  ].join('');
}

function relocateBottomStats(svg, strongColor, fgColor) {
  const anchor = svg.indexOf('x="384" y="830"');
  if (anchor === -1) return svg;
  const bottomStart = svg.lastIndexOf('<g>', anchor);
  if (bottomStart === -1) return svg;
  const bottomEnd = findMatchingClose(svg, bottomStart, '<g>');
  if (bottomEnd === -1) return svg;
  const chunk = svg.slice(bottomStart, bottomEnd);
  const stats = extractStats(chunk);
  if (!stats) return svg;
  const block = buildStatsBlock(stats, strongColor, fgColor);
  return svg.slice(0, bottomStart) + block + svg.slice(bottomEnd);
}

function colorsFor(file) {
  if (file.includes('light')) return { strong: 'rgb(200,120,0)', fg: '#1f2328' };
  return { strong: 'rgb(255,200,55)', fg: '#eeeeff' };
}

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.svg')) continue;
  const p = path.join(DIR, file);
  const original = fs.readFileSync(p, 'utf8');
  const { strong, fg } = colorsFor(file);
  let svg = stripPie(original);
  svg = relocateBottomStats(svg, strong, fg);
  if (svg !== original) {
    fs.writeFileSync(p, svg);
    console.log(`processed ${file}`);
  }
}
