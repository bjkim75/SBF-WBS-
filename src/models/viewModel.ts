/**
 * Gantt Timeline의 시간축 정의
 */
export interface GanttTimeScale {
  /** visible milestones 중 가장 이른 날짜 */
  startDate: Date;
  /** visible milestones 중 가장 늦은 날짜 */
  endDate: Date;
  /** 주 단위 그리드 구간 (TD-2) */
  weekIntervals: WeekInterval[];
  /** 전체 타임라인 너비 (px) */
  totalWidth: number;
  /** 1일당 px */
  pxPerDay: number;
}

export interface WeekInterval {
  start: Date;
  end: Date;
  label: string; // e.g., "1/27", "2/3"
  startPx: number;
  widthPx: number;
}

/**
 * Gantt Swimlane (Milestone 단위)
 */
export interface GanttSwimLane {
  milestone: string;
  startDate: Date | null;
  finishDate: Date | null;
  workCount: number;
  isExpanded: boolean;
  divisionGroups: GanttDivisionGroup[];
}

/**
 * 분과 그룹 (TD-3)
 */
export interface GanttDivisionGroup {
  division: string;
  rows: GanttRow[];
}

/**
 * 업무 행 — Timeline bar 또는 point marker
 */
export interface GanttRow {
  workId: string;
  workName: string;
  assigneeR: string;
  division: string;
  startDate: Date | null;
  finishDate: Date | null;
  isPointMarker: boolean;
  /** bar 시작 위치 (px, 시간축 기준) */
  barStartPx: number;
  /** bar 너비 (px, point marker면 0) */
  barWidthPx: number;
}
