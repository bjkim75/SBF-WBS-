import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as path from 'path';
import { readSheetFromPath } from '../parser/testHelper';
import { mapIAColumns } from '../parser/iaColumnMapper';
import { normalize } from './iaNormalizer';
import { groupByMilestone } from './milestoneGrouper';
import { IA_SHEET_NAME, IA_EXCLUDED_CATEGORY, NULL_SUBSTITUTES } from '../constants/iaSchema';
import { RawRow, RawSheet, IAColumnMap } from '../../models/raw';
import { NormalizedWork } from '../../models/normalized';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('IANormalizer', () => {
  // Helper: load real data
  function loadRealData() {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const columnMap = mapIAColumns(rawSheet.headers);
    return { rawSheet, columnMap };
  }

  describe('실제 SBF_Framework.xlsx 정규화', () => {
    it('정규화 결과가 생성된다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      expect(works).toBeDefined();
      expect(works.length).toBeGreaterThan(0);
    });

    it('DISTINCT 업무ID 수가 합리적 범위 (500~1000건)', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      // Data Discovery에서 ~940개 확인
      expect(works.length).toBeGreaterThan(500);
      expect(works.length).toBeLessThan(1000);
    });

    it('모든 workId가 고유하다 (DISTINCT)', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      const workIds = works.map(w => w.workId);
      const uniqueIds = new Set(workIds);
      expect(uniqueIds.size).toBe(workIds.length);
    });

    it('대표 샘플의 원본 Row 추적이 가능하다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      // 첫 3건의 sourceRows 확인
      for (const work of works.slice(0, 3)) {
        expect(work.sourceRows.length).toBeGreaterThan(0);
        for (const rowIdx of work.sourceRows) {
          expect(rowIdx).toBeGreaterThanOrEqual(2); // 1-indexed, Header=1
        }
      }
    });

    it('IA초안 행이 완전히 제외되었다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      // 어떤 NormalizedWork도 IA초안으로부터 생성되지 않아야 함
      for (const work of works) {
        for (const rowIdx of work.sourceRows) {
          const originalRow = rawSheet.rows.find(r => r.rowIndex === rowIdx);
          if (originalRow) {
            const category = originalRow.cells[columnMap.category];
            expect(String(category || '').trim()).not.toBe(IA_EXCLUDED_CATEGORY);
          }
        }
      }
    });
  });

  describe('Null 대체값 검증', () => {
    it('division은 절대 빈 문자열이 아니다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      for (const work of works) {
        expect(work.division).not.toBe('');
        expect(work.division.length).toBeGreaterThan(0);
      }
    });

    it('assigneeR은 절대 빈 문자열이 아니다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      for (const work of works) {
        expect(work.assigneeR).not.toBe('');
      }
    });

    it('milestone은 절대 빈 문자열이 아니다', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      for (const work of works) {
        expect(work.milestone).not.toBe('');
      }
    });
  });

  describe('Gantt Visibility 검증', () => {
    it('startDate와 finishDate 모두 null이면 isGanttVisible=false', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      for (const work of works) {
        if (work.startDate == null && work.finishDate == null) {
          expect(work.isGanttVisible).toBe(false);
        }
      }
    });

    it('startDate 있고 finishDate null이면 isPointMarker=true', () => {
      const { rawSheet, columnMap } = loadRealData();
      const works = normalize(rawSheet, columnMap);

      for (const work of works) {
        if (work.startDate != null && work.finishDate == null) {
          expect(work.isPointMarker).toBe(true);
          expect(work.isGanttVisible).toBe(true);
        }
      }
    });
  });
});

