import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { readSheetFromPath } from './parser/testHelper';
import { validateSchema } from './parser/schemaValidator';
import { mapIAColumns } from './parser/iaColumnMapper';
import { normalize } from './normalizer/iaNormalizer';
import { groupByMilestone } from './normalizer/milestoneGrouper';
import { computeAggregation } from './analyzer/aggregator';
import { applyFilters } from './analyzer/filterEngine';
import { getDrilldownData } from './analyzer/drilldownService';
import { calculateTimeScale } from './analyzer/timelineCalculator';
import { IA_SHEET_NAME, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS } from './constants/iaSchema';
import { INITIAL_FILTER_STATE } from '../models/filter';

const SAMPLE_FILE = path.resolve(__dirname, '../../sample-data/SBF_Framework.xlsx');

describe('Full Pipeline Integration Test', () => {
  it('Upload → Parse → Validate → Map → Normalize → Group → Aggregate → Filter → Drilldown → Timeline', () => {
    // Step 1: Read
    const rawSheet = readSheetFromPath(SAMPLE_FILE, IA_SHEET_NAME);
    expect(rawSheet.headers.length).toBeGreaterThan(40);
    expect(rawSheet.rows.length).toBeGreaterThan(1000);

    // Step 2: Validate
    const validation = validateSchema(rawSheet.headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);
    expect(validation.isValid).toBe(true);

    // Step 3: Map
    const columnMap = mapIAColumns(rawSheet.headers);
    expect(columnMap.workId).toBeGreaterThanOrEqual(0);
    expect(columnMap.milestone).toBeGreaterThanOrEqual(0);

    // Step 4: Normalize
    const works = normalize(rawSheet, columnMap);
    expect(works.length).toBeGreaterThan(500);
    expect(works.length).toBeLessThan(1000);

    // Step 5: Group
    const groups = groupByMilestone(works);
    expect(groups.length).toBeGreaterThan(15);
    const totalFromGroups = groups.reduce((s, g) => s + g.workCount, 0);
    expect(totalFromGroups).toBe(works.length);

    // Step 6: Aggregate
    const agg = computeAggregation(works);
    expect(agg.totalWorkCount).toBe(works.length);
    let msSum = 0;
    for (const v of agg.byMilestone.values()) msSum += v;
    expect(msSum).toBe(agg.totalWorkCount);

    // Step 7: Filter (selectedDivisions=null → 전체 포함)
    const firstMs = [...agg.byMilestone.keys()][0];
    const filtered = applyFilters(works, { ...INITIAL_FILTER_STATE, milestones: [firstMs] });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBe(agg.byMilestone.get(firstMs));
    for (const w of filtered) expect(w.milestone).toBe(firstMs);

    // Step 8: Drilldown
    const drilldownFilters = { ...INITIAL_FILTER_STATE };
    const drilldown = getDrilldownData(works, { source: 'milestone', milestone: firstMs }, drilldownFilters);
    expect(drilldown.length).toBe(agg.byMilestone.get(firstMs));
    for (const row of drilldown) {
      expect(row.sourceRows.length).toBeGreaterThan(0);
      expect(row.sourceRows[0]).toBeGreaterThanOrEqual(2);
    }

    // Step 9: Timeline
    const scale = calculateTimeScale(groups, 1000);
    expect(scale).not.toBeNull();
    expect(scale!.weekIntervals.length).toBeGreaterThan(0);
    expect(scale!.pxPerDay).toBeGreaterThan(0);

    // Summary
    console.log('=== Full Pipeline Integration Test Results ===');
    console.log(`Raw Rows: ${rawSheet.rows.length}`);
    console.log(`Normalized Works: ${works.length}`);
    console.log(`Milestone Groups: ${groups.length}`);
    console.log(`Total Work Count: ${agg.totalWorkCount}`);
    console.log(`Milestones: ${agg.byMilestone.size}`);
    console.log(`Divisions: ${agg.byDivision.size}`);
    console.log(`AssigneesR: ${agg.byAssigneeR.size}`);
    console.log(`First MS "${firstMs}" works: ${agg.byMilestone.get(firstMs)}`);
    console.log(`Timeline weeks: ${scale!.weekIntervals.length}`);
    console.log(`Drilldown rows for "${firstMs}": ${drilldown.length}`);
  });
});
