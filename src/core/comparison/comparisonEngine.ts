import { NormalizedWork } from '../../models/normalized';
import {
  DiffResult,
  WorkDiff,
  FieldChange,
  ComparisonField,
  COMPARISON_FIELDS,
} from '../../models/comparison';

/**
 * Date를 "YYYY-MM-DD" 형식 문자열로 변환. null이면 null 반환.
 */
function formatDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Date 필드 비교 (TD-CMP-3)
 * - 양쪽 모두 null → 동일 (true)
 * - 한쪽만 null → 변경 (false)
 * - 양쪽 모두 non-null → getTime() 비교
 */
function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

/**
 * NormalizedWork에서 비교 대상 필드의 문자열 값을 추출
 */
function getFieldValue(work: NormalizedWork, field: ComparisonField): string | Date | null {
  switch (field) {
    case 'division': return work.division;
    case 'milestone': return work.milestone;
    case 'workName': return work.workName;
    case 'startDate': return work.startDate;
    case 'finishDate': return work.finishDate;
    case 'assigneeR': return work.assigneeR;
    case 'assigneeAXPlan': return work.assigneeAXPlan;
    case 'assigneeAXDev': return work.assigneeAXDev;
  }
}

/**
 * 필드 값을 표시용 문자열로 변환
 */
function toDisplayValue(value: string | Date | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return formatDate(value);
  return value;
}

/**
 * 두 NormalizedWork의 비교 대상 필드를 비교하여 FieldChange[] 생성
 * 값이 동일한 필드는 포함하지 않음
 */
function compareFields(before: NormalizedWork, after: NormalizedWork): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of COMPARISON_FIELDS) {
    const bVal = getFieldValue(before, field);
    const aVal = getFieldValue(after, field);

    let isEqual: boolean;
    if (field === 'startDate' || field === 'finishDate') {
      isEqual = datesEqual(bVal as Date | null, aVal as Date | null);
    } else {
      isEqual = bVal === aVal;
    }

    if (!isEqual) {
      changes.push({
        fieldName: field,
        beforeValue: toDisplayValue(bVal),
        afterValue: toDisplayValue(aVal),
      });
    }
  }

  return changes;
}

/**
 * 두 NormalizedWork[] 배열을 업무ID 기준으로 비교하여 DiffResult를 생성
 *
 * 알고리즘 (TD-CMP-2):
 * 1. Before와 After 각각 Map<workId, NormalizedWork> 구축
 * 2. 두 Map의 key union 순회
 * 3. 각 workId 분류:
 *    - Before에만 → deleted
 *    - After에만 → added
 *    - 양쪽 존재 + 필드 차이 → changed
 *    - 양쪽 존재 + 필드 동일 → unchanged
 *
 * @param before - Before NormalizedWork[] (현재 dataStore 데이터)
 * @param after - After NormalizedWork[] (새로 파싱한 데이터)
 * @returns DiffResult
 */
export function compare(before: NormalizedWork[], after: NormalizedWork[]): DiffResult {
  // Build Maps
  const beforeMap = new Map<string, NormalizedWork>();
  for (const work of before) {
    beforeMap.set(work.workId, work);
  }

  const afterMap = new Map<string, NormalizedWork>();
  for (const work of after) {
    afterMap.set(work.workId, work);
  }

  // Classify
  const added: WorkDiff[] = [];
  const deleted: WorkDiff[] = [];
  const changed: WorkDiff[] = [];
  const unchanged: WorkDiff[] = [];

  // All keys from union
  const allKeys = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

  for (const workId of allKeys) {
    const bWork = beforeMap.get(workId);
    const aWork = afterMap.get(workId);

    if (!bWork && aWork) {
      // Added: After에만 존재
      added.push({ workId, changeType: 'added', fieldChanges: [], afterWork: aWork });
    } else if (bWork && !aWork) {
      // Deleted: Before에만 존재
      deleted.push({ workId, changeType: 'deleted', fieldChanges: [], beforeWork: bWork });
    } else if (bWork && aWork) {
      // Both exist: compare fields
      const fieldChanges = compareFields(bWork, aWork);
      if (fieldChanges.length > 0) {
        changed.push({ workId, changeType: 'changed', fieldChanges, beforeWork: bWork, afterWork: aWork });
      } else {
        unchanged.push({ workId, changeType: 'unchanged', fieldChanges: [] });
      }
    }
  }

  return {
    added,
    deleted,
    changed,
    unchanged,
    summary: {
      addedCount: added.length,
      deletedCount: deleted.length,
      changedCount: changed.length,
      unchangedCount: unchanged.length,
      beforeTotal: before.length,
      afterTotal: after.length,
    },
  };
}
