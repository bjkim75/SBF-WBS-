import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateSchema } from './schemaValidator';
import { IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS } from '../constants/iaSchema';

describe('SchemaValidator', () => {
  describe('기본 검증', () => {
    it('모든 필수 헤더가 있으면 isValid: true를 반환한다', () => {
      const headers = [...IA_REQUIRED_HEADERS, ...IA_OPTIONAL_HEADERS, '기타 헤더1', '기타 헤더2'];
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toHaveLength(0);
    });

    it('필수 헤더 하나가 누락되면 isValid: false를 반환한다', () => {
      // "업무ID"를 제외한 나머지 필수 헤더
      const headers = IA_REQUIRED_HEADERS.filter(h => h !== '업무ID');
      const result = validateSchema([...headers], IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns).toContain('업무ID');
    });

    it('선택 헤더가 누락되어도 isValid: true이고 warnings에 포함된다', () => {
      // 필수 헤더만 있고 선택 헤더 없음
      const headers = [...IA_REQUIRED_HEADERS];
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      // 선택 헤더 수만큼 경고가 있어야 함
      expect(result.warnings.length).toBe(IA_OPTIONAL_HEADERS.length);
    });

    it('모든 필수 헤더와 선택 헤더가 있으면 warnings가 비어 있다', () => {
      const headers = [...IA_REQUIRED_HEADERS, ...IA_OPTIONAL_HEADERS];
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Case-insensitive 매칭', () => {
    it('대소문자가 달라도 매칭된다', () => {
      const headers = IA_REQUIRED_HEADERS.map(h => h.toUpperCase());
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toHaveLength(0);
    });
  });

  describe('Whitespace-trimmed 매칭', () => {
    it('앞뒤 공백이 있어도 매칭된다', () => {
      const headers = IA_REQUIRED_HEADERS.map(h => `  ${h}  `);
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toHaveLength(0);
    });
  });

  describe('extraColumns 검출', () => {
    it('Expected에 없는 헤더를 extraColumns로 반환한다', () => {
      const extra = ['추가 컬럼A', '추가 컬럼B'];
      const headers = [...IA_REQUIRED_HEADERS, ...extra];
      const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

      expect(result.extraColumns).toContain('추가 컬럼A');
      expect(result.extraColumns).toContain('추가 컬럼B');
    });
  });

  describe('Property 1: Schema Validation Round-Trip Consistency', () => {
    /**
     * **Validates: Requirements 1.1**
     *
     * Property 1: For any set of headers that is a superset of IA_REQUIRED_HEADERS,
     * SchemaValidator SHALL return isValid: true and missingColumns SHALL be empty.
     */
    it('필수 헤더의 상위집합에 대해 항상 isValid: true를 반환한다', () => {
      // 임의의 추가 헤더를 생성하는 Arbitrary
      const extraHeadersArb = fc.array(
        fc.string({ minLength: 1, maxLength: 20 }),
        { minLength: 0, maxLength: 10 }
      );

      fc.assert(
        fc.property(extraHeadersArb, (extraHeaders) => {
          // 필수 헤더 전부 + 랜덤 추가 헤더 = 상위집합
          const headers = [...IA_REQUIRED_HEADERS, ...extraHeaders];
          const result = validateSchema(headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

          // Property: superset of required → isValid=true, missingColumns=[]
          expect(result.isValid).toBe(true);
          expect(result.missingColumns).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
