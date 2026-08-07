import { NormalizedWork, MilestoneGroup } from '../../models/normalized';
import { GanttTimeScale, WeekInterval } from '../../models/viewModel';

/**
 * 주의 시작일을 구함 (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 날짜를 M/D 형식으로 포맷
 */
function formatWeekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 두 날짜 사이의 일수 차이
 */
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Date가 유효한지 검증 (null/undefined/NaN 체크)
 */
function isValidDate(d: Date | null | undefined): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * MilestoneGroup[]에서 GanttTimeScale을 계산
 *
 * @param groups - Milestone 그룹 목록
 * @param viewWidth - 타임라인 영역 너비 (px)
 * @param minPxPerWeek - 주당 최소 픽셀 (기본 40px)
 * @returns GanttTimeScale (시간축 정보) 또는 유효 날짜 없으면 null
 */
export function calculateTimeScale(groups: MilestoneGroup[], viewWidth: number, minPxPerWeek: number = 40): GanttTimeScale | null {
  // 모든 유효 날짜를 수집 (invalid Date 방어)
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const group of groups) {
    for (const work of group.works) {
      if (isValidDate(work.startDate)) {
        if (!minDate || work.startDate < minDate) minDate = work.startDate;
        if (!maxDate || work.startDate > maxDate) maxDate = work.startDate;
      }
      if (isValidDate(work.finishDate)) {
        if (!minDate || work.finishDate < minDate) minDate = work.finishDate;
        if (!maxDate || work.finishDate > maxDate) maxDate = work.finishDate;
      }
    }
  }

  if (!minDate || !maxDate) return null;

  // 시작/종료에 1주일 여유 추가
  const paddedStart = new Date(minDate);
  paddedStart.setDate(paddedStart.getDate() - 7);
  const paddedEnd = new Date(maxDate);
  paddedEnd.setDate(paddedEnd.getDate() + 7);

  // 주 단위 시작점으로 정렬
  const timelineStart = getWeekStart(paddedStart);
  const timelineEnd = new Date(paddedEnd);

  const totalDays = daysBetween(timelineStart, timelineEnd);
  const totalWeeks = Math.ceil(totalDays / 7);
  const minRequiredWidth = totalWeeks * minPxPerWeek;
  const effectiveWidth = Math.max(viewWidth, minRequiredWidth);
  const pxPerDay = totalDays > 0 ? effectiveWidth / totalDays : 1;

  // 주 단위 구간 생성
  const weekIntervals: WeekInterval[] = [];
  let current = new Date(timelineStart);
  while (current < timelineEnd) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const startPx = daysBetween(timelineStart, current) * pxPerDay;
    const widthPx = 7 * pxPerDay;

    weekIntervals.push({
      start: new Date(current),
      end: weekEnd > timelineEnd ? new Date(timelineEnd) : weekEnd,
      label: formatWeekLabel(current),
      startPx,
      widthPx,
    });

    current = weekEnd;
  }

  return {
    startDate: timelineStart,
    endDate: timelineEnd,
    weekIntervals,
    totalWidth: effectiveWidth,
    pxPerDay,
  };
}

/**
 * NormalizedWork의 bar 위치를 계산
 */
export function computeBarPosition(work: NormalizedWork, scale: GanttTimeScale): { barStartPx: number; barWidthPx: number } {
  // Defensive: both dates null/invalid → no bar
  if (!isValidDate(work.startDate) && !isValidDate(work.finishDate)) {
    return { barStartPx: 0, barWidthPx: 0 };
  }

  // Reference date for bar start position (use first valid date)
  const refDate = isValidDate(work.startDate) ? work.startDate : work.finishDate!;

  // Defensive: refDate must be valid
  if (!isValidDate(refDate)) {
    return { barStartPx: 0, barWidthPx: 0 };
  }

  const barStartPx = daysBetween(scale.startDate, refDate) * scale.pxPerDay;

  if (work.isPointMarker || !isValidDate(work.finishDate)) {
    return { barStartPx, barWidthPx: 0 };
  }

  // Width calculation requires valid startDate
  if (!isValidDate(work.startDate)) {
    return { barStartPx, barWidthPx: 0 };
  }

  const barWidthPx = daysBetween(work.startDate, work.finishDate) * scale.pxPerDay;
  return { barStartPx, barWidthPx: Math.max(barWidthPx, 4) }; // minimum 4px width
}
