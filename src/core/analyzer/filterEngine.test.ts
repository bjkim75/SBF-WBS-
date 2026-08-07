import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as path from 'path';
import { readSheetFromPath } from '../parser/testHelper';
import { mapIAColumns } from '../parser/iaColumnMapper';
import { normalize } from '../normalizer/iaNormalizer';
import { applyFilters } from './filterEngine';
import { IA_SHEET_NAME, IA_DEFAULT_EXCLUDED_DIVISIONS } from '../constants/iaSchema';
import { FilterState, INITIAL_FILTER_STATE } from '../../models/filter';
import { NormalizedWork } from '../../models/normalized';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('FilterEngine — 실제 데이터 검증', () => {
  function loadWorks(): NormalizedWork[] {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const columnMap = mapIAColumns(rawSheet.headers);
    return normalize(rawSheet, columnMap);
  }

  it('selectedDivisions=null → 전체 데이터 반환 (필터 미적용)', () => {
    const works = loadWorks();
    const result = applyFilters(works, INITIAL_FILTER_STATE);
    // selectedDivisions가 null이면 모든 분과 포함
    expect(result.length).toBe(works.length);
  });

  it('selectedDivisions에서 기본 제외 분과 제거 → 해당 분과 제외', () => {
    const works = loadWorks();
    const allDivisions = [...new Set(works.map(w => w.division))];
    const selectedDivisions = allDivisions.filter(d =>
      !(IA_DEFAULT_EXCLUDED_DIVISIONS as readonly string[]).includes(d)
    );
    const filters: FilterState = { ...INITIAL_FILTER_STATE, selectedDivisions };
    const result = applyFilters(works, filters);

    const expectedCount = works.filter(w =>
      !(IA_DEFAULT_EXCLUDED_DIVISIONS as readonly string[]).includes(w.division)
    ).length;
    expect(result.length).toBe(expectedCount);
  });

  it('selectedDivisions에 전체 분과 포함 → 전체 데이터 반환', () => {
    const works = loadWorks();
    const allDivisions = [...new Set(works.map(w => w.division))];
    const filters: FilterState = { ...INITIAL_FILTER_STATE, selectedDivisions: allDivisions };
    const result = applyFilters(works, filters);
    expect(result.length).toBe(works.length);
  });

  it('selectedDivisions=[] (빈 배열) → 0건 반환', () => {
    const works = loadWorks();
    const filters: FilterState = { ...INITIAL_FILTER_STATE, selectedDivisions: [] };
    const result = applyFilters(works, filters);
    expect(result.length).toBe(0);
  });

  it('특정 Milestone 필터 → 해당 MS 업무만 반환', () => {
    const works = loadWorks();
    const milestones = [...new Set(works.map(w => w.milestone))];
    const targetMs = milestones[0];

    const filters: FilterState = { ...INITIAL_FILTER_STATE, milestones: [targetMs] };
    const result = applyFilters(works, filters);

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(works.length);
    for (const work of result) {
      expect(work.milestone).toBe(targetMs);
    }
  });

  it('특정 분과 selectedDivisions 필터 → 해당 분과 업무만 반환', () => {
    const works = loadWorks();
    const divisions = [...new Set(works.map(w => w.division))].filter(d => d !== 'SKB(유선)');
    const targetDiv = divisions[0];

    const filters: FilterState = { ...INITIAL_FILTER_STATE, selectedDivisions: [targetDiv] };
    const result = applyFilters(works, filters);

    expect(result.length).toBeGreaterThan(0);
    for (const work of result) {
      expect(work.division).toBe(targetDiv);
    }
  });

  it('복합 필터 (Milestone + selectedDivisions) → 교집합 반환', () => {
    const works = loadWorks();
    const targetMs = works[0].milestone;
    const targetDiv = works[0].division;

    const filters: FilterState = {
      ...INITIAL_FILTER_STATE,
      milestones: [targetMs],
      selectedDivisions: [targetDiv],
    };
    const result = applyFilters(works, filters);

    for (const work of result) {
      expect(work.milestone).toBe(targetMs);
      expect(work.division).toBe(targetDiv);
    }
  });

  it('존재하지 않는 Milestone 필터 → 0건', () => {
    const works = loadWorks();
    const filters: FilterState = { ...INITIAL_FILTER_STATE, milestones: ['존재하지않는MS'] };
    const result = applyFilters(works, filters);
    expect(result.length).toBe(0);
  });

  it('GATE-4: 필터 결과가 원본의 부분집합이다', () => {
    const works = loadWorks();
    const milestones = [...new Set(works.map(w => w.milestone))].slice(0, 3);
    const filters: FilterState = { ...INITIAL_FILTER_STATE, milestones };
    const result = applyFilters(works, filters);

    // 결과의 모든 항목이 원본에 존재
    for (const work of result) {
      expect(works).toContain(work);
    }
  });
});

