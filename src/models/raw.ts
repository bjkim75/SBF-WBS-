/**
 * XLSX 원본 데이터 Row — 원본 IA Sheet의 1개 행
 * rowIndex는 1-indexed (원본 Sheet 기준 행 번호)
 */
export interface RawRow {
  rowIndex: number;
  cells: (string | number | null)[];
}

/**
 * XLSX Sheet 파싱 결과 — Header + Data Rows
 */
export interface RawSheet {
  sheetName: string;
  headers: string[];
  rows: RawRow[];
}

/**
 * Schema 검증 결과
 */
export interface SchemaValidationResult {
  isValid: boolean;
  missingColumns: string[];   // Expected에 있으나 파일에 없는 헤더
  extraColumns: string[];     // 파일에 있으나 Expected에 없는 헤더
  matchedColumns: string[];   // 정상 매칭된 헤더
  warnings: string[];         // Optional 헤더 누락 경고
}

/**
 * IA Sheet Column 매핑 결과
 * 각 필드는 해당 의미의 Column index (0-based)를 나타냄
 * -1은 해당 Column이 존재하지 않음을 의미 (Optional Column)
 */
export interface IAColumnMap {
  workId: number;             // 업무ID
  subId: number;              // SUB ID
  domain: number;             // 도메인
  division: number;           // 담당 분과
  category: number;           // 구분 (IA초안 필터용)
  depth1: number;             // 1Depth
  depth2: number;             // 2Depth
  depth3: number;             // 3Depth (= 업무명)
  depth4: number;             // 4Depth
  milestone: number;          // milestone
  startDate: number;          // 업무 Flow 초안 (Milestone Start)
  finishDate: number;         // figma 디자인 (Milestone Finish)
  l3Name: number;             // L3명
  projectName: number;        // 과제명
  assigneeR: number;          // 책임 담당자(T)
  assigneeAXPlan: number;     // 상세화담당자(AX기획)
  assigneeAXDev: number;      // 상세화담당자(AX개발)
  orgT: number;               // 담당구분(T)
}
