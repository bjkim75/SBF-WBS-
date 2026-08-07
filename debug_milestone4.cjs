const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Print all headers for reference
console.log('=== All headers ===');
for (let c = 0; c <= range.e.c; c++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  if (cell && cell.v != null) {
    console.log(`  [${c}] "${String(cell.v).trim()}"`);
  }
}

// User says: "Excel에서 milestone = 빈칸으로 필터하면 IT Admin은 1건만 나온다"
// 그런데 실제 데이터를 보면 IT Admin의 221개 row 모두 milestone이 비어있음
// 
// 가설: Excel에서 사용자가 보는 "milestone"은 column index 18이 아닌 다른 column일 수 있다
// 또는: "구분" column이 IT Admin인 것과 "담당 분과"가 IT Admin인 것이 다를 수 있다
//
// Excel에서 IT Admin 행들의 milestone 빈칸을 확인하려면:
// 실제 Excel에서 milestone 컬럼에 병합 셀이 있어서 "빈칸"이 아닌 경우가 있을 수 있음
// SheetJS는 merged cell을 읽을 때 top-left cell의 값만 유지하고 나머지는 null로 둠
// → "병합된 셀의 milestone 값이 사라짐" 가설

// 하지만 merges = 0 이므로 해당 안 됨
// 다른 가설: IA 시트가 아닌 다른 시트에서 보고 있을 수 있음

// 확인 1: 전체 시트에서 milestone != 빈값인 row들 중 "IT Admin" 분과는 얼마나 되는가?
console.log('\n=== 전체 행에서 milestone이 있는 IT Admin 행 ===');
let msFilledItAdmin = 0;
for (let r = 1; r <= range.e.r; r++) {
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
  
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '';
  const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
  
  if (msVal !== '' && (divVal === 'IT Admin' || catVal === 'IT Admin')) {
    msFilledItAdmin++;
    console.log(`  Row ${r+1}: div="${divVal}", cat="${catVal}", ms="${msVal}"`);
  }
}
console.log(`Total: ${msFilledItAdmin}`);

// 확인 2: "담당 분과" 컬럼의 모든 distinct values
console.log('\n=== 담당 분과 distinct values ===');
const divValues = new Map();
for (let r = 1; r <= range.e.r; r++) {
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
  const val = divCell && divCell.v != null ? String(divCell.v).trim() : '(null/empty)';
  divValues.set(val, (divValues.get(val) || 0) + 1);
}
for (const [val, count] of [...divValues.entries()].sort()) {
  console.log(`  "${val}": ${count} rows`);
}

// 확인 3: "구분" 컬럼의 모든 distinct values
console.log('\n=== 구분 distinct values ===');
const catValues = new Map();
for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
  const val = catCell && catCell.v != null ? String(catCell.v).trim() : '(null/empty)';
  catValues.set(val, (catValues.get(val) || 0) + 1);
}
for (const [val, count] of [...catValues.entries()].sort()) {
  console.log(`  "${val}": ${count} rows`);
}

// 확인 4: IT Admin rows have 구분="IT Admin" — what are the ACTUAL category values in these rows?
// This tells us if these are actually "IA초안" that somehow show "IT Admin"
console.log('\n=== IT Admin 분과의 구분(category) 분포 ===');
const itAdminCats = new Map();
for (let r = 1; r <= range.e.r; r++) {
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
  const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '';
  
  if (divVal === 'IT Admin') {
    const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
    const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '(null/empty)';
    itAdminCats.set(catVal, (itAdminCats.get(catVal) || 0) + 1);
  }
}
for (const [val, count] of [...itAdminCats.entries()].sort()) {
  console.log(`  "${val}": ${count} rows`);
}

// 확인 5: 전체 milestone 빈값의 distinct 분과 분포 (이것이 "마일스톤 미지정" 그룹이 됨)
console.log('\n=== Milestone = 빈값인 행의 분과별 distinct 업무ID 수 ===');
const emptyMsByDivision = new Map(); // division → Set<workId>
for (let r = 1; r <= range.e.r; r++) {
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  
  if (msVal === '') {
    const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
    const wkCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
    const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
    
    const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '(null/empty)';
    const wkVal = wkCell && wkCell.v != null ? String(wkCell.v).trim() : '';
    const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
    
    // IA초안 제외, 업무ID 빈값 제외
    if (catVal === 'IA초안') continue;
    if (wkVal === '') continue;
    
    if (!emptyMsByDivision.has(divVal)) {
      emptyMsByDivision.set(divVal, new Set());
    }
    emptyMsByDivision.get(divVal).add(wkVal);
  }
}
console.log('  (After excluding IA초안 and empty workId)');
let totalDistinctEmpty = 0;
for (const [div, workIds] of [...emptyMsByDivision.entries()].sort()) {
  console.log(`  "${div}": ${workIds.size} distinct 업무IDs`);
  totalDistinctEmpty += workIds.size;
}
console.log(`  TOTAL: ${totalDistinctEmpty} distinct 업무IDs with empty milestone`);

// 확인 6: 전체 distinct 업무ID (excluding IA초안) 대비 milestone 빈값 비율
console.log('\n=== 전체 현황 ===');
const allWorkIds = new Set();
const emptyMsWorkIds = new Set();
for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
  const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
  if (catVal === 'IA초안') continue;
  
  const wkCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
  const wkVal = wkCell && wkCell.v != null ? String(wkCell.v).trim() : '';
  if (wkVal === '') continue;
  
  allWorkIds.add(wkVal);
  
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  if (msVal === '') {
    emptyMsWorkIds.add(wkVal);
  }
}
console.log(`전체 distinct 업무ID (excl IA초안): ${allWorkIds.size}`);
console.log(`Milestone=빈값 distinct 업무ID: ${emptyMsWorkIds.size}`);
console.log(`비율: ${(emptyMsWorkIds.size / allWorkIds.size * 100).toFixed(1)}%`);
