import { NormalizedWork } from './normalized';

/**
 * 비교 대상 필드 타입 (8개)
 */
export type ComparisonField =
  | 'division'
  | 'milestone'
  | 'workName'
  | 'startDate'
  | 'finishDate'
  | 'assigneeR'
  | 'assigneeAXPlan'
  | 'assigneeAXDev';

/**
 * 비교 대상 필드 목록 상수
 */
export const COMPARISON_FIELDS: readonly ComparisonField[] = [
  'division',
  'milestone',
  'workName',
  'startDate',
  'finishDate',
  'assigneeR',
  'assigneeAXPlan',
  'assigneeAXDev',
] as const;

/**
 * 비교 대상 필드의 한국어 표시명
 */
export const COMPARISON_FIELD_LABELS: Record<ComparisonField, string> = {
  division: '담당 분과',
  milestone: 'Milestone',
  workName: '업무명',
  startDate: '시작일',
  finishDate: '종료일',
  assigneeR: '책임담당자',
  assigneeAXPlan: 'AX기획담당자',
  assigneeAXDev: 'AX개발담당자',
};

/**
 * 변경 유형
 */
export type ChangeType = 'added' | 'deleted' | 'changed' | 'unchanged';

/**
 * 단일 필드의 변경 내역
 */
export interface FieldChange {
  /** 변경된 필드명 */
  fieldName: ComparisonField;
  /** Before 값 (null이면 해당 필드가 null/빈값) */
  beforeValue: string | null;
  /** After 값 (null이면 해당 필드가 null/빈값) */
  afterValue: string | null;
}

/**
 * 단일 업무ID의 비교 결과
 */
export interface WorkDiff {
  /** 업무ID */
  workId: string;
  /** 변경 유형 */
  changeType: ChangeType;
  /** 변경된 필드 목록 (changeType === 'changed'일 때만 비어있지 않음) */
  fieldChanges: FieldChange[];
  /** Before 데이터 참조 (deleted, changed일 때 존재) */
  beforeWork?: NormalizedWork;
  /** After 데이터 참조 (added, changed일 때 존재) */
  afterWork?: NormalizedWork;
}

/**
 * 전체 비교 결과
 */
export interface DiffResult {
  /** 추가된 업무ID 목록 */
  added: WorkDiff[];
  /** 삭제된 업무ID 목록 */
  deleted: WorkDiff[];
  /** 변경된 업무ID 목록 */
  changed: WorkDiff[];
  /** 동일한 업무ID 목록 */
  unchanged: WorkDiff[];
  /** 전체 건수 요약 */
  summary: {
    addedCount: number;
    deletedCount: number;
    changedCount: number;
    unchangedCount: number;
    beforeTotal: number;
    afterTotal: number;
  };
}

/**
 * 분과별 증감 요약
 */
export interface DivisionSummary {
  /** 분과명 */
  division: string;
  /** Before 업무 수 */
  beforeCount: number;
  /** After 업무 수 */
  afterCount: number;
  /** 증감 (afterCount - beforeCount) */
  delta: number;
  /** 해당 분과에서 추가된 업무ID 목록 */
  addedWorkIds: string[];
  /** 해당 분과에서 삭제된 업무ID 목록 */
  deletedWorkIds: string[];
}

/**
 * Milestone별 증감 요약
 */
export interface MilestoneSummary {
  /** Milestone명 */
  milestone: string;
  /** Before 업무 수 */
  beforeCount: number;
  /** After 업무 수 */
  afterCount: number;
  /** 증감 (afterCount - beforeCount) */
  delta: number;
  /** 해당 Milestone에서 추가된 업무ID 목록 */
  addedWorkIds: string[];
  /** 해당 Milestone에서 삭제된 업무ID 목록 */
  deletedWorkIds: string[];
}

/**
 * 비교 결과 전체 (Store에 저장되는 형태)
 */
export interface ComparisonResult {
  /** 비교 결과 */
  diffResult: DiffResult;
  /** 분과별 요약 (가나다순 정렬) */
  divisionSummaries: DivisionSummary[];
  /** Milestone별 요약 (이름순 정렬) */
  milestoneSummaries: MilestoneSummary[];
}
