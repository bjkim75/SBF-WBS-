/**
 * Node 환경(Vitest)에서 XLSX 파일을 직접 읽기 위한 테스트 헬퍼
 * 브라우저 File API 대신 fs.readFileSync를 사용하여 Buffer로 읽음
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { RawRow, RawSheet } from '../../models/raw';

/**
 * 파일 경로에서 직접 RawSheet를 생성하는 Node 전용 헬퍼
 * SheetReader의 readSheet와 동일한 로직을 Node Buffer 기반으로 구현
 */
export function readSheetFromPath(filePath: string, sheetName: string): RawSheet {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, cellNF: true });

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `Sheet "${sheetName}"을 찾을 수 없습니다. 사용 가능한 Sheet: ${workbook.SheetNames.join(', ')}`
    );
  }

  const ref = sheet['!ref'];
  if (!ref) return { sheetName, headers: [], rows: [] };

  const range = XLSX.utils.decode_range(ref);

  // Header Row 추출
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = sheet[cellAddr];
    headers.push(cell && cell.v != null ? String(cell.v).trim() : '');
  }

  // Data Rows 추출
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

    if (hasValue) {
      rows.push({ rowIndex: r + 1, cells });
    }
  }

  return { sheetName, headers, rows };
}

/**
 * 파일 경로에서 Sheet 이름 목록을 반환하는 Node 전용 헬퍼
 */
export function getSheetNamesFromPath(filePath: string): string[] {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames;
}
