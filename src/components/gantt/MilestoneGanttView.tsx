import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { useUIStore } from '../../store/uiStore';
import { useWbsStore } from '../../store/wbsStore';
import { applyFilters } from '../../core/analyzer/filterEngine';
import { groupByMilestone } from '../../core/normalizer/milestoneGrouper';
import { calculateTimeScale, computeBarPosition } from '../../core/analyzer/timelineCalculator';
import { formatDate } from '../../utils/dateUtils';
import { GanttSwimLane, GanttDivisionGroup, GanttRow, GanttTimeScale } from '../../models/viewModel';
import { NormalizedWork } from '../../models/normalized';
import { TimeAxisHeader } from './TimeAxisHeader';
import { SwimLane } from './SwimLane';

const MIN_PX_PER_WEEK = 40;
const GANTT_MAX_HEIGHT = 600; // max visible height for lanes area

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
  const setSelectedWorkId = useWbsStore(state => state.setSelectedWorkId);

  const { scale, swimLanes } = useMemo(() => {
    const filtered = applyFilters(normalizedWorks, filters);
    const ganttWorks = filtered.filter(w => w.isGanttVisible);
    const groups = groupByMilestone(ganttWorks);
    const scale = calculateTimeScale(groups, 1000, MIN_PX_PER_WEEK);
    if (!scale) return { scale: null, swimLanes: [] };

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

    swimLanes.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    return { scale, swimLanes };
  }, [normalizedWorks, filters, expandedSwimlanes]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);

  // Scroll state — we compute from known dimensions rather than measuring scrollWidth
  const [hScroll, setHScroll] = useState({ left: 0 });
  const [vScroll, setVScroll] = useState({ top: 0, contentHeight: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);

  // Known content width (no measurement needed!)
  const contentWidth = scale ? 320 + scale.totalWidth : 0;

  // Update dimensions
  const updateDimensions = useCallback(() => {
    if (bodyRef.current) {
      // body width minus vertical scrollbar width (14px) = available viewport for content
      setViewportWidth(bodyRef.current.clientWidth - 14);
    }
    if (lanesRef.current) {
      setVScroll(prev => ({ ...prev, contentHeight: lanesRef.current!.scrollHeight }));
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    if (containerRef.current) {
      containerRef.current.style.setProperty('--gantt-scroll-left', '0px');
    }
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(body);
    if (lanesRef.current) observer.observe(lanesRef.current);
    return () => observer.disconnect();
  }, [updateDimensions, scale]);

  // Re-measure after expand/collapse
  useEffect(() => {
    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        updateDimensions();
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [swimLanes, updateDimensions]);

  // Horizontal scroll logic
  const hasHScroll = contentWidth > viewportWidth && viewportWidth > 0;
  const hThumbRatio = viewportWidth / contentWidth;
  const hThumbWidth = hasHScroll ? Math.max(5, hThumbRatio * 100) : 0;
  const hMaxScroll = contentWidth - viewportWidth;
  const hThumbLeft = hasHScroll && hMaxScroll > 0 ? (hScroll.left / hMaxScroll) * (100 - hThumbWidth) : 0;

  // Vertical scroll logic
  const visibleHeight = GANTT_MAX_HEIGHT;
  const hasVScroll = vScroll.contentHeight > visibleHeight;
  const vThumbRatio = visibleHeight / vScroll.contentHeight;
  const vThumbHeight = hasVScroll ? Math.max(5, vThumbRatio * 100) : 0;
  const vMaxScroll = vScroll.contentHeight - visibleHeight;
  const vThumbTop = hasVScroll && vMaxScroll > 0 ? (vScroll.top / vMaxScroll) * (100 - vThumbHeight) : 0;

  // Apply scroll positions to DOM
  const applyScroll = useCallback((newLeft?: number, newTop?: number) => {
    if (containerRef.current && newLeft !== undefined) {
      containerRef.current.scrollLeft = newLeft;
      containerRef.current.style.setProperty('--gantt-scroll-left', `${newLeft}px`);
      setHScroll({ left: newLeft });
    }
    if (lanesRef.current && newTop !== undefined) {
      lanesRef.current.scrollTop = newTop;
      setVScroll(prev => ({ ...prev, top: newTop! }));
    }
  }, []);

  // Wheel handler on container for both axes
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const newLeft = Math.max(0, Math.min(hMaxScroll, hScroll.left + e.deltaX));
    const newTop = Math.max(0, Math.min(vMaxScroll, vScroll.top + e.deltaY));
    applyScroll(newLeft, newTop);
  }, [hMaxScroll, vMaxScroll, hScroll.left, vScroll.top, applyScroll]);

  // Horizontal scrollbar interactions
  const hDragging = useRef(false);
  const hDragStartX = useRef(0);
  const hDragStartLeft = useRef(0);

  const handleHTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasHScroll) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = rect.width;
    const thumbPx = (hThumbWidth / 100) * trackWidth;
    const scrollableTrack = trackWidth - thumbPx;
    const targetCenter = clickX - thumbPx / 2;
    const ratio = Math.max(0, Math.min(1, targetCenter / scrollableTrack));
    applyScroll(ratio * hMaxScroll, undefined);
  }, [hasHScroll, hThumbWidth, hMaxScroll, applyScroll]);

  const handleHThumbDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hDragging.current = true;
    hDragStartX.current = e.clientX;
    hDragStartLeft.current = hScroll.left;

    const onMove = (me: MouseEvent) => {
      if (!hDragging.current) return;
      const trackEl = document.querySelector('.milestone-gantt__scrollbar-track-h') as HTMLElement;
      if (!trackEl) return;
      const trackWidth = trackEl.clientWidth;
      const thumbPx = (hThumbWidth / 100) * trackWidth;
      const scrollableTrack = trackWidth - thumbPx;
      const deltaX = me.clientX - hDragStartX.current;
      const scrollDelta = (deltaX / scrollableTrack) * hMaxScroll;
      const newLeft = Math.max(0, Math.min(hMaxScroll, hDragStartLeft.current + scrollDelta));
      applyScroll(newLeft, undefined);
    };
    const onUp = () => {
      hDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [hScroll.left, hThumbWidth, hMaxScroll, applyScroll]);

  // Vertical scrollbar interactions
  const vDragging = useRef(false);
  const vDragStartY = useRef(0);
  const vDragStartTop = useRef(0);

  const handleVTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasVScroll) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const thumbPx = (vThumbHeight / 100) * trackHeight;
    const scrollableTrack = trackHeight - thumbPx;
    const targetCenter = clickY - thumbPx / 2;
    const ratio = Math.max(0, Math.min(1, targetCenter / scrollableTrack));
    applyScroll(undefined, ratio * vMaxScroll);
  }, [hasVScroll, vThumbHeight, vMaxScroll, applyScroll]);

  const handleVThumbDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    vDragging.current = true;
    vDragStartY.current = e.clientY;
    vDragStartTop.current = vScroll.top;

    const onMove = (me: MouseEvent) => {
      if (!vDragging.current) return;
      const trackEl = document.querySelector('.milestone-gantt__scrollbar-track-v') as HTMLElement;
      if (!trackEl) return;
      const trackHeight = trackEl.clientHeight;
      const thumbPx = (vThumbHeight / 100) * trackHeight;
      const scrollableTrack = trackHeight - thumbPx;
      const deltaY = me.clientY - vDragStartY.current;
      const scrollDelta = (deltaY / scrollableTrack) * vMaxScroll;
      const newTop = Math.max(0, Math.min(vMaxScroll, vDragStartTop.current + scrollDelta));
      applyScroll(undefined, newTop);
    };
    const onUp = () => {
      vDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [vScroll.top, vThumbHeight, vMaxScroll, applyScroll]);

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

      {/* Horizontal scrollbar (top) */}
      <div className="milestone-gantt__scrollbar-track-h" onClick={handleHTrackClick}>
        {hasHScroll && (
          <div
            className="milestone-gantt__scrollbar-thumb-h"
            style={{ width: `${hThumbWidth}%`, left: `${hThumbLeft}%` }}
            onMouseDown={handleHThumbDown}
          />
        )}
      </div>

      {/* Main area: vertical scrollbar (left) + content */}
      <div className="milestone-gantt__body" ref={bodyRef}>
        {/* Vertical scrollbar (left side) */}
        <div className="milestone-gantt__scrollbar-track-v" onClick={handleVTrackClick}>
          {hasVScroll && (
            <div
              className="milestone-gantt__scrollbar-thumb-v"
              style={{ height: `${vThumbHeight}%`, top: `${vThumbTop}%` }}
              onMouseDown={handleVThumbDown}
            />
          )}
        </div>

        {/* Scrollable container */}
        <div
          className="milestone-gantt__container"
          ref={containerRef}
          onWheel={handleWheel}
        >
          <TimeAxisHeader scale={scale} />
          <div
            className="milestone-gantt__lanes"
            ref={lanesRef}
            style={{ minWidth: 320 + scale.totalWidth, maxHeight: GANTT_MAX_HEIGHT }}
          >
            {swimLanes.map(lane => (
              <SwimLane
                key={lane.milestone}
                lane={lane}
                scale={scale}
                isGrouped={divisionGroupMode === 'grouped'}
                onToggle={() => toggleSwimlane(lane.milestone)}
                onDrilldown={(ctx) => setDrilldown(ctx)}
                onWorkIdClick={setSelectedWorkId}
              />
            ))}
          </div>
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