describe('MilestoneGrouper', () => {
  function loadRealData() {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const columnMap = mapIAColumns(rawSheet.headers);
    return { rawSheet, columnMap };
  }

  it('실제 데이터에서 MilestoneGroup을 생성한다', () => {
    const { rawSheet, columnMap } = loadRealData();
    const works = normalize(rawSheet, columnMap);
    const groups = groupByMilestone(works);

    expect(groups.length).toBeGreaterThan(0);
    // Data Discovery에서 22개 Milestone 확인
    expect(groups.length).toBeLessThanOrEqual(25);
  });

  it('모든 MilestoneGroup의 workCount 합계 = 전체 업무 수', () => {
    const { rawSheet, columnMap } = loadRealData();
    const works = normalize(rawSheet, columnMap);
    const groups = groupByMilestone(works);

    const totalFromGroups = groups.reduce((sum, g) => sum + g.workCount, 0);
    expect(totalFromGroups).toBe(works.length);
  });

  it('각 MilestoneGroup에 divisionGroups가 있다', () => {
    const { rawSheet, columnMap } = loadRealData();
    const works = normalize(rawSheet, columnMap);
    const groups = groupByMilestone(works);

    for (const group of groups) {
      expect(group.divisionGroups.size).toBeGreaterThan(0);
      // 분과별 합계 = 해당 Milestone의 workCount
      let divisionTotal = 0;
      for (const [_, divWorks] of group.divisionGroups) {
        divisionTotal += divWorks.length;
      }
      expect(divisionTotal).toBe(group.workCount);
    }
  });
});

