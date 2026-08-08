/**
 * Excel serial number → JavaScript Date 변환 유틸리티
 * 
 * Excel에서 날짜는 1900-01-01부터의 일수로 저장됨 (serial number)
 * 예: 44927 = 2023-01-01
 * 
 * 이 유틸리티는 도메인 무관 (향후 common-xlsx로 분리 가능)
 */

/**
 * Excel serial date의 유효 범위
 * 1 = 1900-01-01, 2958465 = 9999-12-31
 */
const EXCEL_DATE_MIN = 1;
const EXCEL_DATE_MAX = 2958465;

/**
 * Excel의 epoch: 1899-12-30 (Excel의 날짜 기준점)
 * 
 * Excel은 serial 60 = 1900-02-29를 잘못된 윤년으로 포함 (Lotus 1-2-3 호환 버그)
 * 이 때문에 serial 1~59는 실제보다 1일 뒤로 밀림.
 * serial >= 61부터는 epoch(1899-12-30) + days가 정확히 맞음.
 * serial 1~59: +1 보정 필요
 */
const EXCEL_EPOCH = new Date(1899, 11, 30); // 1899-12-30

/**
 * Excel serial number를 JavaScript Date로 변환
 * 
 * @param serial - Excel serial number (날짜를 나타내는 정수 또는 실수)
 * @returns Date 객체, 또는 유효하지 않은 값이면 null
 */
export function excelSerialToDate(serial: number | null | undefined): Date | null {
  if (serial == null || typeof serial !== 'number') {
    return null;
  }

  // 유효 범위 검증
  if (serial < EXCEL_DATE_MIN || serial > EXCEL_DATE_MAX) {
    return null;
  }

  // NaN, Infinity 처리
  if (!isFinite(serial)) {
    return null;
  }

  // Excel serial → milliseconds since EXCEL_EPOCH
  let days = Math.floor(serial);

  // Excel의 Lotus 1-2-3 호환 버그 보정:
  // serial 60 = 가짜 1900-02-29 (실제로 존재하지 않는 날)
  // serial 1~59: epoch(1899-12-30) + days = 하루 부족 → +1 보정
  // serial >= 61: epoch + days가 정확히 맞음 (가짜 날짜가 1일 추가했으므로)
  if (days <= 59) {
    days += 1;
  }

  const date = new Date(EXCEL_EPOCH.getTime() + days * 24 * 60 * 60 * 1000);

  // 결과 Date가 유효한지 확인
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Date를 YYYY-MM-DD 형식 문자열로 변환
 * 
 * @param date - Date 객체 (null이면 null 반환)
 * @returns "YYYY-MM-DD" 형식 문자열 또는 null
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Start date를 "YYYY.N월" 형식으로 표시
 * 예: 2026-01-01 → "2026.1월", 2026-03-01 → "2026.3월"
 * 
 * @param date - Start Date (해당 월 1일로 보정된 값)
 * @returns "YYYY.N월" 형식 문자열 또는 '미정'
 */
export function formatStartDate(date: Date | null): string {
  if (!date) return '미정';
  return `${date.getFullYear()}.${date.getMonth() + 1}월`;
}

/**
 * Cell 값이 유효한 Excel 날짜 serial인지 판별
 * 
 * @param value - Cell에서 읽은 원시 값
 * @returns true if the value is a valid Excel date serial number
 */
export function isExcelDateSerial(value: string | number | null): boolean {
  if (value == null || typeof value !== 'number') {
    return false;
  }
  return value >= EXCEL_DATE_MIN && value <= EXCEL_DATE_MAX && isFinite(value);
}
