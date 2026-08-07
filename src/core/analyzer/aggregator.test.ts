import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as path from 'path';
import { readSheetFromPath } from '../parser/testHelper';
import { mapIAColumns } from '../parser/iaColumnMapper';
import { normalize } from '../normalizer/iaNormalizer';
import { computeAggregation } from './aggregator';
import { IA_SHEET_NAME, NULL_SUBSTITUTES } from '../constants/iaSchema';
import { NormalizedWork } from '../../models/normalized';

const SAMPLE_FILE = path.resolve(__dirname, '../../../sample-data/SBF_Framework.xlsx');

describe('Aggregator — 실제 데이터 검증', () => {
  function loadAndNormalize() {
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    const columnMap = mapIAColumns(rawSheet.headers);
    const works = normalize(rawSheet, columnMap);
    return works;
  }

  it('집계 결과가 정상적으로 생성된다', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    expect(agg.totalWorkCount).toBeGreaterThan(0);
    expect(agg.byMilestone.size).toBeGreaterThan(0);
    expect(agg.byDivision.size).toBeGreaterThan(0);
    expect(agg.byAssigneeR.size).toBeGreaterThan(0);
  });

  it('totalWorkCount = NormalizedWork 배열 길이', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    expect(agg.totalWorkCount).toBe(works.length);
  });

  it('GATE-3.1: byMilestone 합계 = totalWorkCount', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    let sum = 0;
    for (const count of agg.byMilestone.values()) {
      sum += count;
    }
    expect(sum).toBe(agg.totalWorkCount);
  });

  it('GATE-3.2: byDivision 합계 = totalWorkCount', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    let sum = 0;
    for (const count of agg.byDivision.values()) {
      sum += count;
    }
    expect(sum).toBe(agg.totalWorkCount);
  });

  it('GATE-3.3: byAssigneeR 합계 = totalWorkCount', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    let sum = 0;
    for (const count of agg.byAssigneeR.values()) {
      sum += count;
    }
    expect(sum).toBe(agg.totalWorkCount);
  });

  it('GATE-3.4: milestoneXDivision 각 Milestone 합계 = byMilestone 값', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    for (const [ms, msCount] of agg.byMilestone) {
      const divisionMap = agg.milestoneXDivision.get(ms);
      expect(divisionMap).toBeDefined();

      let divSum = 0;
      for (const count of divisionMap!.values()) {
        divSum += count;
      }
      expect(divSum).toBe(msCount);
    }
  });

  it('GATE-3.5: milestoneXAssigneeR 각 Milestone 합계 = byMilestone 값', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    for (const [ms, msCount] of agg.byMilestone) {
      const assigneeMap = agg.milestoneXAssigneeR.get(ms);
      expect(assigneeMap).toBeDefined();

      let assigneeSum = 0;
      for (const count of assigneeMap!.values()) {
        assigneeSum += count;
      }
      expect(assigneeSum).toBe(msCount);
    }
  });

  it('Milestone 수가 Data Discovery 결과와 일치 (~22개)', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    // Data Discovery에서 22개 Milestone 확인
    expect(agg.byMilestone.size).toBeGreaterThanOrEqual(15);
    expect(agg.byMilestone.size).toBeLessThanOrEqual(25);
  });

  it('분과 수가 Data Discovery 결과와 일치 (~18개)', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    expect(agg.byDivision.size).toBeGreaterThanOrEqual(10);
    expect(agg.byDivision.size).toBeLessThanOrEqual(25);
  });

  it('GATE-3: 전체 집계 결과 요약 출력', () => {
    const works = loadAndNormalize();
    const agg = computeAggregation(works);

    console.log('=== GATE-3 Aggregation Results ===');
    console.log(`Total Work Count: ${agg.totalWorkCount}`);
    console.log(`Milestone Count: ${agg.byMilestone.size}`);
    console.log(`Division Count: ${agg.byDivision.size}`);
    console.log(`AssigneeR Count: ${agg.byAssigneeR.size}`);
    console.log(`AssigneeAXPlan Count: ${agg.byAssigneeAXPlan.size}`);
    console.log(`AssigneeAXDev Count: ${agg.byAssigneeAXDev.size}`);
    console.log('\nTop 5 Milestones by work count:');
    const sortedMs = [...agg.byMilestone.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [ms, count] of sortedMs) {
      console.log(`  ${ms}: ${count}`);
    }
    console.log('\nTop 5 Divisions by work count:');
    const sortedDiv = [...agg.byDivision.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [div, count] of sortedDiv) {
      console.log(`  ${div}: ${count}`);
    }
  });
});