describe('Property-Based Tests (Phase 2)', () => {
  /**
   * Helper: Create a column map matching the test RawSheet structure.
   * The headers array order defines the column indexes.
   */
  const TEST_HEADERS = [
    '업무ID',       // 0
    'SUB ID',       // 1
    '도메인',       // 2
    '담당 분과',    // 3
    '구분',         // 4
    '1Depth',       // 5
    '2Depth',       // 6
    '3Depth',       // 7
    '4Depth',       // 8
    'milestone',    // 9
    '업무 Flow 초안', // 10
    'figma 디자인', // 11
    'L3명',         // 12
    '과제명',       // 13
    '책임 담당자(T)', // 14
    '상세화담당자(AX기획)', // 15
    '상세화담당자(AX개발)', // 16
    '담당구분(T)',  // 17
  ];

  function createTestColumnMap(): IAColumnMap {
    // Use mapIAColumns with the well-known headers for correctness
    return mapIAColumns(TEST_HEADERS);
  }

  // Arbitrary for generating raw rows
  const rawRowArb = fc.record({
    workId: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant('')),
    subId: fc.nat({ max: 12 }),
    division: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant('')),
    category: fc.oneof(
      fc.constant('IA초안'),
      fc.constant('업무Flow'),
      fc.constant('스토리보드'),
      fc.constant('')
    ),
    depth3: fc.oneof(fc.string({ minLength: 1, maxLength: 20 }), fc.constant('')),
    milestone: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant('')),
    startDate: fc.oneof(
      fc.integer({ min: 45000, max: 47000 }),
      fc.constant(null)
    ) as fc.Arbitrary<number | null>,
    finishDate: fc.oneof(
      fc.integer({ min: 45000, max: 47000 }),
      fc.constant(null)
    ) as fc.Arbitrary<number | null>,
    assigneeR: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant('')),
  });

  function buildRawSheet(rows: {
    workId: string;
    subId: number;
    division: string;
    category: string;
    depth3: string;
    milestone: string;
    startDate: number | null;
    finishDate: number | null;
    assigneeR: string;
  }[]): RawSheet {
    const rawRows: RawRow[] = rows.map((r, i) => ({
      rowIndex: i + 2,
      cells: [
        r.workId || null,       // 0: 업무ID
        r.subId,                // 1: SUB ID
        null,                   // 2: 도메인
        r.division || null,     // 3: 담당 분과
        r.category || null,     // 4: 구분
        null,                   // 5: 1Depth
        null,                   // 6: 2Depth
        r.depth3 || null,       // 7: 3Depth
        null,                   // 8: 4Depth
        r.milestone || null,    // 9: milestone
        r.startDate,            // 10: 업무 Flow 초안
        r.finishDate,           // 11: figma 디자인
        null,                   // 12: L3명
        null,                   // 13: 과제명
        r.assigneeR || null,    // 14: 책임 담당자(T)
        null,                   // 15: 상세화담당자(AX기획)
        null,                   // 16: 상세화담당자(AX개발)
        null,                   // 17: 담당구분(T)
      ],
    }));
    return { sheetName: '1. IA', headers: TEST_HEADERS, rows: rawRows };
  }

  /**
   * Property 2: IA초안 Complete Exclusion
   * For any RawSheet with IA초안 rows mixed in, normalize SHALL produce
   * no work whose source rows contain a row where 구분="IA초안"
   *
   * **Validates: Requirements 1.4, 2.5, 3.4, 4.4, 6.6, 7.2**
   */
  it('Property 2: IA초안 행은 정규화 결과에 절대 포함되지 않는다', () => {
    const columnMap = createTestColumnMap();

    fc.assert(
      fc.property(fc.array(rawRowArb, { minLength: 1, maxLength: 50 }), (rows) => {
        const rawSheet = buildRawSheet(rows);
        const works = normalize(rawSheet, columnMap);

        // 결과의 모든 sourceRows를 역추적
        for (const work of works) {
          for (const rowIdx of work.sourceRows) {
            const originalRow = rawSheet.rows.find(r => r.rowIndex === rowIdx);
            if (originalRow) {
              const category = originalRow.cells[columnMap.category];
              expect(String(category || '').trim()).not.toBe(IA_EXCLUDED_CATEGORY);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: 업무ID Distinctness Preservation
   * For any input with N distinct non-null workIDs (excl. IA초안),
   * normalize SHALL produce exactly N NormalizedWork items
   *
   * **Validates: Requirements 2.6, 3.3, 7.1**
   */
  it('Property 3: DISTINCT 업무ID 수가 정확히 보존된다', () => {
    const columnMap = createTestColumnMap();

    fc.assert(
      fc.property(fc.array(rawRowArb, { minLength: 1, maxLength: 50 }), (rows) => {
        const rawSheet = buildRawSheet(rows);
        const works = normalize(rawSheet, columnMap);

        // Expected: distinct non-empty workIds from non-IA초안 rows
        const expectedIds = new Set<string>();
        for (const row of rawSheet.rows) {
          const category = String(row.cells[columnMap.category] || '').trim();
          const workId = String(row.cells[columnMap.workId] || '').trim();
          if (category !== IA_EXCLUDED_CATEGORY && workId !== '') {
            expectedIds.add(workId);
          }
        }

        expect(works.length).toBe(expectedIds.size);

        // All workIds are unique
        const actualIds = new Set(works.map(w => w.workId));
        expect(actualIds.size).toBe(works.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Gantt Visibility Exclusion
   * For any NormalizedWork where startDate==null AND finishDate==null, isGanttVisible SHALL be false
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 7: 날짜 모두 null이면 isGanttVisible=false', () => {
    const columnMap = createTestColumnMap();

    fc.assert(
      fc.property(fc.array(rawRowArb, { minLength: 1, maxLength: 30 }), (rows) => {
        const rawSheet = buildRawSheet(rows);
        const works = normalize(rawSheet, columnMap);

        for (const work of works) {
          if (work.startDate == null && work.finishDate == null) {
            expect(work.isGanttVisible).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Point Marker Identification
   * For any NormalizedWork where startDate!=null AND finishDate==null,
   * isPointMarker SHALL be true AND isGanttVisible SHALL be true
   *
   * **Validates: TD-5**
   */
  it('Property 8: start만 있고 finish null이면 isPointMarker=true', () => {
    const columnMap = createTestColumnMap();

    fc.assert(
      fc.property(fc.array(rawRowArb, { minLength: 1, maxLength: 30 }), (rows) => {
        const rawSheet = buildRawSheet(rows);
        const works = normalize(rawSheet, columnMap);

        for (const work of works) {
          if (work.startDate != null && work.finishDate == null) {
            expect(work.isPointMarker).toBe(true);
            expect(work.isGanttVisible).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Null Substitution Completeness
   * For any NormalizedWork, division/assigneeR/milestone SHALL never be empty string
   *
   * **Validates: Requirements 2.7, 2.8**
   */
  it('Property 10: Null 대체값이 빈 문자열 없이 완전히 적용된다', () => {
    const columnMap = createTestColumnMap();

    fc.assert(
      fc.property(fc.array(rawRowArb, { minLength: 1, maxLength: 30 }), (rows) => {
        const rawSheet = buildRawSheet(rows);
        const works = normalize(rawSheet, columnMap);

        for (const work of works) {
          expect(work.division).not.toBe('');
          expect(work.assigneeR).not.toBe('');
          expect(work.milestone).not.toBe('');
        }
      }),
      { numRuns: 100 }
    );
  });
});
