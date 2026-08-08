import { RawRow, RawSheet } from '../../models/raw';
import { WbsColumnMap, NormalizedWbsTicket } from '../../models/wbsTicket';
import { canonicalizeWorkId } from './workIdParser';
import { mapWbsColumns } from './wbsColumnMapper';
import { excelSerialToDate } from '../../utils/dateUtils';

/**
 * Raw Cell 값에서 문자열을 안전하게 추출
 */
function cellToString(cell: string | number | null): string | null {
  if (cell == null) return null;
  if (typeof cell === 'number') return String(cell);
  const trimmed = cell.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * RawRow 한 행을 NormalizedWbsTicket으로 변환한다.
 *
 * @param row - Raw 행 데이터
 * @param columnMap - 헤더 기반 컬럼 매핑
 * @param sheetName - 원본 시트명 (traceability)
 * @returns NormalizedWbsTicket 또는 null (필수 필드 누락 시)
 */
export function normalizeWbsRow(
  row: RawRow,
  columnMap: WbsColumnMap,
  sheetName: string
): NormalizedWbsTicket | null {
  const cells = row.cells;

  // 필수 필드: jiraKey와 summary
  const jiraKey = cellToString(cells[columnMap.key] ?? null);
  const summary = cellToString(cells[columnMap.summary] ?? null);
  if (!jiraKey || !summary) return null; // 필수값 없으면 스킵

  // SBF 업무ID 원본 값 및 정규화
  const sbfWorkIdRaw = cellToString(cells[columnMap.sbfWorkId] ?? null);
  const canonicalWorkId = canonicalizeWorkId(sbfWorkIdRaw);

  // 선택 필드 (인덱스가 -1이면 해당 컬럼 없음)
  const getOptional = (idx: number): string | number | null =>
    idx >= 0 ? (cells[idx] ?? null) : null;

  const getOptionalString = (idx: number): string | null =>
    cellToString(getOptional(idx) as string | number | null);

  const getOptionalDate = (idx: number): Date | null => {
    const val = getOptional(idx);
    if (val == null) return null;
    if (typeof val === 'number') return excelSerialToDate(val);
    // String date는 현재 지원하지 않음 — Excel serial만 처리
    return null;
  };

  return {
    jiraKey,
    category: getOptionalString(columnMap.category),
    summary,
    status: getOptionalString(columnMap.status),
    planStartDate: getOptionalDate(columnMap.planStartDate),
    planEndDate: getOptionalDate(columnMap.planEndDate),
    issueType: getOptionalString(columnMap.issueType),
    wbsAssignee: getOptionalString(columnMap.wbsAssignee),
    sktAssignee: getOptionalString(columnMap.sktAssignee),
    sbfDomain: getOptionalString(columnMap.sbfDomain),
    sbfWorkIdRaw,
    canonicalWorkId,
    wbsLevel7: getOptionalString(columnMap.wbsLevel7),
    sourceSheet: sheetName,
    sourceRow: row.rowIndex,
  };
}

/**
 * RawSheet 전체를 NormalizedWbsTicket 배열로 변환한다.
 * - 먼저 mapWbsColumns()로 컬럼 매핑
 * - 각 행을 normalizeWbsRow()로 변환
 * - null 결과(필수 필드 누락 행)는 제외
 *
 * @param rawSheet - sheetReader에서 읽은 원본 시트 데이터
 * @returns NormalizedWbsTicket[] 배열
 * @throws Error if column mapping fails (필수 컬럼 누락)
 */
export function normalizeWbsSheet(rawSheet: RawSheet): NormalizedWbsTicket[] {
  const columnMap = mapWbsColumns(rawSheet.headers);
  if (!columnMap) {
    throw new Error('WBS 필수 컬럼을 찾을 수 없습니다.');
  }

  const tickets: NormalizedWbsTicket[] = [];
  for (const row of rawSheet.rows) {
    const ticket = normalizeWbsRow(row, columnMap, rawSheet.sheetName);
    if (ticket) {
      tickets.push(ticket);
    }
  }

  return tickets;
}
