import { NormalizedWork } from '../../models/normalized';
import { FilterState } from '../../models/filter';

/**
 * NormalizedWork[] + FilterState → 필터링된 NormalizedWork[]
 *
 * 모든 필터는 AND 결합
 */
export function applyFilters(works: NormalizedWork[], filters: FilterState): NormalizedWork[] {
  return works.filter(work => {
    // 분과 선택 필터 (selectedDivisions)
    // null = 초기화 전 → 전체 포함 (필터 미적용)
    // string[] = 선택된 분과만 포함
    if (filters.selectedDivisions !== null) {
      if (filters.selectedDivisions.length === 0) {
        return false;
      }
      if (!filters.selectedDivisions.includes(work.division)) {
        return false;
      }
    }

    // Milestone 필터
    if (filters.milestones.length > 0 && !filters.milestones.includes(work.milestone)) {
      return false;
    }

    // 책임담당자R 필터
    if (filters.assigneesR.length > 0 && !filters.assigneesR.includes(work.assigneeR)) {
      return false;
    }

    // 기간 필터 (Start)
    if (filters.dateRange.start != null) {
      if (work.finishDate != null && work.finishDate < filters.dateRange.start) {
        return false;
      }
      if (work.finishDate == null && work.startDate != null && work.startDate < filters.dateRange.start) {
        return false;
      }
    }

    // 기간 필터 (End)
    if (filters.dateRange.end != null) {
      if (work.startDate != null && work.startDate > filters.dateRange.end) {
        return false;
      }
    }

    // AX기획 담당자 필터
    if (filters.assigneesAXPlan.length > 0 && !filters.assigneesAXPlan.includes(work.assigneeAXPlan)) {
      return false;
    }

    // AX개발 담당자 필터
    if (filters.assigneesAXDev.length > 0 && !filters.assigneesAXDev.includes(work.assigneeAXDev)) {
      return false;
    }

    return true;
  });
}
