import { useMemo } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { useUIStore } from '../../store/uiStore';
import { applyFilters } from '../../core/analyzer/filterEngine';
import { groupByMilestone } from '../../core/normalizer/milestoneGrouper';
import { calculateTimeScale, computeBarPosition } from '../../core/analyzer/timelineCalculator';
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

function buildGanttRow(work: NormalizedWork, scale: GanttTimeScale): GanttRow {
  const { barStartPx, barWidthPx } = computeBarPosition(work, scale);
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
  };
}
