const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Get headers
const headers = [];
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  headers.push(cell && cell.v != null ? String(cell.v).trim() : '');
}

// Find key column indices
const msColIdx = headers.findIndex(h => h.toLowerCase() === 'milestone'); // 18
const workIdIdx = headers.findIndex(h => h === '업무ID'); // 1
const subIdIdx = headers.findIndex(h => h === 'SUB ID'); // 2
const divisionIdx = headers.findIndex(h => h === '담당 분과'); // 4
const depth3Idx = headers.findIndex(h => h === '3Depth'); // 8
const assigneeRIdx = headers.findIndex(h => h.includes('책임 담당자')); // 36

console.log(`Column indices: milestone=${msColIdx}, workId=${workIdIdx}, subId=${subIdIdx}, division=${divisionIdx}, depth3=${depth3Idx}, assigneeR=${assigneeRIdx}`);

// Find rows where milestone is exactly "유선" (without any number suffix)
console.log(`\n=== Rows where milestone = "유선" (bare) ===\n`);
for (let r = 1; r <= range.e.r; r++) {
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  
  if (msVal === '유선') {
    const row = r + 1; // 1-indexed
    const getVal = (colIdx) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: colIdx })];
      return cell && cell.v != null ? String(cell.v).trim() : '(null)';
    };
    
    console.log(`Row ${row}:`);
    console.log(`  업무ID: ${getVal(workIdIdx)}`);
    console.log(`  SUB ID: ${getVal(subIdIdx)}`);
    console.log(`  담당 분과: ${getVal(divisionIdx)}`);
    console.log(`  3Depth: ${getVal(depth3Idx)}`);
    console.log(`  milestone: "${msVal}"`);
    console.log(`  책임 담당자: ${getVal(assigneeRIdx)}`);
    console.log('');
  }
}

// Also show: how many distinct 업무IDs have milestone "유선"?
const workIdsWithBareYuseon = new Set();
for (let r = 1; r <= range.e.r; r++) {
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  
  if (msVal === '유선') {
    const wid = sheet[XLSX.utils.encode_cell({ r, c: workIdIdx })];
    if (wid && wid.v != null) {
      workIdsWithBareYuseon.add(String(wid.v).trim());
    }
  }
}
console.log(`\n업무ID count with milestone="유선": ${workIdsWithBareYuseon.size}`);
console.log(`업무IDs: ${[...workIdsWithBareYuseon].join(', ')}`);
