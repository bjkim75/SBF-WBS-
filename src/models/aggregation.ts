/**
 * 집계 결과 — Aggregator가 NormalizedWork[]에서 계산한 모든 차원의 집계
 * 모든 count는 DISTINCT 업무ID 기준 (Row count 아님)
 */
export interface AggregationResult {
  /** 전체 DISTINCT 업무ID 수 (REQ-7) */
  totalWorkCount: number;

  /** Milestone별 업무 수: key=milestone name, value=DISTINCT workId count */
  byMilestone: Map<string, number>;

  /** 분과별 업무 수: key=division name, value=DISTINCT workId count */
  byDivision: Map<string, number>;

  /** 책임담당자R별 업무 수: key=assigneeR name, value=DISTINCT workId count */
  byAssigneeR: Map<string, number>;

  /** Milestone × 분과 교차 집계: key=milestone, value=Map<division, count> */
  milestoneXDivision: Map<string, Map<string, number>>;

  /** Milestone × 책임담당자R 교차 집계: key=milestone, value=Map<assigneeR, count> */
  milestoneXAssigneeR: Map<string, Map<string, number>>;

  /** Milestone × 분과 × 책임담당자R 3-way 교차 집계 */
  milestoneXDivisionXAssigneeR: Map<string, Map<string, Map<string, number>>>;

  /** AX기획 담당자별 업무 수 (보조 — 필터/Drill-down 전용) */
  byAssigneeAXPlan: Map<string, number>;

  /** AX개발 담당자별 업무 수 (보조 — 필터/Drill-down 전용) */
  byAssigneeAXDev: Map<string, number>;
}
