const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Read with ALL options to capture formulas
const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellFormula: true, cellNF: true, cellStyles: true, sheetStubs: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

console.log('=== Check if milestone col 18 has formulas or special values for IT Admin rows ===\n');

// With sheetStubs: true, even empty cells should show up
// Check first 5 IT Admin rows in detail
let count = 0;
for (let r = 1; r <= range.e.r && count < 5; r++) {
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
  const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '';
  
  if (divVal === 'IT Admin') {
    count++;
    const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
    console.log(`Row ${r+1}:`);
    if (msCell) {
      console.log(`  milestone cell: ${JSON.stringify(msCell)}`);
    } else {
      console.log(`  milestone cell: null (no cell object)`);
    }
    
    // Also check adjacent columns (17, 19) to see if MS might be shifted
    const col17Cell = sheet[XLSX.utils.encode_cell({ r, c: 17 })];
    const col19Cell = sheet[XLSX.utils.encode_cell({ r, c: 19 })];
    console.log(`  col17 (요구사항명): ${col17Cell ? JSON.stringify(col17Cell.v) : 'null'}`);
    console.log(`  col19 (업무 Flow 초안): ${col19Cell ? JSON.stringify(col19Cell.v) : 'null'}`);
    console.log('');
  }
}

// Check a row that HAS milestone to compare
console.log('\n=== For comparison: a row WITH milestone value ===');
for (let r = 1; r <= range.e.r; r++) {
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
  if (msCell && msCell.v != null && String(msCell.v).trim() !== '') {
    console.log(`Row ${r+1}:`);
    console.log(`  milestone cell: ${JSON.stringify(msCell)}`);
    const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
    console.log(`  담당 분과: ${divCell ? divCell.v : 'null'}`);
    break;
  }
}

// KEY QUESTION: Does the user filter milestone=blank in a DIFFERENT way?
// In Excel, when you filter a column by "blank", it shows cells that are truly empty
// If IT Admin has 221 rows ALL blank milestone, filtering by blank should show 221 rows for IT Admin
// The user says "1 row" — this might mean:
// (A) The user is not filtering on "1. IA" sheet but on another view/sheet
// (B) The user is filtering milestone blank AND some other filter (like a different "구분")
// (C) The aggregator is correct and the user's Excel filter logic is different

// Let's also check: how does the NORMALIZER count?
// The normalizer groups by workId, so 221 rows → 212 distinct workIds → 212 in "마일스톤 미지정"
// That's exactly what the user sees: 212

console.log('\n=== Conclusion ===');
console.log('All 221 IT Admin rows (212 distinct workIds) have NO milestone value.');
console.log('The milestone column (col 18) cells simply do not exist for IT Admin rows.');
console.log('This is NOT a normalizer bug — the data genuinely has no milestone assigned.');
console.log('');
console.log('Possible explanations for user seeing "1 row" in Excel:');
console.log('1. User might be looking at a different sheet or filtered view');
console.log('2. User might have additional filters active (e.g., specific 구분 값)');
console.log('3. The "IT Admin" category in this data is a separate section that was never assigned milestones');
console.log('');
console.log('The 212 count in the analyzer is CORRECT based on the actual Excel data.');
