import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { readSheetFromPath, getSheetNamesFromPath } from './testHelper';
import { validateSchema } from './schemaValidator';
import { mapIAColumns } from './iaColumnMapper';
import { IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS, IA_SHEET_NAME } from '../constants/iaSchema';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('GATE-1: Phase 1 Full Pipeline Integration Test', () => {
  it('GATE-1.1: IA Sheet ("1. IA")가 workbook에 존재한다', () => {
    const sheetNames = getSheetNamesFromPath(SAMPLE_FILE);
    expect(sheetNames).toContain(IA_SHEET_NAME);
  });

  it('GATE-1.2: 헤더가 올바르게 식별된다 (40+ 비어 있지 않은 헤더)', () => {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const nonEmptyHeaders = rawSheet.headers.filter(h => h !== '');

    expect(nonEmptyHeaders.length).toBeGreaterThanOrEqual(40);
  });

  it('GATE-1.3: 11개 필수 Column이 모두 성공적으로 매핑된다 (not -1)', () => {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const columnMap = mapIAColumns(rawSheet.headers);

    // 11개 필수 Column 검증 (requirements에 명시된 것들)
    const requiredFields = [
      { name: '업무ID', field: 'workId' as const },
      { name: 'SUB ID', field: 'subId' as const },
      { name: '담당 분과', field: 'division' as const },
      { name: '구분', field: 'category' as const },
      { name: '3Depth', field: 'depth3' as const },
      { name: 'milestone', field: 'milestone' as const },
      { name: '업무 Flow 초안', field: 'startDate' as const },
      { name: 'figma 디자인', field: 'finishDate' as const },
      { name: '책임 담당자(T)', field: 'assigneeR' as const },
      { name: '상세화담당자(AX기획)', field: 'assigneeAXPlan' as const },
      { name: '상세화담당자(AX개발)', field: 'assigneeAXDev' as const },
    ];

    for (const { name, field } of requiredFields) {
      expect(columnMap[field], `필수 Column "${name}" 매핑 실패`).not.toBe(-1);
      expect(columnMap[field], `필수 Column "${name}"은 0 이상의 index여야 함`).toBeGreaterThanOrEqual(0);
    }
  });

  it('GATE-1.4: SchemaValidationResult.isValid = true', () => {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const result = validateSchema(rawSheet.headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);

    expect(result.isValid).toBe(true);
    expect(result.missingColumns).toHaveLength(0);
  });

  it('GATE-1.5: 데이터 행이 존재한다 (약 1,180행 예상)', () => {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);

    expect(rawSheet.rows.length).toBeGreaterThan(1000);
    // 대략 1,180행 근처
    expect(rawSheet.rows.length).toBeLessThan(2000);
  });

  it('GATE-1.6: Row indices가 1-indexed이다 (첫 데이터 행 = 2)', () => {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);

    // 첫 데이터 행은 Header(row 0) 다음이므로 rowIndex = 2
    expect(rawSheet.rows[0].rowIndex).toBe(2);

    // 모든 행의 rowIndex > 1 (Header Row 이후)
    for (const row of rawSheet.rows) {
      expect(row.rowIndex).toBeGreaterThanOrEqual(2);
    }
  });

  it('GATE-1: Full Pipeline — Read → Validate → Map 전체 파이프라인 통과', () => {
    // Step 1: Sheet 목록 확인
    const sheetNames = getSheetNamesFromPath(SAMPLE_FILE);
    expect(sheetNames).toContain(IA_SHEET_NAME);

    // Step 2: IA Sheet 읽기
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    expect(rawSheet.headers.length).toBeGreaterThan(0);
    expect(rawSheet.rows.length).toBeGreaterThan(0);

    // Step 3: Schema 검증
    const validationResult = validateSchema(rawSheet.headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);
    expect(validationResult.isValid).toBe(true);

    // Step 4: Column 매핑
    const columnMap = mapIAColumns(rawSheet.headers);

    // Step 5: 결과 검증 — 매핑된 index로 실제 데이터 접근 가능 확인
    const firstRow = rawSheet.rows[0];
    // 업무ID column의 값에 접근 가능해야 함
    const workIdValue = firstRow.cells[columnMap.workId];
    expect(workIdValue).toBeDefined();

    // 결과 요약 출력 (디버깅용)
    console.log('=== GATE-1 Pipeline Results ===');
    console.log(`Sheet Names: ${sheetNames.join(', ')}`);
    console.log(`Headers Count: ${rawSheet.headers.length}`);
    console.log(`Non-empty Headers: ${rawSheet.headers.filter(h => h !== '').length}`);
    console.log(`Data Rows: ${rawSheet.rows.length}`);
    console.log(`First Row Index: ${rawSheet.rows[0].rowIndex}`);
    console.log(`Validation isValid: ${validationResult.isValid}`);
    console.log(`Matched Columns: ${validationResult.matchedColumns.length}`);
    console.log(`Column Map:`, JSON.stringify(columnMap, null, 2));
  });
});
