import { describe, it, expect } from 'vitest';
import { excelSerialToDate, formatDate, isExcelDateSerial } from './dateUtils';

describe('dateUtils', () => {
  describe('excelSerialToDate', () => {
    it('알려진 Excel serial → Date 변환 (44927 = 2023-01-01)', () => {
      const date = excelSerialToDate(44927);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2023);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(1);
    });

    it('IA Sheet의 날짜 범위: 46052 = 2026-01-30 근처', () => {
      const date = excelSerialToDate(46052);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
    });

    it('null 입력 → null 반환', () => {
      expect(excelSerialToDate(null)).toBeNull();
      expect(excelSerialToDate(undefined)).toBeNull();
    });

    it('유효 범위 밖 → null 반환', () => {
      expect(excelSerialToDate(0)).toBeNull();
      expect(excelSerialToDate(-1)).toBeNull();
      expect(excelSerialToDate(3000000)).toBeNull();
    });

    it('NaN, Infinity → null 반환', () => {
      expect(excelSerialToDate(NaN)).toBeNull();
      expect(excelSerialToDate(Infinity)).toBeNull();
      expect(excelSerialToDate(-Infinity)).toBeNull();
    });

    it('1 = 1900-01-01', () => {
      const date = excelSerialToDate(1);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(1900);
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(1);
    });
  });

  describe('formatDate', () => {
    it('Date → YYYY-MM-DD 형식', () => {
      const date = new Date(2026, 0, 30); // 2026-01-30
      expect(formatDate(date)).toBe('2026-01-30');
    });

    it('null → null', () => {
      expect(formatDate(null)).toBeNull();
    });
  });

  describe('isExcelDateSerial', () => {
    it('유효한 serial number → true', () => {
      expect(isExcelDateSerial(44927)).toBe(true);
      expect(isExcelDateSerial(46052)).toBe(true);
    });

    it('null, string, 범위 밖 → false', () => {
      expect(isExcelDateSerial(null)).toBe(false);
      expect(isExcelDateSerial('44927')).toBe(false);
      expect(isExcelDateSerial(0)).toBe(false);
      expect(isExcelDateSerial(-1)).toBe(false);
    });
  });
});
