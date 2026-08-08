import * as XLSX from 'xlsx';
import { NormalizedWork } from '../../models/normalized';
import { AggregationResult } from '../../models/aggregation';
import { formatDate, formatStartDate } from '../../utils/dateUtils';

/**
 * 현재 시간을 YYYYMMDD_HHmmss 형식으로 반환
 */
function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${mo}${d}_${h}${mi}${s}`;
}

/**
 * 분석 결과를 Excel 파일로 다운로드
 * 
 * @param works - 현재 필터 적용된 NormalizedWork[]
 * @param aggregation - 현재 필터 적용된 AggregationResult
 */
export function exportToExcel(works: NormalizedWork[], aggregation: AggregationResult): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 요약
  const summaryData = [
    { '항목': '전체 업무 수', '값': aggregation.totalWorkCount },
    { '항목': 'Milestone 수', '값': aggregation.byMilestone.size },
    { '항목': '분과 수', '값': aggregation.byDivision.size },
    { '항목': '책임 담당자 수', '값': aggregation.byAssigneeR.size },
    { '항목': 'AX기획 담당자 수', '값': aggregation.byAssigneeAXPlan.size },
    { '항목': 'AX개발 담당자 수', '값': aggregation.byAssigneeAXDev.size },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, '요약');

  // Sheet 2: Milestone별 업무 수
  const milestoneData = [...aggregation.byMilestone.entries()]
    .map(([milestone, count]) => ({ 'Milestone': milestone, '업무 수': count }))
    .sort((a, b) => a.Milestone.localeCompare(b.Milestone));
  const msSheet = XLSX.utils.json_to_sheet(milestoneData);
  XLSX.utils.book_append_sheet(wb, msSheet, 'Milestone별 업무수');

  // Sheet 3: 분과별 업무 수
  const divisionData = [...aggregation.byDivision.entries()]
    .map(([division, count]) => ({ '분과': division, '업무 수': count }))
    .sort((a, b) => b['업무 수'] - a['업무 수']);
  const divSheet = XLSX.utils.json_to_sheet(divisionData);
  XLSX.utils.book_append_sheet(wb, divSheet, '분과별 업무수');

  // Sheet 4: Milestone × 분과 매트릭스
  const divisions = [...aggregation.byDivision.keys()].sort();
  const matrixData: Record<string, string | number>[] = [];

  for (const [ms, divMap] of [...aggregation.milestoneXDivision.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const row: Record<string, string | number> = { 'Milestone': ms };
    let total = 0;
    for (const div of divisions) {
      const count = divMap.get(div) || 0;
      row[div] = count || '';
      total += count;
    }
    row['합계'] = total;
    matrixData.push(row);
  }

  // Footer row (division totals)
  const footerRow: Record<string, string | number> = { 'Milestone': '합계' };
  for (const div of divisions) {
    footerRow[div] = aggregation.byDivision.get(div) || 0;
  }
  footerRow['합계'] = aggregation.totalWorkCount;
  matrixData.push(footerRow);

  const matrixSheet = XLSX.utils.json_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, matrixSheet, 'Milestone×분과 매트릭스');

  // Sheet 5: 전체 업무 목록
  const workListData = works.map(work => {
    const row: Record<string, string | number> = {
      '업무ID': work.workId,
      '분과': work.division,
      'Milestone': work.milestone,
      '업무명': work.workName,
      '책임담당자R': work.assigneeR,
      'AX기획': work.assigneeAXPlan,
      'AX개발': work.assigneeAXDev,
      '시작월': work.startDate ? formatStartDate(work.startDate) : '',
      '종료일': work.finishDate ? (formatDate(work.finishDate) || '') : '',
    };
    // Phase별 날짜 추가
    for (const phase of work.phases) {
      row[phase.name] = phase.date ? (formatDate(phase.date) || '') : '';
    }
    return row;
  });
  const workListSheet = XLSX.utils.json_to_sheet(workListData);
  XLSX.utils.book_append_sheet(wb, workListSheet, '전체 업무 목록');

  // Download
  const filename = `SBF_분석결과_${getTimestamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
