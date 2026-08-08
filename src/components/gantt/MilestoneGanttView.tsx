import { useMemo } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { useUIStore } from '../../store/uiStore';
import { applyFilters } from '../../core/analyzer/filterEngine';
import { groupByMilestone } from '../../core/normalizer/milestoneGrouper';
import { calculateTimeScale, computeBarPosition } from '../../core/analyzer/timelineCalculator';
import { formatDate } from '../../utils/dateUtils';
import { GanttSwimLane, GanttDivisionGroup, GanttRow, GanttTimeScale } from '../../models/viewModel';
import { NormalizedWork } from '../../models/normalized';
import { TimeAxisHeader } from './TimeAxisHeader';
import { SwimLane } from './SwimLane';

const MIN_PX_PER_WEEK = 40;

export function MilestoneGanttView() {
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);
  const expandedSwimlanes = useUIStore(state => state.expandedSwimlanes);
  const toggleSwimlane = useUIStore(state => state.toggleSwimlane);
  const expandAllSwimlanes = useUIStore(state => state.expandAllSwimlanes);
  const collapseAllSwimlanes = useUIStore(state => state.collapseAllSwimlanes);
  const divisionGroupMode = useUIStore(state => state.divisionGroupMode);
  const toggleDivisionMode = useUIStore(state => state.toggleDivisionMode);
  const setDrilldown = useUIStore(state => state.setDrilldown);

  const { scale, swimLanes } = useMemo(() => {
    // Filter works
    const filtered = applyFilters(normalizedWorks, filters);
    // Only Gantt-visible works
    const ganttWorks = filtered.filter(w => w.isGanttVisible);
    // Group by milestone
    const groups = groupByMilestone(ganttWorks);

    // Calculate time scale with minimum px per week
    const scale = calculateTimeScale(groups, 1000, MIN_PX_PER_WEEK);
    if (!scale) return { scale: null, swimLanes: [] };

    // Build swim lanes
    const swimLanes: GanttSwimLane[] = groups.map(group => {
      const divisionGroups: GanttDivisionGroup[] = [...group.divisionGroups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([division, works]) => ({
          division,
          rows: works.map(work => buildGanttRow(work, scale)),
        }));

      return {
        milestone: group.milestone,
        startDate: group.startDate,
        finishDate: group.finishDate,
        workCount: group.workCount,
        isExpanded: expandedSwimlanes.has(group.milestone),
        divisionGroups,
        isUniformDates: group.isUniformDates,
        phases: group.works[0]?.phases || [],
      };
    });

    // Sort by startDate
    swimLanes.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    return { scale, swimLanes };
  }, [normalizedWorks, filters, expandedSwimlanes]);

  if (!scale) {
    return <div className="gantt-empty">날짜 정보가 있는 업무가 없습니다.</div>;
  }

  return (
    <div className="milestone-gantt">
      <div className="milestone-gantt__toolbar">
        <h3>Milestone Timeline</h3>
        <div className="milestone-gantt__toolbar-actions">
          <button onClick={toggleDivisionMode} className="gantt-toggle-btn">
            {divisionGroupMode === 'grouped' ? '분과 그룹 해제' : '분과별 그룹'}
          </button>
          <button onClick={() => expandAllSwimlanes(swimLanes.map(l => l.milestone))} className="gantt-toggle-btn">
            전체 펼치기
          </button>
          <button onClick={() => collapseAllSwimlanes()} className="gantt-toggle-btn">
            전체 닫기
          </button>
        </div>
      </div>
      <div className="milestone-gantt__container">
        <TimeAxisHeader scale={scale} />
        <div className="milestone-gantt__lanes">
          {swimLanes.map(lane => (
            <SwimLane
              key={lane.milestone}
              lane={lane}
              scale={scale}
              isGrouped={divisionGroupMode === 'grouped'}
              onToggle={() => toggleSwimlane(lane.milestone)}
              onDrilldown={(ctx) => setDrilldown(ctx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 두 날짜 간 일수 차이 (소수점 포함)
 */
function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}

function buildGanttRow(work: NormalizedWork, scale: GanttTimeScale): GanttRow {
  const { barStartPx, barWidthPx } = computeBarPosition(work, scale);

  // Build phase segments from work.phases
  const phaseSegments: { name: string; startPx: number; widthPx: number; colorIndex: number; dateStr: string }[] = [];
  const validPhases = work.phases.filter(p => p.date !== null);

  for (let i = 0; i < validPhases.length; i++) {
    const phase = validPhases[i];
    const phaseStartPx = daysBetween(scale.startDate, phase.date!) * scale.pxPerDay;

    // Width: from this phase date to next phase date (or 20px for last)
    const nextPhase = validPhases[i + 1];
    let segmentWidth: number;
    if (nextPhase?.date) {
      segmentWidth = daysBetween(phase.date!, nextPhase.date) * scale.pxPerDay;
    } else {
      segmentWidth = 20; // last phase fixed width
    }

    phaseSegments.push({
      name: phase.name,
      startPx: phaseStartPx,
      widthPx: Math.max(segmentWidth, 4),
      colorIndex: work.phases.indexOf(phase), // original index for consistent colors
      dateStr: formatDate(phase.date!) || '',
    });
  }

  return {
    workId: work.workId,
    workName: work.workName,
    assigneeR: work.assigneeR,
    division: work.division,
    startDate: work.startDate,
    finishDate: work.finishDate,
    isPointMarker: work.isPointMarker,
    barStartPx,
    barWidthPx,
    phaseSegments,
  };
}
