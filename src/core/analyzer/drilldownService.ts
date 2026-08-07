import { NormalizedWork } from '../../models/normalized';
import { FilterState } from '../../models/filter';
import { applyFilters } from './filterEngine';
import { DrilldownContext } from '../../store/uiStore';

/**
 * Drill-down 상세 행 (11개 필드)
 */
export interface DrilldownRow {
  milestone: string;
  milestoneStart: Date | null;
  milestoneFinish: Date | null;
  division: string;
  workId: string;
  subIds: number[];
  workName: string;
  assigneeR: string;
  assigneeAXPlan: string;
  assigneeAXDev: string;
  sourceRows: number[];
}

/**
 * Drill-down 상세 데이터를 반환
 *
 * @param works - 전체 NormalizedWork 배열
 * @param context - 클릭된 집계 요소 정보
 * @param currentFilters - 현재 적용된 필터 (기존 필터 + drill-down 조건 결합)
 * @returns DrilldownRow[] (업무ID 단위)
 */
export function getDrilldownData(
  works: NormalizedWork[],
  context: DrilldownContext,
  currentFilters: FilterState
): DrilldownRow[] {
  // 기존 필터 적용
  let filtered = applyFilters(works, currentFilters);

  // Drill-down 컨텍스트 조건 추가 적용
  if (context.milestone) {
    filtered = filtered.filter(w => w.milestone === context.milestone);
  }
  if (context.division) {
    filtered = filtered.filter(w => w.division === context.division);
  }
  if (context.assigneeR) {
    filtered = filtered.filter(w => w.assigneeR === context.assigneeR);
  }

  // NormalizedWork → DrilldownRow 변환
  return filtered.map(work => ({
    milestone: work.milestone,
    milestoneStart: work.startDate,
    milestoneFinish: work.finishDate,
    division: work.division,
    workId: work.workId,
    subIds: work.subIds,
    workName: work.workName,
    assigneeR: work.assigneeR,
    assigneeAXPlan: work.assigneeAXPlan,
    assigneeAXDev: work.assigneeAXDev,
    sourceRows: work.sourceRows,
  }));
}
