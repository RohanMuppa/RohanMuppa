const fs = require('fs');
const path = require('path');

const DIR = 'profile-3d-contrib';
const PIE_START = '<g transform="translate(40, 520)">';
const RADAR_START = '<g transform="translate(980, 284.5)">';

const STAR_PATH = '<path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z" fill="__FG__"></path>';

const FORK_PATH = '<path fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z" fill="__FG__"></path>';

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

function stripRadar(svg) {
  const start = svg.indexOf(RADAR_START);
  if (start === -1) return svg;
  const end = findMatchingClose(svg, start, RADAR_START);
  if (end === -1) return svg;
  return svg.slice(0, start) + svg.slice(end);
}

function extractStats(chunk) {
  const contribMatch = chunk.match(/x="384" y="830"[^>]*>([0-9,]+)</);
  const starMatch = chunk.match(/x="650" y="830"[^>]*>([0-9,]+)</);
  const forkMatch = chunk.match(/x="772" y="830"[^>]*>([0-9,]+)</);
  const dateMatch = chunk.match(/y="20"[^>]*>([^<]+)</);
  if (!contribMatch) return null;
  return {
    contributions: contribMatch[1],
    stars: starMatch ? starMatch[1] : '0',
    forks: forkMatch ? forkMatch[1] : '0',
    dateRange: dateMatch ? dateMatch[1] : '',
  };
}

function buildStatsBlock(stats, strongColor, fgColor, weakColor) {
  const star = STAR_PATH.replace('__FG__', fgColor);
  const fork = FORK_PATH.replace('__FG__', fgColor);
  return [
    '<g transform="translate(80, 600)">',
    `<text x="0" y="0" style="font-size: 96px; font-weight: bold;" fill="${strongColor}">${stats.contributions}</text>`,
    `<text x="0" y="32" style="font-size: 22px;" fill="${fgColor}">contributions past year</text>`,
    '<g transform="translate(0, 90)">',
    '<g transform="scale(2.2)">' + star + '</g>',
    `<text x="50" y="30" style="font-size: 36px; font-weight: bold;" fill="${fgColor}">${stats.stars}</text>`,
    '<g transform="translate(140, 0) scale(2.2)">' + fork + '</g>',
    `<text x="190" y="30" style="font-size: 36px; font-weight: bold;" fill="${fgColor}">${stats.forks}</text>`,
    '</g>',
    '</g>',
    stats.dateRange
      ? `<text style="font-size: 16px;" x="1260" y="20" dominant-baseline="hanging" text-anchor="end" fill="${weakColor}">${stats.dateRange}</text>`
      : '',
  ].join('');
}

function relocateBottomStats(svg, strongColor, fgColor, weakColor) {
  const anchor = svg.indexOf('x="384" y="830"');
  if (anchor === -1) return svg;
  const bottomStart = svg.lastIndexOf('<g>', anchor);
  if (bottomStart === -1) return svg;
  const bottomEnd = findMatchingClose(svg, bottomStart, '<g>');
  if (bottomEnd === -1) return svg;
  const chunk = svg.slice(bottomStart, bottomEnd);
  const stats = extractStats(chunk);
  if (!stats) return svg;
  const block = buildStatsBlock(stats, strongColor, fgColor, weakColor);
  return svg.slice(0, bottomStart) + block + svg.slice(bottomEnd);
}

function colorsFor(file) {
  if (file.includes('light')) return { strong: 'rgb(200,120,0)', fg: '#1f2328', weak: '#656d76' };
  return { strong: 'rgb(255,200,55)', fg: '#eeeeff', weak: '#aaaaaa' };
}

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.svg')) continue;
  const p = path.join(DIR, file);
  const original = fs.readFileSync(p, 'utf8');
  const { strong, fg, weak } = colorsFor(file);
  let svg = stripPie(original);
  svg = stripRadar(svg);
  svg = relocateBottomStats(svg, strong, fg, weak);
  if (svg !== original) {
    fs.writeFileSync(p, svg);
    console.log(`processed ${file}`);
  }
}
