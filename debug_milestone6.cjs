const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// The user says: Excel에서 milestone = 빈칸을 필터하면 IT Admin에서 1건만 나온다
// BUT: 우리 데이터에서 IT Admin 221행(212 distinct workID) 모두 milestone이 비어있음
//
// 가장 유력한 가설: 사용자가 보는 "구분" 컬럼에서 IT Admin을 다른 구분으로 인식
// 구분 = "IT Admin" 행들은 실제 워크 데이터가 아닌, IA초안처럼 별도 섹션일 수 있음
//
// 즉, 사용자의 기대:
// - "구분"이 "IA초안"뿐 아니라 "IT Admin"도 분석 제외 대상이어야 할 수 있음
// - 이 경우 실제 분석 대상은 "고객 여정", "운영 지원", "전략 기획"만

console.log('=== 구분(Category) 분석 ===\n');

// 구분별 milestone 분포
const categories = ['고객 여정', '운영 지원', '전략 기획', 'IT Admin', 'IA초안'];

for (const cat of categories) {
  let total = 0;
  let emptyMs = 0;
  const workIds = new Set();
  const emptyMsWorkIds = new Set();
  
  for (let r = 1; r <= range.e.r; r++) {
    const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
    const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
    
    if (catVal === cat) {
      total++;
      const wkCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
      const wkVal = wkCell && wkCell.v != null ? String(wkCell.v).trim() : '';
      if (wkVal) workIds.add(wkVal);
      
      const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
      const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
      if (msVal === '') {
        emptyMs++;
        if (wkVal) emptyMsWorkIds.add(wkVal);
      }
    }
  }
  
  console.log(`구분="${cat}":`);
  console.log(`  Total rows: ${total}`);
  console.log(`  Distinct 업무IDs: ${workIds.size}`);
  console.log(`  Empty milestone rows: ${emptyMs}`);
  console.log(`  Distinct 업무IDs with empty MS: ${emptyMsWorkIds.size}`);
  console.log('');
}

// 핵심 질문: "IT Admin" 구분의 행들이 "담당 분과" = "IT Admin"과 완전히 동일한지?
console.log('\n=== 구분="IT Admin" vs 담당 분과="IT Admin" 비교 ===');
const catItAdmin = new Set();
const divItAdmin = new Set();

for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
  const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
  const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
  const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '';
  
  if (catVal === 'IT Admin') catItAdmin.add(r);
  if (divVal === 'IT Admin') divItAdmin.add(r);
}

console.log(`구분=IT Admin rows: ${catItAdmin.size}`);
console.log(`담당 분과=IT Admin rows: ${divItAdmin.size}`);
console.log(`Same set? ${[...catItAdmin].every(r => divItAdmin.has(r)) && [...divItAdmin].every(r => catItAdmin.has(r))}`);

// 만약 구분="IT Admin"이 실제로 IT Admin 업무 전용 섹션이라면,
// 이를 IA초안처럼 제외하면 "마일스톤 미지정"에서 IT Admin 212건이 사라짐
// 그리고 나머지 분과 중 milestone=빈값인 것만 남음

console.log('\n=== 만약 구분="IT Admin" 제외 시 "마일스톤 미지정" 분포 ===');
const excludedCats = new Set(['IA초안', 'IT Admin']);
const emptyMsByDiv = new Map();

for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: 5 })];
  const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
  if (excludedCats.has(catVal)) continue;
  
  const wkCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
  const wkVal = wkCell && wkCell.v != null ? String(wkCell.v).trim() : '';
  if (!wkVal) continue;
  
  const msCell = sheet[XLSX.utils.encode_cell({ r, c: 18 })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  
  if (msVal === '') {
    const divCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
    const divVal = divCell && divCell.v != null ? String(divCell.v).trim() : '(null/empty)';
    if (!emptyMsByDiv.has(divVal)) emptyMsByDiv.set(divVal, new Set());
    emptyMsByDiv.get(divVal).add(wkVal);
  }
}

let total = 0;
for (const [div, wids] of [...emptyMsByDiv.entries()].sort()) {
  console.log(`  "${div}": ${wids.size} distinct 업무IDs`);
  total += wids.size;
}
console.log(`  TOTAL "마일스톤 미지정" (excluding IT Admin+IA초안): ${total}`);

// 여기서 "IT Admin" 분과가 나타날 수 있는가?
// 아니 — 구분="IT Admin"이면서 담당 분과="IT Admin"이 같은 세트니까
// IT Admin 제외하면 담당 분과 "IT Admin"도 사라짐

console.log('\n=== 결론 ===');
console.log('구분="IT Admin" (221행, 212 distinct 업무ID)은 전부 milestone이 비어있음.');
console.log('이들의 "담당 분과"도 "IT Admin".');
console.log('');
console.log('가능한 해결책:');
console.log('1) 구분="IT Admin"도 IA초안처럼 분석 제외 대상으로 설정');
console.log('2) 또는 현행 유지하되, 사용자에게 "IT Admin은 milestone 미지정이 정상"임을 안내');
console.log('3) 사용자의 "Excel에서 1건" 주장은 다른 필터 조건이 적용된 상태일 수 있음');
