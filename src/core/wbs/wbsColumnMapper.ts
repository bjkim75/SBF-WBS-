import { WbsColumnMap } from '../../models/wbsTicket';

/**
 * 헤더 이름 → WbsColumnMap 필드 매핑 정의
 * key: 정규화된 헤더 이름 (trim + toLowerCase)
 * value: WbsColumnMap의 필드명
 */
const HEADER_FIELD_MAP: ReadonlyArray<{
  headerNames: string[];
  field: keyof WbsColumnMap;
}> = [
  { headerNames: ['키'], field: 'key' },
  { headerNames: ['구분'], field: 'category' },
  { headerNames: ['요약'], field: 'summary' },
  { headerNames: ['상태'], field: 'status' },
  { headerNames: ['[n]계획시작일'], field: 'planStartDate' },
  { headerNames: ['[n]계획종료일'], field: 'planEndDate' },
  { headerNames: ['유형'], field: 'issueType' },
  { headerNames: ['[n]wbs 담당자'], field: 'wbsAssignee' },
  { headerNames: ['[n]skt/b 담당자'], field: 'sktAssignee' },
  { headerNames: ['[n]sbf_도메인'], field: 'sbfDomain' },
  { headerNames: ['[n]sbf_업무id/명'], field: 'sbfWorkId' },
  { headerNames: ['[n]wbs level7'], field: 'wbsLevel7' },
];

/** 필수 컬럼 필드 목록 — 하나라도 누락되면 null 반환 */
const REQUIRED_FIELDS: ReadonlyArray<keyof WbsColumnMap> = [
  'key',
  'summary',
  'sbfWorkId',
];

/**
 * WBS 헤더 배열에서 각 컬럼의 위치를 동적으로 매핑한다.
 *
 * - Case-insensitive, trim 적용하여 매칭
 * - Column 위치(A, B, C...) 하드코딩 금지
 * - 필수 컬럼('키', '요약', '[N]SBF_업무ID/명')이 없으면 null 반환
 * - 선택 컬럼이 없으면 해당 인덱스를 -1로 설정
 *
 * @param headers - RawSheet에서 추출한 헤더 배열
 * @returns WbsColumnMap 또는 null (필수 컬럼 누락 시)
 */
export function mapWbsColumns(headers: string[]): WbsColumnMap | null {
  // 1. 정규화된 헤더 배열 생성
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  // 2. 각 필드에 대해 인덱스 찾기
  const columnMap: Record<string, number> = {};

  for (const mapping of HEADER_FIELD_MAP) {
    let foundIndex = -1;
    for (const headerName of mapping.headerNames) {
      const idx = normalizedHeaders.indexOf(headerName);
      if (idx !== -1) {
        foundIndex = idx;
        break;
      }
    }
    columnMap[mapping.field] = foundIndex;
  }

  // 3. 필수 컬럼 존재 여부 확인
  for (const requiredField of REQUIRED_FIELDS) {
    if (columnMap[requiredField] === -1) {
      return null;
    }
  }

  // 4. WbsColumnMap 반환
  return {
    key: columnMap['key'],
    category: columnMap['category'],
    summary: columnMap['summary'],
    status: columnMap['status'],
    planStartDate: columnMap['planStartDate'],
    planEndDate: columnMap['planEndDate'],
    issueType: columnMap['issueType'],
    wbsAssignee: columnMap['wbsAssignee'],
    sktAssignee: columnMap['sktAssignee'],
    sbfDomain: columnMap['sbfDomain'],
    sbfWorkId: columnMap['sbfWorkId'],
    wbsLevel7: columnMap['wbsLevel7'],
  };
}
