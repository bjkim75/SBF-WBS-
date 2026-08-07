import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { mapIAColumns } from './iaColumnMapper';
import { readSheetFromPath } from './testHelper';
import { IA_REQUIRED_HEADERS, IA_HEADER_MAPPING } from '../constants/iaSchema';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('IAColumnMapper', () => {
  describe('실제 IA Sheet 헤더 매핑', () => {
    it('실제 IA Sheet 헤더로 올바른 IAColumnMap indices를 반환한다', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');
      const columnMap = mapIAColumns(rawSheet.headers);

      // 모든 필수 필드가 -1이 아닌 유효한 index를 가져야 함
      expect(columnMap.workId).toBeGreaterThanOrEqual(0);
      expect(columnMap.subId).toBeGreaterThanOrEqual(0);
      expect(columnMap.division).toBeGreaterThanOrEqual(0);
      expect(columnMap.category).toBeGreaterThanOrEqual(0);
      expect(columnMap.depth3).toBeGreaterThanOrEqual(0);
      expect(columnMap.milestone).toBeGreaterThanOrEqual(0);
      expect(columnMap.startDate).toBeGreaterThanOrEqual(0);
      expect(columnMap.finishDate).toBeGreaterThanOrEqual(0);
      expect(columnMap.assigneeR).toBeGreaterThanOrEqual(0);
      expect(columnMap.assigneeAXPlan).toBeGreaterThanOrEqual(0);
      expect(columnMap.assigneeAXDev).toBeGreaterThanOrEqual(0);
    });

    it('매핑된 index가 헤더 배열 범위 내에 있다', () => {
      const rawSheet = readSheetFromPath(SAMPLE_FILE, '1. IA');
      const columnMap = mapIAColumns(rawSheet.headers);

      const maxIndex = rawSheet.headers.length - 1;
      for (const [key, idx] of Object.entries(columnMap)) {
        if (idx >= 0) {
          expect(idx).toBeLessThanOrEqual(maxIndex);
        }
      }
    });
  });

  describe('필수 헤더 누락 시 에러', () => {
    it('필수 헤더가 누락되면 에러를 throw한다', () => {
      // 필수 헤더 중 "업무ID"만 빠진 헤더 목록
      const headers = IA_REQUIRED_HEADERS.filter(h => h !== '업무ID');
      expect(() => mapIAColumns([...headers])).toThrow();
    });

    it('에러 메시지에 누락된 헤더 이름이 포함된다', () => {
      const headers = IA_REQUIRED_HEADERS.filter(h => h !== '업무ID');
      try {
        mapIAColumns([...headers]);
        expect.fail('에러가 발생해야 합니다');
      } catch (e: any) {
        expect(e.message).toContain('업무ID');
      }
    });
  });

  describe('선택 헤더 누락 시 -1 반환', () => {
    it('선택 헤더가 없으면 해당 필드가 -1을 반환한다', () => {
      // 필수 헤더만 제공 (선택 헤더 제외)
      const headers = [...IA_REQUIRED_HEADERS];
      const columnMap = mapIAColumns(headers);

      // "도메인"은 선택 헤더이므로 -1이어야 함
      expect(columnMap.domain).toBe(-1);
      // "L3명"도 선택 헤더
      expect(columnMap.l3Name).toBe(-1);
    });
  });

  describe('Case-insensitive 매칭', () => {
    it('대소문자가 달라도 올바르게 매핑된다', () => {
      const headers = IA_REQUIRED_HEADERS.map(h => h.toUpperCase());
      const columnMap = mapIAColumns(headers);

      // 필수 필드가 유효한 index를 가져야 함
      expect(columnMap.workId).toBeGreaterThanOrEqual(0);
      expect(columnMap.milestone).toBeGreaterThanOrEqual(0);
      expect(columnMap.assigneeR).toBeGreaterThanOrEqual(0);
    });

    it('앞뒤 공백이 있어도 올바르게 매핑된다', () => {
      const headers = IA_REQUIRED_HEADERS.map(h => `  ${h}  `);
      const columnMap = mapIAColumns(headers);

      expect(columnMap.workId).toBeGreaterThanOrEqual(0);
      expect(columnMap.division).toBeGreaterThanOrEqual(0);
    });
  });
});
