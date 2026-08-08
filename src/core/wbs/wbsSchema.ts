/**
 * WBS Sheet 필수 헤더 목록
 * 이 헤더가 하나라도 없으면 Schema Validation 실패
 *
 * - 키: Jira Key (고유 식별자)
 * - 요약: Jira Ticket Summary
 * - [N]SBF_업무ID/명: SBF WorkId와의 조인 키
 *
 * 주의: Column index를 하드코딩하지 않음 — 헤더 이름 기반으로만 매핑
 */
export const WBS_REQUIRED_HEADERS: readonly string[] = [
  '키',
  '요약',
  '[N]SBF_업무ID/명',
] as const;

/**
 * WBS Sheet 선택 헤더 목록
 * 이 헤더가 없어도 분석은 진행되지만 관련 기능이 제한됨
 */
export const WBS_OPTIONAL_HEADERS: readonly string[] = [
  '구분',
  '상태',
  '[N]계획시작일',
  '[N]계획종료일',
  '계획시작월',
  '계획종료월',
  '유형',
  '우선',
  '[N]WBS 담당자',
  '[N]SKT/B 담당자',
  '[N]SBF_도메인',
  '[N]WBS Level7',
] as const;

/**
 * WBS 헤더 이름 → 표시 라벨 매핑
 * WbsTicketPanel에서 사용자에게 보여줄 때 사용
 */
export const WBS_HEADER_DISPLAY_MAP: Record<string, string> = {
  '키': 'Jira Key',
  '요약': '요약',
  '상태': '상태',
  '[N]계획시작일': '계획시작일',
  '[N]계획종료일': '계획종료일',
  '[N]WBS 담당자': 'WBS 담당자',
  '[N]SKT/B 담당자': 'SKT/B 담당자',
  '[N]SBF_도메인': 'SBF 도메인',
  '[N]SBF_업무ID/명': 'SBF 업무ID/명',
} as const;
