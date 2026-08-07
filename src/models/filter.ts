/**
 * 필터 상태 — 사용자가 선택한 필터 조건
 */
export interface FilterState {
  /** Milestone 필터 (다중 선택, 빈 배열 = 전체) */
  milestones: string[];
  /** 
   * 분과 선택 목록 — 체크된 분과만 분석에 포함
   * null = 아직 초기화되지 않음 (데이터 로드 후 초기화 필요)
   * string[] = 선택된 분과 목록 (이 목록에 있는 분과만 분석 대상)
   */
  selectedDivisions: string[] | null;
  /** 책임담당자R 필터 (다중 선택, 빈 배열 = 전체) */
  assigneesR: string[];
  /** 기간 필터 (null = 제한 없음) */
  dateRange: { start: Date | null; end: Date | null };
  /** AX기획 담당자 필터 (보조, 빈 배열 = 전체) */
  assigneesAXPlan: string[];
  /** AX개발 담당자 필터 (보조, 빈 배열 = 전체) */
  assigneesAXDev: string[];
}

/**
 * 초기 필터 상태
 * selectedDivisions = null → 데이터 로드 후 초기화됨
 */
export const INITIAL_FILTER_STATE: FilterState = {
  milestones: [],
  selectedDivisions: null,
  assigneesR: [],
  dateRange: { start: null, end: null },
  assigneesAXPlan: [],
  assigneesAXDev: [],
};
