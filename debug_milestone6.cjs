const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'sample-data', 'SBF_Framework.xlsx');
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellNF: true });
const sheet = workbook.Sheets['1. IA'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// Column indices
const msColIdx = 18;      // milestone
const startColIdx = 19;   // 업무 Flow 초안 (Start)
const finishColIdx = 27;  // figma 디자인 (Finish)
const workIdIdx = 1;      // 업무ID
const categoryIdx = 5;    // 구분
const divisionIdx = 4;    // 담당 분과

// Excel serial to date string
function serialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  const epoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Collect data per milestone
const milestones = new Map(); // ms → { starts: [], finishes: [], workIds: Set }

for (let r = 1; r <= range.e.r; r++) {
  const catCell = sheet[XLSX.utils.encode_cell({ r, c: categoryIdx })];
  const catVal = catCell && catCell.v != null ? String(catCell.v).trim() : '';
  if (catVal === 'IA초안') continue; // exclude

  const msCell = sheet[XLSX.utils.encode_cell({ r, c: msColIdx })];
  const msVal = msCell && msCell.v != null ? String(msCell.v).trim() : '';
  if (!msVal) continue;

  const startCell = sheet[XLSX.utils.encode_cell({ r, c: startColIdx })];
  const finishCell = sheet[XLSX.utils.encode_cell({ r, c: finishColIdx })];
  const workIdCell = sheet[XLSX.utils.encode_cell({ r, c: workIdIdx })];
  
  const startVal = startCell && typeof startCell.v === 'number' ? startCell.v : null;
  const finishVal = finishCell && typeof finishCell.v === 'number' ? finishCell.v : null;
  const workId = workIdCell && workIdCell.v != null ? String(workIdCell.v).trim() : '';

  if (!milestones.has(msVal)) {
    milestones.set(msVal, { starts: [], finishes: [], workIds: new Set() });
  }
  const ms = milestones.get(msVal);
  if (startVal) ms.starts.push(startVal);
  if (finishVal) ms.finishes.push(finishVal);
  if (workId) ms.workIds.add(workId);
}

// Analyze each milestone
console.log('=== Milestone Date Structure Analysis ===\n');
console.log(`Total milestones: ${milestones.size}\n`);

const msData = [];
for (const [name, data] of milestones) {
  const minStart = data.starts.length > 0 ? Math.min(...data.starts) : null;
  const maxStart = data.starts.length > 0 ? Math.max(...data.starts) : null;
  const minFinish = data.finishes.length > 0 ? Math.min(...data.finishes) : null;
  const maxFinish = data.finishes.length > 0 ? Math.max(...data.finishes) : null;
  
  msData.push({
    name,
    workCount: data.workIds.size,
    startCount: data.starts.length,
    finishCount: data.finishes.length,
    minStart: serialToDate(minStart),
    maxStart: serialToDate(maxStart),
    minFinish: serialToDate(minFinish),
    maxFinish: serialToDate(maxFinish),
    startSpread: minStart && maxStart ? maxStart - minStart : 0,
    finishSpread: minFinish && maxFinish ? maxFinish - minFinish : 0,
    duration: minStart && maxFinish ? maxFinish - minStart : null,
  });
}

// Sort by earliest start date
msData.sort((a, b) => {
  if (!a.minStart && !b.minStart) return 0;
  if (!a.minStart) return 1;
  if (!b.minStart) return -1;
  return a.minStart.localeCompare(b.minStart);
});

console.log('Milestone | 업무수 | Start범위 | Finish범위 | 기간(일) | Start편차(일) | Finish편차(일)');
console.log('-'.repeat(120));
for (const ms of msData) {
  console.log(
    `${ms.name.padEnd(10)} | ${String(ms.workCount).padStart(4)} | ${ms.minStart || 'N/A'} ~ ${ms.maxStart || 'N/A'} | ${ms.minFinish || 'N/A'} ~ ${ms.maxFinish || 'N/A'} | ${ms.duration ? String(ms.duration).padStart(5) : '  N/A'} | ${String(ms.startSpread).padStart(5)} | ${String(ms.finishSpread).padStart(5)}`
  );
}

// Overlap analysis
console.log('\n\n=== Milestone 시간 겹침 분석 ===\n');
for (let i = 0; i < msData.length; i++) {
  for (let j = i + 1; j < msData.length; j++) {
    const a = msData[i];
    const b = msData[j];
    if (a.minStart && b.minStart && a.maxFinish && b.maxFinish) {
      // Check overlap: A starts before B ends AND B starts before A ends
      if (a.minStart <= b.maxFinish && b.minStart <= a.maxFinish) {
        console.log(`  겹침: ${a.name} (${a.minStart}~${a.maxFinish}) ↔ ${b.name} (${b.minStart}~${b.maxFinish})`);
      }
    }
  }
}

// Pattern analysis
console.log('\n\n=== 패턴 분석 ===\n');

// Are all tasks in a milestone have the SAME start date?
let sameStartCount = 0;
let diffStartCount = 0;
for (const ms of msData) {
  if (ms.startSpread === 0 && ms.startCount > 1) sameStartCount++;
  else if (ms.startSpread > 0) diffStartCount++;
}
console.log(`Start 날짜가 동일한 Milestone: ${sameStartCount}개`);
console.log(`Start 날짜가 다른 Milestone: ${diffStartCount}개`);

let sameFinishCount = 0;
let diffFinishCount = 0;
for (const ms of msData) {
  if (ms.finishSpread === 0 && ms.finishCount > 1) sameFinishCount++;
  else if (ms.finishSpread > 0) diffFinishCount++;
}
console.log(`Finish 날짜가 동일한 Milestone: ${sameFinishCount}개`);
console.log(`Finish 날짜가 다른 Milestone: ${diffFinishCount}개`);

// Check: is the milestone a "deadline group" (all finish at same date)?
console.log('\n--- Finish 날짜 분포 상세 ---');
for (const ms of msData) {
  if (ms.finishCount > 0) {
    console.log(`  ${ms.name}: Finish 편차 ${ms.finishSpread}일 (${ms.minFinish} ~ ${ms.maxFinish})`);
  }
}
