import * as XLSX from 'xlsx';
import { RawRow, RawSheet } from '../../models/raw';

/**
 * XLSX 파일을 읽어 RawSheet를 반환하는 범용 Sheet Reader
 * SBF 업무 로직을 포함하지 않음 (TD-6: 향후 common-xlsx로 분리 가능)
 */

/**
 * File 객체에서 ArrayBuffer를 읽는 유틸리티
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * XLSX 파일에서 Sheet 이름 목록을 반환
 */
export async function getSheetNames(file: File): Promise<string[]> {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames;
}

/**
 * XLSX 파일의 지정된 Sheet를 읽어 RawSheet를 반환
 * @param file - XLSX File 객체
 * @param sheetName - 읽을 Sheet 이름 (없으면 에러)
 * @returns RawSheet (headers + rows with 1-indexed rowIndex)
 * @throws Sheet를 찾을 수 없는 경우 에러
 */
export async function readSheet(file: File, sheetName: string): Promise<RawSheet> {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: true });

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(`Sheet "${sheetName}"을 찾을 수 없습니다. 사용 가능한 Sheet: ${available}`);
  }

  const ref = sheet['!ref'];
  if (!ref) {
    return { sheetName, headers: [], rows: [] };
  }

  const range = XLSX.utils.decode_range(ref);

  // Header Row 추출 (첫 번째 행)
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = sheet[cellAddr];
    headers.push(cell && cell.v != null ? String(cell.v).trim() : '');
  }

  // Data Rows 추출 (Header 다음 행부터)
  const rows: RawRow[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const cells: (string | number | null)[] = [];
    let hasValue = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddr];

      if (!cell || cell.v == null) {
        cells.push(null);
      } else if (cell.t === 'n') {
        cells.push(cell.v as number);
        hasValue = true;
      } else {
        cells.push(String(cell.v));
        hasValue = true;
      }
    }

    // 완전히 빈 행은 제외
    if (hasValue) {
      rows.push({
        rowIndex: r + 1, // 1-indexed (Excel 행 번호 기준)
        cells,
      });
    }
  }

  return { sheetName, headers, rows };
}
