/**
 * WBS Ticket Analysis 데이터 모델
 *
 * WBS XLSX 파일에서 파싱된 Jira Ticket 데이터의 타입 정의.
 * Raw 컬럼 매핑, 정규화된 Ticket, 에러, WorkId Index를 포함한다.
 */

/**
 * WBS 파일의 컬럼 매핑 결과
 * 헤더 이름 기반 동적 매핑 — 컬럼 위치 하드코딩 금지
 */
export interface WbsColumnMap {
  /** "키" 컬럼 인덱스 (Jira key) */
  key: number;
  /** "구분" 컬럼 인덱스 */
  category: number;
  /** "요약" 컬럼 인덱스 */
  summary: number;
  /** "상태" 컬럼 인덱스 */
  status: number;
  /** "[N]계획시작일" 컬럼 인덱스 */
  planStartDate: number;
  /** "[N]계획종료일" 컬럼 인덱스 */
  planEndDate: number;
  /** "유형" 컬럼 인덱스 */
  issueType: number;
  /** "[N]WBS 담당자" 컬럼 인덱스 */
  wbsAssignee: number;
  /** "[N]SKT/B 담당자" 컬럼 인덱스 */
  sktAssignee: number;
  /** "[N]SBF_도메인" 컬럼 인덱스 */
  sbfDomain: number;
  /** "[N]SBF_업무ID/명" 컬럼 인덱스 — 필수 */
  sbfWorkId: number;
  /** "[N]WBS Level7" 컬럼 인덱스 */
  wbsLevel7: number;
}

/**
 * 정규화된 WBS Ticket — 1개 Jira 티켓에 해당
 * Raw Cell 값을 타입 안전하게 변환한 결과
 */
export interface NormalizedWbsTicket {
  /** Jira Key (예: "SMZ000605-12345") */
  jiraKey: string;
  /** 구분 (예: "스토리", "작업") */
  category: string | null;
  /** 요약 (Jira Summary) */
  summary: string;
  /** 상태 (예: "진행 중", "완료") */
  status: string | null;
  /** 계획시작일 (Excel serial → Date 변환) */
  planStartDate: Date | null;
  /** 계획종료일 (Excel serial → Date 변환) */
  planEndDate: Date | null;
  /** 유형 */
  issueType: string | null;
  /** WBS 담당자 */
  wbsAssignee: string | null;
  /** SKT/B 담당자 */
  sktAssignee: string | null;
  /** SBF 도메인 */
  sbfDomain: string | null;
  /** SBF 업무ID/명 원본 값 (정규화 전) */
  sbfWorkIdRaw: string | null;
  /** 정규화된 WorkId (canonicalizeWorkId() 결과) */
  canonicalWorkId: string | null;
  /** WBS Level7 */
  wbsLevel7: string | null;
  /** 원본 시트명 (traceability) */
  sourceSheet: string;
  /** 원본 행 번호 (1-indexed, traceability) */
  sourceRow: number;
}

/**
 * WBS 에러 타입
 * 파일 읽기, 스키마 검증, 파싱 단계별 에러를 구분한다.
 */
export interface WbsError {
  /** 에러 유형 */
  type: 'FILE_READ_ERROR' | 'SCHEMA_VALIDATION_ERROR' | 'PARSE_ERROR';
  /** 사용자 표시용 에러 메시지 */
  message: string;
  /** 추가 상세 정보 (예: 누락된 컬럼 목록) */
  details?: string[];
}

/**
 * WorkId Index — workId를 키로, 해당 workId에 매핑된 모든 Ticket을 값으로 갖는 Map
 * 한 번 생성되면 파일 교체 전까지 변경 없음 (immutable after build)
 */
export type WbsIndex = Map<string, NormalizedWbsTicket[]>;
