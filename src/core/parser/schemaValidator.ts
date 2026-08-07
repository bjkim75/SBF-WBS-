import { SchemaValidationResult } from '../../models/raw';

/**
 * 헤더 이름 비교를 위한 정규화 함수
 * Case-insensitive, 앞뒤 공백 제거
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * 실제 헤더 목록을 Expected Schema와 비교하여 검증 결과를 반환하는 범용 SchemaValidator
 *
 * SBF 업무 로직을 포함하지 않음 (TD-6: 향후 common-xlsx로 분리 가능)
 * Expected 헤더 목록은 외부에서 파라미터로 주입받음
 *
 * @param actualHeaders - 업로드된 파일의 실제 헤더 목록
 * @param requiredHeaders - 필수 헤더 목록 (하나라도 없으면 isValid = false)
 * @param optionalHeaders - 선택 헤더 목록 (없어도 isValid = true, 경고만 표시)
 * @returns SchemaValidationResult
 */
export function validateSchema(
  actualHeaders: string[],
  requiredHeaders: readonly string[],
  optionalHeaders: readonly string[]
): SchemaValidationResult {
  const normalizedActual = actualHeaders.map(normalizeHeader);
  const matchedColumns: string[] = [];
  const missingColumns: string[] = [];
  const warnings: string[] = [];

  // Required headers 검증
  for (const required of requiredHeaders) {
    const normalizedRequired = normalizeHeader(required);
    const found = normalizedActual.some(h => h === normalizedRequired);
    if (found) {
      matchedColumns.push(required);
    } else {
      missingColumns.push(required);
    }
  }

  // Optional headers 검증 (없으면 경고만)
  for (const optional of optionalHeaders) {
    const normalizedOptional = normalizeHeader(optional);
    const found = normalizedActual.some(h => h === normalizedOptional);
    if (found) {
      matchedColumns.push(optional);
    } else {
      warnings.push(`선택 헤더 "${optional}"이(가) 없습니다. 관련 기능이 제한될 수 있습니다.`);
    }
  }

  // Extra columns: actual에 있지만 required/optional 어디에도 없는 헤더
  const allExpected = [...requiredHeaders, ...optionalHeaders].map(normalizeHeader);
  const extraColumns = actualHeaders.filter(h => {
    const normalized = normalizeHeader(h);
    return normalized !== '' && !allExpected.includes(normalized);
  });

  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    extraColumns,
    matchedColumns,
    warnings,
  };
}
