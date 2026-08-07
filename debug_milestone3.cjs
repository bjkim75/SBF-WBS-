const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Column indices (verified from previous debug)
const msColIdx = 18;      // milestone
const workIdIdx = 1;      // 업무ID
const divisionIdx = 4;    // 담당 분과
const categoryIdx = 5;    // 구분

console.log('=== Analysis: IT Admin division with milestone issues ===\n');

// Find all rows where division = "IT Admin"
let itAdminRows = [];
for (let r = 1; r <= range.e.r; r++) {
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: divisionIdx })];
  const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '';
  
  if (divVal === 'IT Admin') {
    const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
    const wkCell = sheet[XLSX.utils.encode_cell({ r, c: workIdIdx })];
    const catCell = sheet[XLSX.utils.encode_cell({ r, c: categoryIdx })];
    
    itAdminRows.push({
      row: r + 1,
      workId: wkCell && wkCell.v != null ? String(wkCell.v).trim() : '(null)',
      category: catCell && catCell.v != null ? String(catCell.v).trim() : '(null)',
      milestoneRaw: msCell ? msCell.v : null,
      milestoneType: msCell ? msCell.t : 'missing',
      milestoneStr: msCell && msCell.v != null ? String(msCell.v).trim() : '(null/empty)',
      cellExists: !!msCell,
    });
  }
}

console.log(`Total IT Admin rows: ${itAdminRows.length}`);

// Count by milestone value
const msCounts = new Map();
for (const row of itAdminRows) {
  const key = row.milestoneStr;
  msCounts.set(key, (msCounts.get(key) || 0) + 1);
}

console.log(`\nMilestone distribution for IT Admin:`);
for (const [val, count] of [...msCounts.entries()].sort()) {
  console.log(`  "${val}" → ${count} rows`);
}

// How many have milestone = null/empty vs filled?
const emptyMs = itAdminRows.filter(r => r.milestoneRaw == null || String(r.milestoneRaw).trim() === '');
const filledMs = itAdminRows.filter(r => r.milestoneRaw != null && String(r.milestoneRaw).trim() !== '');
console.log(`\nEmpty/null milestone: ${emptyMs.length} rows`);
console.log(`Filled milestone: ${filledMs.length} rows`);

// Show first 10 IT Admin rows with empty milestone
console.log(`\nFirst 10 IT Admin rows with EMPTY milestone:`);
for (const row of emptyMs.slice(0, 10)) {
  console.log(`  Row ${row.row}: workId=${row.workId}, category=${row.category}, ms.raw=${JSON.stringify(row.milestoneRaw)}, ms.type=${row.milestoneType}, cellExists=${row.cellExists}`);
}

// Show first 10 IT Admin rows with filled milestone
console.log(`\nFirst 10 IT Admin rows with FILLED milestone:`);
for (const row of filledMs.slice(0, 10)) {
  console.log(`  Row ${row.row}: workId=${row.workId}, category=${row.category}, ms="${row.milestoneStr}", ms.raw=${JSON.stringify(row.milestoneRaw)}`);
}

// Also check: how many IT Admin rows are IA초안 (should be excluded)?
const iaRows = itAdminRows.filter(r => r.category === 'IA초안');
console.log(`\nIT Admin + IA초안: ${iaRows.length} rows (these should be excluded)`);

// After excluding IA초안, how many have empty milestone?
const nonIaRows = itAdminRows.filter(r => r.category !== 'IA초안');
const nonIaEmpty = nonIaRows.filter(r => r.milestoneRaw == null || String(r.milestoneRaw).trim() === '');
console.log(`IT Admin (excluding IA초안): ${nonIaRows.length} total, ${nonIaEmpty.length} with empty milestone`);

// DISTINCT workIds for IT Admin with empty milestone (after IA초안 exclusion)
const distinctWorkIds = new Set(nonIaEmpty.map(r => r.workId));
console.log(`DISTINCT 업무IDs with empty milestone (IT Admin, excl IA초안): ${distinctWorkIds.size}`);
console.log(`First 10: ${[...distinctWorkIds].slice(0, 10).join(', ')}`);

// Check: what percentage of IT Admin rows have NO milestone at all?
console.log(`\n=== Summary ===`);
console.log(`IT Admin total rows: ${itAdminRows.length}`);
console.log(`IT Admin IA초안 rows: ${iaRows.length}`);
console.log(`IT Admin valid rows (excl IA초안): ${nonIaRows.length}`);
console.log(`IT Admin valid + empty MS: ${nonIaEmpty.length}`);
console.log(`IT Admin valid + filled MS: ${nonIaRows.length - nonIaEmpty.length}`);
console.log(`DISTINCT workIds (valid + empty MS): ${distinctWorkIds.size}`);

// NOW check: maybe the issue is that milestone column is at a DIFFERENT index in the actual data
// Let's verify by checking what the actual header at index 18 says
const headerCell = sheet[XLSX.utils.encode_cell({ r: 0, c: msColIdx })];
console.log(`\nHeader at index 18: "${headerCell ? headerCell.v : 'MISSING'}"`);

// Also check ALL columns for anything that looks like a milestone value in row 2 (first data row)
console.log(`\nAll non-null cells in first IT Admin row (row ${itAdminRows[0]?.row}):`);
if (itAdminRows[0]) {
  const r = itAdminRows[0].row - 1; // 0-indexed
  for (let c = 0; c <= Math.min(range.e.c, 45); c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    if (cell && cell.v != null) {
      const hdr = sheet[XLSX.utils.encode_cell({ r: 0, c })];
      const hdrName = hdr ? String(hdr.v).trim() : `col${c}`;
      console.log(`  [${c}] ${hdrName}: ${JSON.stringify(cell.v)} (type: ${cell.t})`);
    }
  }
}

// Additionally, check if there are MERGED CELLS in the milestone column
// XLSX merges are stored in sheet['!merges']
const merges = sheet['!merges'] || [];
const msMerges = merges.filter(m => m.s.c <= msColIdx && m.e.c >= msColIdx);
console.log(`\n=== Merged cells overlapping milestone column (col ${msColIdx}) ===`);
console.log(`Total merges in sheet: ${merges.length}`);
console.log(`Merges overlapping milestone column: ${msMerges.length}`);
if (msMerges.length > 0) {
  console.log(`First 20 milestone merges:`);
  for (const m of msMerges.slice(0, 20)) {
    console.log(`  Rows ${m.s.r+1}-${m.e.r+1}, Cols ${m.s.c}-${m.e.c}`);
    // Show value of top-left cell
    const topCell = sheet[XLSX.utils.encode_cell({ r: m.s.r, c: msColIdx })];
    console.log(`    Top cell value: ${topCell ? JSON.stringify(topCell.v) : '(null/missing)'}`);
  }
}

// Check how many IT Admin rows fall within a merge range (milestone col)
let itAdminInMerge = 0;
for (const row of itAdminRows) {
  const rowIdx = row.row - 1; // 0-indexed
  for (const m of msMerges) {
    if (rowIdx >= m.s.r && rowIdx <= m.e.r) {
      itAdminInMerge++;
      break;
    }
  }
}
console.log(`IT Admin rows within a milestone merge: ${itAdminInMerge}`);