describe('Property-Based Tests (Phase 4)', () => {
  const normalizedWorkArb = fc.record({
    workId: fc.string({ minLength: 1, maxLength: 10 }),
    subIds: fc.array(fc.nat({ max: 12 }), { maxLength: 3 }),
    division: fc.oneof(fc.constant('A'), fc.constant('B'), fc.constant('C')),
    depth1: fc.option(fc.string({ maxLength: 5 })),
    depth2: fc.option(fc.string({ maxLength: 5 })),
    depth3: fc.option(fc.string({ maxLength: 5 })),
    depth4: fc.option(fc.string({ maxLength: 5 })),
    milestone: fc.oneof(fc.constant('#1'), fc.constant('#2'), fc.constant('#3')),
    workName: fc.string({ minLength: 1, maxLength: 10 }),
    startDate: fc.option(fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) })),
    finishDate: fc.option(fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) })),
    assigneeR: fc.oneof(fc.constant('X'), fc.constant('Y'), fc.constant('Z')),
    assigneeAXPlan: fc.oneof(fc.constant('P1'), fc.constant('-')),
    assigneeAXDev: fc.oneof(fc.constant('D1'), fc.constant('-')),
    projectName: fc.option(fc.string({ maxLength: 5 })),
    l3Name: fc.option(fc.string({ maxLength: 5 })),
    orgT: fc.option(fc.string({ maxLength: 5 })),
    sourceRows: fc.array(fc.integer({ min: 2, max: 100 }), { minLength: 1, maxLength: 3 }),
    isGanttVisible: fc.boolean(),
    isPointMarker: fc.boolean(),
  }) as fc.Arbitrary<NormalizedWork>;

  const filterStateArb = fc.record({
    milestones: fc.subarray(['#1', '#2', '#3']),
    selectedDivisions: fc.oneof(
      fc.constant(null as string[] | null),
      fc.subarray(['A', 'B', 'C']),
    ),
    assigneesR: fc.subarray(['X', 'Y', 'Z']),
    dateRange: fc.constant({ start: null, end: null }),
    assigneesAXPlan: fc.subarray(['P1', '-']),
    assigneesAXDev: fc.subarray(['D1', '-']),
  }) as fc.Arbitrary<FilterState>;

  /**
   * Property 5: Filter Subset Property
   * For any NormalizedWork[] and any FilterState, the result of applyFilters()
   * SHALL be a subset of the input.
   *
   * **Validates: Requirements 5.7, 5.8**
   */
  it('Property 5: 필터 결과는 항상 입력의 부분집합이다', () => {
    fc.assert(
      fc.property(
        fc.array(normalizedWorkArb, { minLength: 0, maxLength: 50 }),
        filterStateArb,
        (works, filters) => {
          const result = applyFilters(works, filters);

          // Result is subset
          expect(result.length).toBeLessThanOrEqual(works.length);
          for (const item of result) {
            expect(works).toContain(item);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Filter Correctness (All Retained Items Match)
   * For any NormalizedWork[] and any FilterState with non-empty filters,
   * every item in output SHALL satisfy all filter conditions.
   *
   * **Validates: Requirements 5.1, 5.2, 5.3**
   */
  it('Property 6: 필터된 결과의 모든 항목이 필터 조건을 만족한다', () => {
    fc.assert(
      fc.property(
        fc.array(normalizedWorkArb, { minLength: 1, maxLength: 50 }),
        filterStateArb,
        (works, filters) => {
          const result = applyFilters(works, filters);

          for (const work of result) {
            if (filters.milestones.length > 0) {
              expect(filters.milestones).toContain(work.milestone);
            }
            if (filters.selectedDivisions !== null && filters.selectedDivisions.length > 0) {
              expect(filters.selectedDivisions).toContain(work.division);
            }
            if (filters.assigneesR.length > 0) {
              expect(filters.assigneesR).toContain(work.assigneeR);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
