import { describe, it, expect } from 'vitest';
import { validateSchema } from './schemaValidator';
import { mapIAColumns } from './iaColumnMapper';
import { IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS } from '../constants/iaSchema';

/**
 * Schema Mismatch 처리 테스트
 * 헤더가 다른 XLSX 업로드 시 정상적으로 거부되는지 확인
 */
describe('Schema Mismatch Handling', () => {
  describe('validateSchema - 스키마 불일치 검출', () => {
    it('필수 헤더가 전부 누락되면 isValid=false를 반환한다', () => {
      const wrongHeaders = ['컬럼A', '컬럼B', '컬럼C'];
      const result = validateSchema(wrongHeaders, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns.length).toBe(IA_REQUIRED_HEADERS.length);
    });

    it('일부 필수 헤더만 있을 때 누락된 것을 정확히 보고한다', () => {
      const partialHeaders = ['업무ID', 'SUB ID', '담당 분과'];
      const result = validateSchema(partialHeaders, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(false);
      // 있는 헤더는 누락 목록에 없어야 한다
      expect(result.missingColumns).not.toContain('업무ID');
      expect(result.missingColumns).not.toContain('SUB ID');
      expect(result.missingColumns).not.toContain('담당 분과');
      // 없는 필수 헤더는 누락 목록에 있어야 한다
      expect(result.missingColumns).toContain('구분');
      expect(result.missingColumns).toContain('milestone');
      expect(result.missingColumns).toContain('업무 Flow 초안');
      expect(result.missingColumns).toContain('figma 디자인');
      expect(result.missingColumns).toContain('책임 담당자(T)');
    });

    it('완전히 다른 스키마의 파일을 거부한다', () => {
      const totallyDifferent = ['Name', 'Age', 'Email', 'Phone', 'Address'];
      const result = validateSchema(totallyDifferent, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns.length).toBe(IA_REQUIRED_HEADERS.length);
      expect(result.extraColumns.length).toBe(5);
    });

    it('빈 헤더 배열은 모든 필수 헤더가 누락된 것으로 처리한다', () => {
      const result = validateSchema([], IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns.length).toBe(IA_REQUIRED_HEADERS.length);
    });
  });

  describe('mapIAColumns - 매핑 실패 처리', () => {
    it('필수 헤더 대부분 누락 시 에러를 throw한다', () => {
      const wrongHeaders = ['업무ID', 'SUB ID'];
      expect(() => mapIAColumns(wrongHeaders)).toThrow();
    });

    it('에러 메시지에 "Column 매핑 실패" 문구가 포함된다', () => {
      const wrongHeaders = ['업무ID', 'SUB ID'];
      try {
        mapIAColumns(wrongHeaders);
        expect.fail('에러가 발생해야 합니다');
      } catch (e: any) {
        expect(e.message).toContain('Column 매핑 실패');
      }
    });

    it('에러 메시지에 누락된 헤더 이름이 포함된다', () => {
      const wrongHeaders = ['업무ID', 'SUB ID'];
      try {
        mapIAColumns(wrongHeaders);
        expect.fail('에러가 발생해야 합니다');
      } catch (e: any) {
        // 누락된 필수 헤더들이 에러 메시지에 포함되어야 한다
        expect(e.message).toContain('담당 분과');
        expect(e.message).toContain('구분');
        expect(e.message).toContain('milestone');
      }
    });

    it('빈 헤더 배열로 매핑 시도 시 에러를 throw한다', () => {
      expect(() => mapIAColumns([])).toThrow();
    });
  });

  describe('Pipeline 차단 확인', () => {
    it('validateSchema 실패 시 pipeline이 차단된다 (isValid로 분기)', () => {
      const wrongHeaders = ['Name', 'Age', 'Email'];
      const result = validateSchema(wrongHeaders, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      // isValid=false일 때 후속 처리로 진행하면 안 됨
      expect(result.isValid).toBe(false);

      // 실제 앱에서는 이 분기를 통해 pipeline 중단
      if (!result.isValid) {
        // pipeline 차단 — IAColumnMapper 호출하지 않음
        expect(result.missingColumns.length).toBeGreaterThan(0);
      }
    });

    it('validateSchema 성공 시 pipeline이 계속 진행된다', () => {
      const validHeaders = [...IA_REQUIRED_HEADERS, ...IA_OPTIONAL_HEADERS];
      const result = validateSchema(validHeaders, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);

      // pipeline 계속 — IAColumnMapper 호출 가능
      const columnMap = mapIAColumns(validHeaders);
      expect(columnMap.workId).toBeGreaterThanOrEqual(0);
      expect(columnMap.milestone).toBeGreaterThanOrEqual(0);
    });
  });
});
