/**
 * IA Sheet 필수 헤더 목록
 * 이 헤더가 하나라도 없으면 Schema Validation 실패
 *
 * 주의: Column index를 하드코딩하지 않음 — 헤더 이름 기반으로만 매핑
 */
export const IA_REQUIRED_HEADERS: readonly string[] = [
  '업무ID',
  'SUB ID',
  '담당 분과',
  '구분',
  '3Depth',
  'milestone',
  '업무 Flow 초안',
  'figma 디자인',
  '책임 담당자(T)',
  '상세화담당자(AX기획)',
  '상세화담당자(AX개발)',
] as const;

/**
 * IA Sheet 선택 헤더 목록
 * 이 헤더가 없어도 분석은 진행되지만 관련 기능이 제한됨
 */
export const IA_OPTIONAL_HEADERS: readonly string[] = [
  '도메인',
  '1Depth',
  '2Depth',
  '4Depth',
  'L3명',
  '과제명',
  '담당구분(T)',
] as const;

/**
 * IAColumnMapper에서 사용하는 헤더 이름 → 의미 매핑 정의
 * key: IAColumnMap의 필드명
 * value: 매칭할 헤더 이름 (case-insensitive, whitespace-trimmed 매칭 시 사용)
 */
export const IA_HEADER_MAPPING: Record<string, string> = {
  workId: '업무ID',
  subId: 'SUB ID',
  domain: '도메인',
  division: '담당 분과',
  category: '구분',
  depth1: '1Depth',
  depth2: '2Depth',
  depth3: '3Depth',
  depth4: '4Depth',
  milestone: 'milestone',
  startDate: '업무 Flow 초안',
  finishDate: 'figma 디자인',
  l3Name: 'L3명',
  projectName: '과제명',
  assigneeR: '책임 담당자(T)',
  assigneeAXPlan: '상세화담당자(AX기획)',
  assigneeAXDev: '상세화담당자(AX개발)',
  orgT: '담당구분(T)',
} as const;

/**
 * IA초안 제외를 위한 구분 Column 값
 */
export const IA_EXCLUDED_CATEGORY = 'IA초안';

/**
 * Null 대체값 상수
 */
export const NULL_SUBSTITUTES = {
  division: '미지정 분과',
  assigneeR: '미배정',
  milestone: '마일스톤 미지정',
  workName: '업무명 없음',
  assigneeAXPlan: '-',
  assigneeAXDev: '-',
} as const;

/**
 * IA Sheet 이름
 */
export const IA_SHEET_NAME = '1. IA';

/**
 * Phase Column 헤더 목록 (시간 순서대로)
 * IA Sheet의 Col T ~ Col AB에 해당하는 산출물 단계
 * 이 목록의 순서 = 날짜 순서 (물리적 Column 순서가 아님)
 */
export const IA_PHASE_HEADERS_ORDERED: readonly string[] = [
  '업무 Flow 초안',
  '업무Flow 상세',
  '업무Flow 피드백',
  '업무Flow 보완',
  '스토리보드 v0.2',
  '스토리보드 v0.5',
  '스토리보드 v0.8',
  '스토리보드 v1.0',
  'figma 디자인',
] as const;

/**
 * 기본 제외 분과 목록
 * 이 목록에 포함된 분과는 기본적으로 모든 집계에서 제외됨
 * 사용자가 필터에서 "제외 해제"하여 포함시킬 수 있음
 */
export const IA_DEFAULT_EXCLUDED_DIVISIONS: readonly string[] = [
  'SKB(유선)',
  'IT Admin',
] as const;
