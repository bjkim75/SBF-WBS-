/**
 * 정규화된 업무 단위 — 업무ID 기준으로 그룹핑된 1건의 업무
 * 동일 업무ID의 복수 SUB ID 행이 하나의 NormalizedWork로 축약됨
 */
export interface NormalizedWork {
  /** 업무ID — PRIMARY KEY (모든 집계의 기본 단위) */
  workId: string;
  /** SUB ID 목록 (동일 업무ID 내 세부 항목들) */
  subIds: number[];
  /** 담당 분과 — "미지정 분과" if blank */
  division: string;
  /** 1Depth 계층 */
  depth1: string | null;
  /** 2Depth 계층 */
  depth2: string | null;
  /** 3Depth 계층 = 업무명 (TD-4 확정) */
  depth3: string | null;
  /** 4Depth 계층 (optional, 68% null) */
  depth4: string | null;
  /** Milestone — "마일스톤 미지정" if blank */
  milestone: string;
  /** 업무명 = depth3 값 (primary) 또는 "업무명 없음" */
  workName: string;
  /** Milestone Start — Excel serial → Date (null 가능) */
  startDate: Date | null;
  /** Milestone Finish — Excel serial → Date (null 가능) */
  finishDate: Date | null;
  /** 책임 담당자R — "미배정" if blank */
  assigneeR: string;
  /** 상세화담당자 AX기획 — "-" if blank */
  assigneeAXPlan: string;
  /** 상세화담당자 AX개발 — "-" if blank */
  assigneeAXDev: string;
  /** 과제명 (null = 기존 업무, non-null = 신규 과제) */
  projectName: string | null;
  /** L3명 (상세 업무명, Drill-down 표시용) */
  l3Name: string | null;
  /** 담당구분(T) — T조직명 */
  orgT: string | null;
  /** 원본 IA Sheet Row 번호 (1-indexed, traceability) */
  sourceRows: number[];
  /** Gantt 표시 여부: !(startDate==null && finishDate==null) */
  isGanttVisible: boolean;
  /** Point Marker 여부: startDate!=null && finishDate==null (TD-5) */
  isPointMarker: boolean;
}

/**
 * Milestone 단위 그룹 — Milestone별 업무 집합 및 시간 범위
 */
export interface MilestoneGroup {
  /** Milestone 이름 */
  milestone: string;
  /** 소속 업무 중 최소 startDate (null = 모든 업무에 시작일 없음) */
  startDate: Date | null;
  /** 소속 업무 중 최대 finishDate (null = 모든 업무에 종료일 없음) */
  finishDate: Date | null;
  /** 이 Milestone에 속한 NormalizedWork 목록 */
  works: NormalizedWork[];
  /** DISTINCT workId count */
  workCount: number;
  /** 분과별 서브그룹 (TD-3: 분과 Grouping) */
  divisionGroups: Map<string, NormalizedWork[]>;
}
