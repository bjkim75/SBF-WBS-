import { RawSheet, IAColumnMap } from '../../models/raw';
import { NormalizedWork } from '../../models/normalized';
import { IA_EXCLUDED_CATEGORY, NULL_SUBSTITUTES } from '../constants/iaSchema';
import { excelSerialToDate } from '../../utils/dateUtils';

/**
 * Cell 값을 문자열로 추출 (null/undefined → null)
 */
function getCellString(cells: (string | number | null)[], index: number): string | null {
  if (index < 0 || index >= cells.length) return null;
  const value = cells[index];
  if (value == null) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Cell 값을 숫자로 추출 (null/non-number → null)
 */
function getCellNumber(cells: (string | number | null)[], index: number): number | null {
  if (index < 0 || index >= cells.length) return null;
  const value = cells[index];
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * RawSheet + IAColumnMap → NormalizedWork[] 변환
 *
 * 처리 순서:
 * 1. IA초안 행 필터링 (구분 Column 값이 "IA초안"인 행 제외)
 * 2. 업무ID null/빈값 행 필터링
 * 3. 업무ID 기준 그룹핑 (동일 업무ID의 복수 SUB ID → 1개 NormalizedWork)
 * 4. 각 그룹을 NormalizedWork로 변환 (Null 대체값, Date 변환, 플래그 계산)
 *
 * @param rawSheet - SheetReader가 생성한 Raw Data
 * @param columnMap - IAColumnMapper가 생성한 Column 매핑
 * @returns NormalizedWork[] (업무ID 단위, DISTINCT)
 */
export function normalize(rawSheet: RawSheet, columnMap: IAColumnMap): NormalizedWork[] {
  // Step 1: IA초안 제외 + 업무ID null 제외
  const validRows = rawSheet.rows.filter(row => {
    // 구분 Column에서 "IA초안" 제외
    const category = getCellString(row.cells, columnMap.category);
    if (category === IA_EXCLUDED_CATEGORY) return false;

    // 업무ID null/빈값 제외
    const workId = getCellString(row.cells, columnMap.workId);
    if (!workId) return false;

    return true;
  });

  // Step 2: 업무ID 기준 그룹핑
  const groupMap = new Map<string, typeof validRows>();
  for (const row of validRows) {
    const workId = getCellString(row.cells, columnMap.workId)!;
    const existing = groupMap.get(workId);
    if (existing) {
      existing.push(row);
    } else {
      groupMap.set(workId, [row]);
    }
  }

  // Step 3: 각 그룹을 NormalizedWork로 변환
  const results: NormalizedWork[] = [];

  for (const [workId, rows] of groupMap) {
    // 대표 행 (첫 번째 행 — 동일 업무ID 그룹은 동일 담당자/분과 공유)
    const representative = rows[0];
    const cells = representative.cells;

    // SUB ID 수집
    const subIds: number[] = [];
    for (const row of rows) {
      const subId = getCellNumber(row.cells, columnMap.subId);
      if (subId != null) {
        subIds.push(subId);
      }
    }

    // 원본 Row 번호 수집 (traceability)
    const sourceRows = rows.map(r => r.rowIndex);

    // 필드 추출 + Null 대체값 적용
    const division = getCellString(cells, columnMap.division) || NULL_SUBSTITUTES.division;
    const milestone = getCellString(cells, columnMap.milestone) || NULL_SUBSTITUTES.milestone;
    const depth3 = getCellString(cells, columnMap.depth3);
    const workName = depth3 || NULL_SUBSTITUTES.workName;
    const assigneeR = getCellString(cells, columnMap.assigneeR) || NULL_SUBSTITUTES.assigneeR;
    const assigneeAXPlan = getCellString(cells, columnMap.assigneeAXPlan) || NULL_SUBSTITUTES.assigneeAXPlan;
    const assigneeAXDev = getCellString(cells, columnMap.assigneeAXDev) || NULL_SUBSTITUTES.assigneeAXDev;

    // 날짜 변환 (Excel serial number → Date)
    const startDateRaw = getCellNumber(cells, columnMap.startDate);
    const finishDateRaw = getCellNumber(cells, columnMap.finishDate);
    let startDate = excelSerialToDate(startDateRaw);
    let finishDate = excelSerialToDate(finishDateRaw);

    // Defensive: ensure dates are valid (reject NaN Date objects)
    if (startDate && isNaN(startDate.getTime())) startDate = null;
    if (finishDate && isNaN(finishDate.getTime())) finishDate = null;

    // Start date 보정: 해당 월의 1일로 설정 (업무 착수가 월초에 시작되는 것을 근사)
    if (startDate) {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    // Gantt 표시 플래그
    const isGanttVisible = !(startDate == null && finishDate == null);
    const isPointMarker = startDate != null && finishDate == null;

    // Phase 날짜 추출
    const phases: { name: string; date: Date | null }[] = [];
    for (const phase of columnMap.phaseColumns) {
      const raw = getCellNumber(cells, phase.index);
      let phaseDate = excelSerialToDate(raw);
      if (phaseDate && isNaN(phaseDate.getTime())) phaseDate = null;
      phases.push({ name: phase.name, date: phaseDate });
    }

    const work: NormalizedWork = {
      workId,
      subIds,
      division,
      depth1: getCellString(cells, columnMap.depth1),
      depth2: getCellString(cells, columnMap.depth2),
      depth3,
      depth4: getCellString(cells, columnMap.depth4),
      milestone,
      workName,
      startDate,
      finishDate,
      assigneeR,
      assigneeAXPlan,
      assigneeAXDev,
      projectName: getCellString(cells, columnMap.projectName),
      l3Name: getCellString(cells, columnMap.l3Name),
      orgT: getCellString(cells, columnMap.orgT),
      sourceRows,
      isGanttVisible,
      isPointMarker,
      phases,
    };

    results.push(work);
  }

  return results;
}
