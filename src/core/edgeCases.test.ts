import { describe, it, expect } from 'vitest';
import { normalize } from './normalizer/iaNormalizer';
import { groupByMilestone } from './normalizer/milestoneGrouper';
import { computeAggregation } from './analyzer/aggregator';
import { applyFilters } from './analyzer/filterEngine';
import { calculateTimeScale } from './analyzer/timelineCalculator';
import { RawSheet, IAColumnMap } from '../models/raw';
import { INITIAL_FILTER_STATE } from '../models/filter';

const TEST_HEADERS = [
  '업무ID', 'SUB ID', '도메인', '담당 분과', '구분',
  '1Depth', '2Depth', '3Depth', '4Depth',
  'milestone', '업무 Flow 초안', 'figma 디자인',
  'L3명', '과제명', '책임 담당자(T)', '상세화담당자(AX기획)', '상세화담당자(AX개발)', '담당구분(T)',
];

function makeColumnMap(): IAColumnMap {
  return {
    workId: 0, subId: 1, domain: 2, division: 3, category: 4,
    depth1: 5, depth2: 6, depth3: 7, depth4: 8,
    milestone: 9, startDate: 10, finishDate: 11,
    l3Name: 12, projectName: 13, assigneeR: 14,
    assigneeAXPlan: 15, assigneeAXDev: 16, orgT: 17,
    phaseColumns: [],
  };
}

function makeRawSheet(rows: (string | number | null)[][]): RawSheet {
  return {
    sheetName: '1. IA',
    headers: TEST_HEADERS,
    rows: rows.map((cells, i) => ({ rowIndex: i + 2, cells })),
  };
}

describe('Edge Cases', () => {
  it('모든 업무에 날짜가 없으면 Gantt은 빈 화면이지만 집계는 정상', () => {
    const rawSheet = makeRawSheet([
      ['W001', 1, null, 'A분과', '업무Flow', null, null, '업무1', null, '#1', null, null, null, null, '김담당', null, null, null],
      ['W002', 1, null, 'B분과', '업무Flow', null, null, '업무2', null, '#1', null, null, null, null, '이담당', null, null, null],
    ]);
    const works = normalize(rawSheet, makeColumnMap());
    expect(works.length).toBe(2);

    // All works have no dates → isGanttVisible = false
    for (const w of works) {
      expect(w.isGanttVisible).toBe(false);
    }

    // Aggregation still works
    const agg = computeAggregation(works);
    expect(agg.totalWorkCount).toBe(2);

    // Timeline returns null (no dates)
    const groups = groupByMilestone(works);
    const scale = calculateTimeScale(groups, 1000);
    expect(scale).toBeNull();
  });

  it('단일 Milestone만 존재해도 정상 동작', () => {
    const rawSheet = makeRawSheet([
      ['W001', 1, null, 'A분과', '업무Flow', null, null, '업무1', null, '#1', 46052, 46200, null, null, '김담당', null, null, null],
    ]);
    const works = normalize(rawSheet, makeColumnMap());
    const groups = groupByMilestone(works);
    expect(groups.length).toBe(1);
    expect(groups[0].milestone).toBe('#1');
  });

  it('헤더만 있고 데이터 0행이면 KPI=0', () => {
    const rawSheet = makeRawSheet([]);
    const works = normalize(rawSheet, makeColumnMap());
    expect(works.length).toBe(0);
    const agg = computeAggregation(works);
    expect(agg.totalWorkCount).toBe(0);
  });

  it('동일 업무ID에 100개 SUB ID가 있어도 1개 NormalizedWork로 축약', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      ['W001', i + 1, null, 'A분과', '업무Flow', null, null, '업무1', null, '#1', 46052, 46200, null, null, '김담당', null, null, null]
    );
    const rawSheet = makeRawSheet(rows as (string | number | null)[][]);
    const works = normalize(rawSheet, makeColumnMap());
    expect(works.length).toBe(1);
    expect(works[0].subIds.length).toBe(100);
    expect(works[0].sourceRows.length).toBe(100);
  });

  it('분과가 전부 null이면 "미지정 분과"로 그룹핑', () => {
    const rawSheet = makeRawSheet([
      ['W001', 1, null, null, '업무Flow', null, null, '업무1', null, '#1', 46052, 46200, null, null, '김담당', null, null, null],
      ['W002', 1, null, '', '업무Flow', null, null, '업무2', null, '#1', 46052, 46200, null, null, '이담당', null, null, null],
    ]);
    const works = normalize(rawSheet, makeColumnMap());
    for (const w of works) {
      expect(w.division).toBe('미지정 분과');
    }
  });

  it('IA초안 행만 있으면 결과 0건', () => {
    const rawSheet = makeRawSheet([
      ['W001', 1, null, 'A분과', 'IA초안', null, null, '업무1', null, '#1', 46052, 46200, null, null, '김담당', null, null, null],
      ['W002', 1, null, 'B분과', 'IA초안', null, null, '업무2', null, '#2', 46100, 46300, null, null, '이담당', null, null, null],
    ]);
    const works = normalize(rawSheet, makeColumnMap());
    expect(works.length).toBe(0);
  });

  it('필터로 모든 항목이 제외되면 빈 결과 반환', () => {
    const rawSheet = makeRawSheet([
      ['W001', 1, null, 'A분과', '업무Flow', null, null, '업무1', null, '#1', 46052, 46200, null, null, '김담당', null, null, null],
    ]);
    const works = normalize(rawSheet, makeColumnMap());
    const filtered = applyFilters(works, { ...INITIAL_FILTER_STATE, milestones: ['존재하지않는MS'] });
    expect(filtered.length).toBe(0);
  });
});
