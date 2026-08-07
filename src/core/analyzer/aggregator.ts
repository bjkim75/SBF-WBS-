import { NormalizedWork } from '../../models/normalized';
import { AggregationResult } from '../../models/aggregation';

/**
 * Map에 값을 증가시키는 헬퍼
 */
function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

/**
 * 2-level Map에 값을 증가시키는 헬퍼
 */
function increment2(map: Map<string, Map<string, number>>, key1: string, key2: string): void {
  let inner = map.get(key1);
  if (!inner) {
    inner = new Map<string, number>();
    map.set(key1, inner);
  }
  inner.set(key2, (inner.get(key2) || 0) + 1);
}

/**
 * 3-level Map에 값을 증가시키는 헬퍼
 */
function increment3(
  map: Map<string, Map<string, Map<string, number>>>,
  key1: string,
  key2: string,
  key3: string
): void {
  let level1 = map.get(key1);
  if (!level1) {
    level1 = new Map<string, Map<string, number>>();
    map.set(key1, level1);
  }
  let level2 = level1.get(key2);
  if (!level2) {
    level2 = new Map<string, number>();
    level1.set(key2, level2);
  }
  level2.set(key3, (level2.get(key3) || 0) + 1);
}

/**
 * NormalizedWork[] → AggregationResult 계산
 *
 * 모든 집계는 DISTINCT 업무ID 기준 (NormalizedWork 1개 = 1 업무ID)
 * 입력이 이미 업무ID 단위로 정규화되어 있으므로 배열 길이 = DISTINCT count
 *
 * @param works - 정규화된 업무 배열 (필터 적용 후 또는 전체)
 * @returns AggregationResult (모든 차원 집계)
 */
export function computeAggregation(works: NormalizedWork[]): AggregationResult {
  const byMilestone = new Map<string, number>();
  const byDivision = new Map<string, number>();
  const byAssigneeR = new Map<string, number>();
  const milestoneXDivision = new Map<string, Map<string, number>>();
  const milestoneXAssigneeR = new Map<string, Map<string, number>>();
  const milestoneXDivisionXAssigneeR = new Map<string, Map<string, Map<string, number>>>();
  const byAssigneeAXPlan = new Map<string, number>();
  const byAssigneeAXDev = new Map<string, number>();

  for (const work of works) {
    // 단일 차원 집계
    increment(byMilestone, work.milestone);
    increment(byDivision, work.division);
    increment(byAssigneeR, work.assigneeR);
    increment(byAssigneeAXPlan, work.assigneeAXPlan);
    increment(byAssigneeAXDev, work.assigneeAXDev);

    // 교차 집계
    increment2(milestoneXDivision, work.milestone, work.division);
    increment2(milestoneXAssigneeR, work.milestone, work.assigneeR);
    increment3(milestoneXDivisionXAssigneeR, work.milestone, work.division, work.assigneeR);
  }

  return {
    totalWorkCount: works.length,
    byMilestone,
    byDivision,
    byAssigneeR,
    milestoneXDivision,
    milestoneXAssigneeR,
    milestoneXDivisionXAssigneeR,
    byAssigneeAXPlan,
    byAssigneeAXDev,
  };
}
