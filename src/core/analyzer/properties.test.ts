import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeAggregation } from './aggregator';
import { getDrilldownData } from './drilldownService';
import { calculateTimeScale } from './timelineCalculator';
import { groupByMilestone } from '../normalizer/milestoneGrouper';
import { NormalizedWork } from '../../models/normalized';
import { INITIAL_FILTER_STATE } from '../../models/filter';

// Shared arbitrary for NormalizedWork
const normalizedWorkArb = fc.record({
  workId: fc.string({ minLength: 1, maxLength: 10 }),
  subIds: fc.array(fc.nat({ max: 12 }), { maxLength: 3 }),
  division: fc.oneof(fc.constant('A'), fc.constant('B'), fc.constant('C')),
  depth1: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  depth2: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  depth3: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  depth4: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  milestone: fc.oneof(fc.constant('#1'), fc.constant('#2'), fc.constant('#3')),
  workName: fc.string({ minLength: 1, maxLength: 10 }),
  startDate: fc.oneof(
    fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) }).map(d => d as Date | null),
    fc.constant(null as Date | null)
  ),
  finishDate: fc.oneof(
    fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 11, 31) }).map(d => d as Date | null),
    fc.constant(null as Date | null)
  ),
  assigneeR: fc.oneof(fc.constant('X'), fc.constant('Y'), fc.constant('Z')),
  assigneeAXPlan: fc.oneof(fc.constant('P1'), fc.constant('-')),
  assigneeAXDev: fc.oneof(fc.constant('D1'), fc.constant('-')),
  projectName: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  l3Name: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  orgT: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
  sourceRows: fc.array(fc.integer({ min: 2, max: 100 }), { minLength: 1, maxLength: 3 }),
  isGanttVisible: fc.boolean(),
  isPointMarker: fc.boolean(),
}) as fc.Arbitrary<NormalizedWork>;

describe('Property 9: Drilldown Count Consistency', () => {
  /**
   * For any DrilldownContext derived from clicking an aggregation cell with value V,
   * the DrilldownService SHALL return exactly V distinct workId items.
   *
   * **Validates: Requirements 6.8**
   */
  it('Drill-down 결과 건수가 집계 값과 일치한다 (milestone 기준)', () => {
    fc.assert(
      fc.property(
        fc.array(normalizedWorkArb, { minLength: 1, maxLength: 50 }),
        (works) => {
          const agg = computeAggregation(works);

          // For each milestone, drill-down count should match byMilestone count
          for (const [ms, expectedCount] of agg.byMilestone) {
            const drilldownResult = getDrilldownData(
              works,
              { source: 'milestone', milestone: ms },
              INITIAL_FILTER_STATE
            );
            expect(drilldownResult.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Drill-down 결과 건수가 집계 값과 일치한다 (division 기준)', () => {
    fc.assert(
      fc.property(
        fc.array(normalizedWorkArb, { minLength: 1, maxLength: 50 }),
        (works) => {
          const agg = computeAggregation(works);

          for (const [div, expectedCount] of agg.byDivision) {
            const drilldownResult = getDrilldownData(
              works,
              { source: 'division', division: div },
              INITIAL_FILTER_STATE
            );
            expect(drilldownResult.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 12: Timeline Week Grid Coverage', () => {
  /**
   * For any GanttTimeScale produced by TimelineCalculator,
   * the weekIntervals SHALL cover the entire range from startDate to endDate
   * with no gaps and no overlaps.
   *
   * **Validates: TD-2, Requirements 1.1**
   */
  it('주 단위 그리드가 전체 기간을 빈틈 없이 커버한다', () => {
    // Generate works with dates to ensure calculateTimeScale produces a result
    const workWithDatesArb = fc.record({
      workId: fc.string({ minLength: 1, maxLength: 10 }),
      subIds: fc.array(fc.nat({ max: 5 }), { maxLength: 2 }),
      division: fc.constant('A'),
      depth1: fc.constant(null as string | null),
      depth2: fc.constant(null as string | null),
      depth3: fc.constant(null as string | null),
      depth4: fc.constant(null as string | null),
      milestone: fc.constant('#1'),
      workName: fc.constant('test'),
      startDate: fc.date({ min: new Date(2025, 0, 1), max: new Date(2027, 0, 1) }).map(d => d as Date | null),
      finishDate: fc.date({ min: new Date(2025, 6, 1), max: new Date(2027, 6, 1) }).map(d => d as Date | null),
      assigneeR: fc.constant('X'),
      assigneeAXPlan: fc.constant('-'),
      assigneeAXDev: fc.constant('-'),
      projectName: fc.constant(null as string | null),
      l3Name: fc.constant(null as string | null),
      orgT: fc.constant(null as string | null),
      sourceRows: fc.constant([2]),
      isGanttVisible: fc.constant(true),
      isPointMarker: fc.constant(false),
    }) as fc.Arbitrary<NormalizedWork>;

    fc.assert(
      fc.property(
        fc.array(workWithDatesArb, { minLength: 2, maxLength: 20 }),
        (works) => {
          const groups = groupByMilestone(works);
          const scale = calculateTimeScale(groups, 1000);

          if (!scale) return; // No valid dates = skip

          const { weekIntervals } = scale;
          expect(weekIntervals.length).toBeGreaterThan(0);

          // Verify: first interval starts at or before scale.startDate
          expect(weekIntervals[0].start.getTime()).toBeLessThanOrEqual(scale.startDate.getTime() + 1);

          // Verify: intervals are contiguous (no gaps)
          for (let i = 1; i < weekIntervals.length; i++) {
            const prevEnd = weekIntervals[i - 1].end.getTime();
            const currStart = weekIntervals[i].start.getTime();
            // Allow 1ms tolerance for Date precision
            expect(Math.abs(currStart - prevEnd)).toBeLessThanOrEqual(1);
          }

          // Verify: each interval is <= 7 days (604800000 ms)
          for (const interval of weekIntervals) {
            const durationMs = interval.end.getTime() - interval.start.getTime();
            // Allow last interval to be shorter
            expect(durationMs).toBeGreaterThan(0);
            expect(durationMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
