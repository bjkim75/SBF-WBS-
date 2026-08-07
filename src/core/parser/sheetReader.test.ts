import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { readSheetFromPath, getSheetNamesFromPath } from './testHelper';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('SheetReader', () => {
  describe('getSheetNames', () => {
    it('실제 SBF_Framework.xlsx에서 Sheet 목록을 반환한다', () => {
      const sheetNames = getSheetNamesFromPath(SAMPLE_FILE);

      expect(sheetNames).toBeDefined();
      expect(sheetNames.length).toBeGreaterThan(0);
      // "1. IA" Sheet가 포함되어야 함
      expect(sheetNames).toContain('1. IA');
    });
  });

  describe('readSheet', () => {
    it('실제 SBF_Framework.xlsx의 "1. IA" Sheet를 읽을 수 있다', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');

      expect(rawSheet).toBeDefined();
      expect(rawSheet.sheetName).toBe('1. IA');
    });

    it('헤더가 올바르게 추출된다 (40+ 비어 있지 않은 헤더)', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');

      expect(rawSheet.headers).toBeDefined();
      expect(rawSheet.headers.length).toBeGreaterThan(0);

      const nonEmptyHeaders = rawSheet.headers.filter(h => h !== '');
      expect(nonEmptyHeaders.length).toBeGreaterThanOrEqual(40);
    });

    it('데이터 행이 존재한다 (약 1,180행 예상)', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');

      expect(rawSheet.rows).toBeDefined();
      expect(rawSheet.rows.length).toBeGreaterThan(1000);
    });

    it('행의 rowIndex가 1-indexed이다 (첫 데이터 행 = 2)', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');

      // 첫 데이터 행의 rowIndex는 2 이상이어야 함 (Header가 Row 1)
      expect(rawSheet.rows[0].rowIndex).toBeGreaterThanOrEqual(2);

      // 모든 rowIndex가 1보다 커야 함 (Header Row 이후)
      for (const row of rawSheet.rows) {
        expect(row.rowIndex).toBeGreaterThanOrEqual(2);
      }
    });

    it('존재하지 않는 Sheet 이름으로 읽으면 에러를 throw한다', () => {
      expect(() => readSheetFromPath(SAMPLE_FILE, '존재하지_않는_시트')).toThrow();
    });

    it('각 행의 cells 길이가 headers 길이와 동일하다', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');

      // 모든 행의 cells 길이가 headers 수와 일치해야 함
      for (const row of rawSheet.rows.slice(0, 10)) {
        expect(row.cells.length).toBe(rawSheet.headers.length);
      }
    });
  });
});
