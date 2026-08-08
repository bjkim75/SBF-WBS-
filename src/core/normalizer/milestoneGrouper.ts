import { NormalizedWork, MilestoneGroup } from '../../models/normalized';

/**
 * 모든 업무의 startDate/finishDate가 동일한지 확인
 * true → Phase 색상 bar 표시 (#N-N 계열)
 * false → 개별 bar 유지 (유선# 계열)
 */
function checkUniformDates(works: NormalizedWork[]): boolean {
  if (works.length <= 1) return true;
  const firstStart = works[0].startDate?.getTime() ?? null;
  const firstFinish = works[0].finishDate?.getTime() ?? null;
  for (let i = 1; i < works.length; i++) {
    const s = works[i].startDate?.getTime() ?? null;
    const f = works[i].finishDate?.getTime() ?? null;
    if (s !== firstStart || f !== firstFinish) {
      return false;
    }
  }
  return true;
}

/**
 * NormalizedWork[] → MilestoneGroup[] 변환
 *
 * 처리:
 * 1. Milestone 기준 그룹핑
 * 2. 각 Milestone의 시간 범위 계산 (MIN startDate, MAX finishDate)
 * 3. 분과(division) 서브그룹 생성 (TD-3)
 *
 * @param works - IANormalizer가 생성한 NormalizedWork 배열
 * @returns MilestoneGroup[] (Milestone별 그룹)
 */
export function groupByMilestone(works: NormalizedWork[]): MilestoneGroup[] {
  // Step 1: Milestone별 그룹핑
  const milestoneMap = new Map<string, NormalizedWork[]>();

  for (const work of works) {
    const existing = milestoneMap.get(work.milestone);
    if (existing) {
      existing.push(work);
    } else {
      milestoneMap.set(work.milestone, [work]);
    }
  }

  // Step 2: 각 Milestone 그룹을 MilestoneGroup으로 변환
  const groups: MilestoneGroup[] = [];

  for (const [milestone, milestoneWorks] of milestoneMap) {
    // 시간 범위 계산
    let minStart: Date | null = null;
    let maxFinish: Date | null = null;

    for (const work of milestoneWorks) {
      if (work.startDate != null) {
        if (minStart == null || work.startDate < minStart) {
          minStart = work.startDate;
        }
      }
      if (work.finishDate != null) {
        if (maxFinish == null || work.finishDate > maxFinish) {
          maxFinish = work.finishDate;
        }
      }
    }

    // 분과별 서브그룹 생성 (TD-3)
    const divisionGroups = new Map<string, NormalizedWork[]>();
    for (const work of milestoneWorks) {
      const existing = divisionGroups.get(work.division);
      if (existing) {
        existing.push(work);
      } else {
        divisionGroups.set(work.division, [work]);
      }
    }

    groups.push({
      milestone,
      startDate: minStart,
      finishDate: maxFinish,
      works: milestoneWorks,
      workCount: milestoneWorks.length,
      divisionGroups,
      isUniformDates: checkUniformDates(milestoneWorks),
    });
  }

  return groups;
}
