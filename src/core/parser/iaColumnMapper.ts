import { IAColumnMap } from '../../models/raw';
import { IA_HEADER_MAPPING, IA_REQUIRED_HEADERS } from '../constants/iaSchema';

/**
 * 헤더 이름 정규화 (case-insensitive, whitespace-trimmed)
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * IA Sheet의 헤더 목록을 받아 각 의미별 Column index를 반환하는 IA 전용 Column Mapper
 *
 * Column index를 하드코딩하지 않고, 헤더 이름 기반으로 동적 매핑
 * 필수 헤더가 없으면 에러를 throw
 *
 * @param headers - IA Sheet의 실제 헤더 목록 (Row 0에서 추출된 것)
 * @returns IAColumnMap (각 필드의 0-based column index)
 * @throws 필수 헤더가 누락된 경우
 */
export function mapIAColumns(headers: string[]): IAColumnMap {
  const normalizedHeaders = headers.map(normalizeHeader);

  /**
   * 특정 헤더 이름에 해당하는 column index를 찾음
   * @returns 0-based index 또는 -1 (찾을 수 없는 경우)
   */
  function findColumnIndex(headerName: string): number {
    const normalized = normalizeHeader(headerName);
    return normalizedHeaders.findIndex(h => h === normalized);
  }

  // 모든 헤더에 대해 index 탐색
  const columnMap: IAColumnMap = {
    workId: findColumnIndex(IA_HEADER_MAPPING.workId),
    subId: findColumnIndex(IA_HEADER_MAPPING.subId),
    domain: findColumnIndex(IA_HEADER_MAPPING.domain),
    division: findColumnIndex(IA_HEADER_MAPPING.division),
    category: findColumnIndex(IA_HEADER_MAPPING.category),
    depth1: findColumnIndex(IA_HEADER_MAPPING.depth1),
    depth2: findColumnIndex(IA_HEADER_MAPPING.depth2),
    depth3: findColumnIndex(IA_HEADER_MAPPING.depth3),
    depth4: findColumnIndex(IA_HEADER_MAPPING.depth4),
    milestone: findColumnIndex(IA_HEADER_MAPPING.milestone),
    startDate: findColumnIndex(IA_HEADER_MAPPING.startDate),
    finishDate: findColumnIndex(IA_HEADER_MAPPING.finishDate),
    l3Name: findColumnIndex(IA_HEADER_MAPPING.l3Name),
    projectName: findColumnIndex(IA_HEADER_MAPPING.projectName),
    assigneeR: findColumnIndex(IA_HEADER_MAPPING.assigneeR),
    assigneeAXPlan: findColumnIndex(IA_HEADER_MAPPING.assigneeAXPlan),
    assigneeAXDev: findColumnIndex(IA_HEADER_MAPPING.assigneeAXDev),
    orgT: findColumnIndex(IA_HEADER_MAPPING.orgT),
  };

  // 필수 헤더 누락 검증
  const missingRequired: string[] = [];
  const requiredFieldKeys = Object.entries(IA_HEADER_MAPPING)
    .filter(([_, headerName]) =>
      IA_REQUIRED_HEADERS.some(r => normalizeHeader(r) === normalizeHeader(headerName))
    )
    .map(([key, _]) => key);

  for (const key of requiredFieldKeys) {
    if (columnMap[key as keyof IAColumnMap] === -1) {
      missingRequired.push(IA_HEADER_MAPPING[key]);
    }
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `IA Sheet 필수 Column 매핑 실패. 누락된 헤더: ${missingRequired.join(', ')}`
    );
  }

  return columnMap;
}
