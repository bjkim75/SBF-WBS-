const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Print headers from col 19 (T) to col 27 (AB) to see exact header names and order
console.log('=== Phase Columns (T ~ AB) ===\n');
for (let c = 19; c <= 27; c++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  const letter = c < 26 ? String.fromCharCode(65 + c) : 'A' + String.fromCharCode(65 + c - 26);
  console.log(`  Col [${c}] ${letter}: "${cell ? cell.v : '(empty)'}"`);
}

// Excel serial to date
function serialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  const epoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// For a specific milestone (#1-1), show all phase dates for a few sample rows
console.log('\n\n=== Sample: Milestone #1-1 Phase Dates ===\n');
const msColIdx = 18;
const categoryIdx = 5;
let sampleCount = 0;

for (let r = 1; r <= range.e.r && sampleCount < 5; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: categoryIdx })];
  if (catCell && String(catCell.v).trim() === 'IA초안') continue;
  
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  if (!msCell || String(msCell.v).trim() !== '#1-1') continue;

  const workIdCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
  console.log(`Row ${r+1} (업무ID: ${workIdCell ? workIdCell.v : '?'}):`);
  
  for (let c = 19; c <= 27; c++) {
    const hdr = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    const val = cell && typeof cell.v === 'number' ? serialToDate(cell.v) : '(empty)';
    console.log(`  ${String(hdr ? hdr.v : '').padEnd(20)}: ${val}`);
  }
  console.log('');
  sampleCount++;
}

// Aggregate: for all non-IA초안 rows with milestone #1-1,
// show the average/common date for each phase column
console.log('\n=== All #1-1 rows: Phase date distribution ===\n');
const phaseDates = {}; // col → Set of date values
for (let c = 19; c <= 27; c++) {
  phaseDates[c] = new Set();
}

for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: categoryIdx })];
  if (catCell && String(catCell.v).trim() === 'IA초안') continue;
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  if (!msCell || String(msCell.v).trim() !== '#1-1') continue;

  for (let c = 19; c <= 27; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    if (cell && typeof cell.v === 'number') {
      phaseDates[c].add(cell.v);
    }
  }
}

for (let c = 19; c <= 27; c++) {
  const hdr = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  const dates = [...phaseDates[c]].sort();
  const dateStrs = dates.map(serialToDate);
  console.log(`  ${String(hdr ? hdr.v : '').padEnd(20)}: ${dateStrs.length > 0 ? dateStrs.join(', ') : '(no data)'}`);
}

// Also check: are 업무Flow피드백 and 업무Flow보완 on the same date?
console.log('\n\n=== 피드백 vs 보완 날짜 비교 (전체 데이터) ===\n');
let sameCount = 0;
let diffCount = 0;
let bothFilledCount = 0;

// Need to identify which column is 피드백 and which is 보완
// From headers: col 19=업무 Flow 초안, col 20=?, col 21=?, col 22=?
// Let's check
const col20Hdr = sheet[XLSX.utils.encode_cell({ r: 0, c: 20 })];
const col21Hdr = sheet[XLSX.utils.encode_cell({ r: 0, c: 21 })];
const col22Hdr = sheet[XLSX.utils.encode_cell({ r: 0, c: 22 })];
console.log(`Col 20 header: "${col20Hdr ? col20Hdr.v : ''}"`)
console.log(`Col 21 header: "${col21Hdr ? col21Hdr.v : ''}"`)
console.log(`Col 22 header: "${col22Hdr ? col22Hdr.v : ''}"`)

// Find 피드백 and 보완 columns
let feedbackCol = -1;
let supplementCol = -1;
for (let c = 19; c <= 27; c++) {
  const hdr = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  if (hdr) {
    const val = String(hdr.v).trim();
    if (val.includes('피드백')) feedbackCol = c;
    if (val.includes('보완')) supplementCol = c;
  }
}
console.log(`\n피드백 col: ${feedbackCol}, 보완 col: ${supplementCol}`);

for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: categoryIdx })];
  if (catCell && String(catCell.v).trim() === 'IA초안') continue;
  
  const fbCell = sheet[XLSX.utils.encode_cell({ r, c: feedbackCol })];
  const spCell = sheet[XLSX.utils.encode_cell({ r, c: supplementCol })];
  
  if (fbCell && typeof fbCell.v === 'number' && spCell && typeof spCell.v === 'number') {
    bothFilledCount++;
    if (fbCell.v === spCell.v) sameCount++;
    else diffCount++;
  }
}

console.log(`\n피드백 & 보완 모두 값 있는 행: ${bothFilledCount}`);
console.log(`  같은 날짜: ${sameCount} (${bothFilledCount > 0 ? ((sameCount/bothFilledCount)*100).toFixed(1) : 0}%)`);
console.log(`  다른 날짜: ${diffCount}`);
