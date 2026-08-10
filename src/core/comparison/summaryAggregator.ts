import { NormalizedWork } from '../../models/normalized';
import { DiffResult, DivisionSummary, MilestoneSummary } from '../../models/comparison';

/**
 * DiffResult와 Before/After 데이터에서 분과별 증감 요약을 계산
 *
 * 알고리즘:
 * 1. Before 데이터에서 division별 workId Set 구축
 * 2. After 데이터에서 division별 workId Set 구축
 * 3. Union(Before divisions, After divisions)으로 전체 분과 목록
 * 4. 각 division에 대해 beforeCount, afterCount, delta, addedWorkIds, deletedWorkIds 계산
 * 5. 가나다순 정렬 (localeCompare 'ko')
 *
 * @param diffResult - 비교 결과
 * @param before - Before NormalizedWork[]
 * @param after - After NormalizedWork[]
 * @returns DivisionSummary[] (가나다순 정렬)
 */
export function computeDivisionSummary(
  diffResult: DiffResult,
  before: NormalizedWork[],
  after: NormalizedWork[]
): DivisionSummary[] {
  // Build division → workId sets
  const beforeByDiv = new Map<string, Set<string>>();
  for (const work of before) {
    const set = beforeByDiv.get(work.division) || new Set();
    set.add(work.workId);
    beforeByDiv.set(work.division, set);
  }

  const afterByDiv = new Map<string, Set<string>>();
  for (const work of after) {
    const set = afterByDiv.get(work.division) || new Set();
    set.add(work.workId);
    afterByDiv.set(work.division, set);
  }

  // Build added/deleted workId sets for quick lookup
  const addedSet = new Set(diffResult.added.map(d => d.workId));
  const deletedSet = new Set(diffResult.deleted.map(d => d.workId));

  // Union of all divisions
  const allDivisions = new Set([...beforeByDiv.keys(), ...afterByDiv.keys()]);

  const summaries: DivisionSummary[] = [];

  for (const division of allDivisions) {
    const beforeWorkIds = beforeByDiv.get(division) || new Set();
    const afterWorkIds = afterByDiv.get(division) || new Set();

    const beforeCount = beforeWorkIds.size;
    const afterCount = afterWorkIds.size;
    const delta = afterCount - beforeCount;

    // Added workIds in this division: workIds in afterWorkIds that are in the global added set
    const addedWorkIds: string[] = [];
    for (const wid of afterWorkIds) {
      if (addedSet.has(wid)) addedWorkIds.push(wid);
    }

    // Deleted workIds in this division: workIds in beforeWorkIds that are in the global deleted set
    const deletedWorkIds: string[] = [];
    for (const wid of beforeWorkIds) {
      if (deletedSet.has(wid)) deletedWorkIds.push(wid);
    }

    summaries.push({
      division,
      beforeCount,
      afterCount,
      delta,
      addedWorkIds: addedWorkIds.sort(),
      deletedWorkIds: deletedWorkIds.sort(),
    });
  }

  // 가나다순 정렬
  summaries.sort((a, b) => a.division.localeCompare(b.division, 'ko'));

  return summaries;
}

/**
 * DiffResult와 Before/After 데이터에서 Milestone별 증감 요약을 계산
 *
 * @param diffResult - 비교 결과
 * @param before - Before NormalizedWork[]
 * @param after - After NormalizedWork[]
 * @returns MilestoneSummary[] (Milestone명 기준 정렬)
 */
export function computeMilestoneSummary(
  diffResult: DiffResult,
  before: NormalizedWork[],
  after: NormalizedWork[]
): MilestoneSummary[] {
  // Build milestone → workId sets
  const beforeByMs = new Map<string, Set<string>>();
  for (const work of before) {
    const set = beforeByMs.get(work.milestone) || new Set();
    set.add(work.workId);
    beforeByMs.set(work.milestone, set);
  }

  const afterByMs = new Map<string, Set<string>>();
  for (const work of after) {
    const set = afterByMs.get(work.milestone) || new Set();
    set.add(work.workId);
    afterByMs.set(work.milestone, set);
  }

  // Build added/deleted workId sets
  const addedSet = new Set(diffResult.added.map(d => d.workId));
  const deletedSet = new Set(diffResult.deleted.map(d => d.workId));

  // Union of all milestones
  const allMilestones = new Set([...beforeByMs.keys(), ...afterByMs.keys()]);

  const summaries: MilestoneSummary[] = [];

  for (const milestone of allMilestones) {
    const beforeWorkIds = beforeByMs.get(milestone) || new Set();
    const afterWorkIds = afterByMs.get(milestone) || new Set();

    const beforeCount = beforeWorkIds.size;
    const afterCount = afterWorkIds.size;
    const delta = afterCount - beforeCount;

    const addedWorkIds: string[] = [];
    for (const wid of afterWorkIds) {
      if (addedSet.has(wid)) addedWorkIds.push(wid);
    }

    const deletedWorkIds: string[] = [];
    for (const wid of beforeWorkIds) {
      if (deletedSet.has(wid)) deletedWorkIds.push(wid);
    }

    summaries.push({
      milestone,
      beforeCount,
      afterCount,
      delta,
      addedWorkIds: addedWorkIds.sort(),
      deletedWorkIds: deletedWorkIds.sort(),
    });
  }

  // Milestone명 기준 정렬
  summaries.sort((a, b) => a.milestone.localeCompare(b.milestone, 'ko'));

  return summaries;
}
