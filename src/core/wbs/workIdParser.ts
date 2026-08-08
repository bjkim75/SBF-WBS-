/**
 * WBS [N]SBF_업무ID/명 원본 값에서 Canonical WorkId를 추출한다.
 *
 * 전략: Canonicalization + Exact Match (TD-WBS-2)
 * - startsWith()를 사용하지 않음
 * - 원본 값에서 canonical ID를 추출한 후, SBF workId와 === 비교
 *
 * 규칙:
 * 1. null/undefined/빈 문자열 → null 반환
 * 2. 앞뒤 공백 제거 (trim)
 * 3. B-패턴 매칭: /^(B[A-Z]?\d+)/ — greedy digits
 *    - "B2003" → "B2003"
 *    - "B2003(제외처리)" → "B2003"
 *    - "B20031" → "B20031" (NOT "B2003"! greedy captures all digits)
 *    - "BA074" → "BA074"
 *    - "BA0741(추가)" → "BA0741"
 * 4. 매칭 실패 → 전체 trimmed 값 반환 (non-B 패턴: "RM-BP-T001" 등)
 *
 * @param rawValue - [N]SBF_업무ID/명 컬럼 원본 Cell 값
 * @returns Canonical WorkId (또는 null if rawValue is empty/null)
 */
export function canonicalizeWorkId(rawValue: string | number | null | undefined): string | null {
  // null, undefined 처리
  if (rawValue == null) return null;

  // 숫자를 문자열로 변환 (XLSX Cell 값이 number일 수 있음)
  const strValue = typeof rawValue === 'number' ? String(rawValue) : rawValue;

  // 비문자열 타입 방어
  if (typeof strValue !== 'string') return null;

  // 앞뒤 공백 제거
  const trimmed = strValue.trim();

  // 빈 문자열 → null
  if (trimmed === '') return null;

  // B-패턴: B + optional uppercase letter + greedy digits
  const bMatch = trimmed.match(/^(B[A-Z]?\d+)/);
  if (bMatch) {
    return bMatch[1];
  }

  // Non-B 패턴: 전체 trimmed 값 반환
  return trimmed;
}
