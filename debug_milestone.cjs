const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(require('fs').readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Find milestone column by header
let msColIdx = -1;
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  if (cell && String(cell.v).trim().toLowerCase() === 'milestone') {
    msColIdx = c;
    break;
  }
}
console.log(`Milestone column index: ${msColIdx}`);

// Collect all milestone values with their row info
const milestoneValues = new Map(); // value → [rows]
for (let r = 1; r <= range.e.r; r++) {
  const cell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  if (cell && cell.v != null) {
    const val = String(cell.v).trim();
    if (!milestoneValues.has(val)) {
      milestoneValues.set(val, []);
    }
    milestoneValues.get(val).push(r + 1); // 1-indexed
  }
}

console.log(`\nTotal distinct milestone values: ${milestoneValues.size}`);
console.log(`\nAll milestone values:`);
for (const [val, rows] of [...milestoneValues.entries()].sort()) {
  console.log(`  "${val}" (${rows.length} rows)`);
}

// Find values containing "유선"
console.log(`\n\n=== Values containing "유선" ===`);
for (const [val, rows] of milestoneValues) {
  if (val.includes('유선') || val.includes('유') || val.includes('선')) {
    console.log(`\nValue: "${val}"`);
    console.log(`  JSON: ${JSON.stringify(val)}`);
    console.log(`  Length: ${val.length}`);
    console.log(`  Char codes: ${[...val].map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
    console.log(`  Row count: ${rows.length}`);
    console.log(`  First 10 rows: ${rows.slice(0, 10).join(', ')}`);
  }
}

// Also show similar values that might be confused
console.log(`\n\n=== Values that might look similar ===`);
for (const [val, rows] of milestoneValues) {
  if (val.includes('유') || val.includes('선') || val.includes('SKB')) {
    console.log(`  "${val}" → ${rows.length} rows, charCodes: ${[...val].map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
  }
}