describe('Property-Based Tests (Phase 3)', () => {
  // Arbitrary for NormalizedWork (simplified for PBT)
  const normalizedWorkArb = fc.record({
    workId: fc.string({ minLength: 1, maxLength: 10 }),
    subIds: fc.array(fc.nat({ max: 12 }), { maxLength: 5 }),
    division: fc.oneof(
      fc.constant('IT Admin'),
      fc.constant('SKB'),
      fc.constant('가입/변경/해지'),
      fc.constant(NULL_SUBSTITUTES.division)
    ),
    depth1: fc.option(fc.string({ maxLength: 10 })),
    depth2: fc.option(fc.string({ maxLength: 10 })),
    depth3: fc.option(fc.string({ maxLength: 10 })),
    depth4: fc.option(fc.string({ maxLength: 10 })),
    milestone: fc.oneof(
      fc.constant('#1-1'),
      fc.constant('#1-2'),
      fc.constant('#2-1'),
      fc.constant(NULL_SUBSTITUTES.milestone)
    ),
    workName: fc.string({ minLength: 1, maxLength: 20 }),
    startDate: fc.option(fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) })),
    finishDate: fc.option(fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) })),
    assigneeR: fc.oneof(
      fc.constant('김철수'),
      fc.constant('이영희'),
      fc.constant('박지민'),
      fc.constant(NULL_SUBSTITUTES.assigneeR)
    ),
    assigneeAXPlan: fc.oneof(fc.constant('기획자A'), fc.constant('-')),
    assigneeAXDev: fc.oneof(fc.constant('개발자B'), fc.constant('-')),
    projectName: fc.option(fc.string({ maxLength: 10 })),
    l3Name: fc.option(fc.string({ maxLength: 10 })),
    orgT: fc.option(fc.string({ maxLength: 10 })),
    sourceRows: fc.array(fc.integer({ min: 2, max: 2000 }), { minLength: 1, maxLength: 5 }),
    isGanttVisible: fc.boolean(),
    isPointMarker: fc.boolean(),
  }) as fc.Arbitrary<NormalizedWork>;

  /**
   * Property 4: Aggregation Sum Consistency
   * For any set of NormalizedWork[], the sum of all values in byMilestone
   * SHALL equal totalWorkCount, and the sum of all values in byDivision SHALL equal totalWorkCount.
   *
   * **Validates: Requirements 2.1, 2.2, 7.1**
   */
  it('Property 4: byMilestone 합계와 byDivision 합계 = totalWorkCount', () => {
    fc.assert(
      fc.property(fc.array(normalizedWorkArb, { minLength: 0, maxLength: 100 }), (works) => {
        const agg = computeAggregation(works);

        // byMilestone sum = total
        let milestoneSum = 0;
        for (const count of agg.byMilestone.values()) {
          milestoneSum += count;
        }
        expect(milestoneSum).toBe(agg.totalWorkCount);

        // byDivision sum = total
        let divisionSum = 0;
        for (const count of agg.byDivision.values()) {
          divisionSum += count;
        }
        expect(divisionSum).toBe(agg.totalWorkCount);

        // byAssigneeR sum = total
        let assigneeSum = 0;
        for (const count of agg.byAssigneeR.values()) {
          assigneeSum += count;
        }
        expect(assigneeSum).toBe(agg.totalWorkCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Cross-Aggregation Consistency
   * For any AggregationResult, for each milestone key M,
   * the sum of milestoneXDivision[M] values across all divisions SHALL equal byMilestone[M].
   *
   * **Validates: Requirements 2.2, 2.4**
   */
  it('Property 11: milestoneXDivision[M] 합계 = byMilestone[M]', () => {
    fc.assert(
      fc.property(fc.array(normalizedWorkArb, { minLength: 1, maxLength: 100 }), (works) => {
        const agg = computeAggregation(works);

        for (const [ms, msCount] of agg.byMilestone) {
          const divisionMap = agg.milestoneXDivision.get(ms);
          expect(divisionMap).toBeDefined();

          let divSum = 0;
          for (const count of divisionMap!.values()) {
            divSum += count;
          }
          expect(divSum).toBe(msCount);
        }

        // Also check milestoneXAssigneeR consistency
        for (const [ms, msCount] of agg.byMilestone) {
          const assigneeMap = agg.milestoneXAssigneeR.get(ms);
          expect(assigneeMap).toBeDefined();

          let assigneeSum = 0;
          for (const count of assigneeMap!.values()) {
            assigneeSum += count;
          }
          expect(assigneeSum).toBe(msCount);
        }
      }),
      { numRuns: 100 }
    );
  });
});
