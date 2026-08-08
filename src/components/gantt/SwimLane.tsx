import { GanttSwimLane, GanttTimeScale } from '../../models/viewModel';
import { DivisionGroup } from './DivisionGroup';
import { formatDate, formatStartDate } from '../../utils/dateUtils';
import { DrilldownContext } from '../../store/uiStore';

interface Props {
  lane: GanttSwimLane;
  scale: GanttTimeScale;
  isGrouped: boolean;
  onToggle: () => void;
  onDrilldown?: (context: DrilldownContext) => void;
  /** workId 클릭 시 호출 (WBS Ticket 조회 트리거) */
  onWorkIdClick?: (workId: string) => void;
}

export function SwimLane({ lane, scale, isGrouped, onToggle, onDrilldown, onWorkIdClick }: Props) {
  const dateRange = [
    lane.startDate ? formatStartDate(lane.startDate) : '미정',
    lane.finishDate ? formatDate(lane.finishDate) : '미정',
  ].join(' ~ ');

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDrilldown?.({ source: 'milestone', milestone: lane.milestone });
  };

  return (
    <div className={`swimlane ${lane.isExpanded ? 'swimlane--expanded' : ''}`}>
      <div className="swimlane__header" onClick={onToggle} onDoubleClick={handleDoubleClick}>
        <span className="swimlane__toggle">{lane.isExpanded ? '▼' : '▶'}</span>
        <span className="swimlane__milestone">{lane.milestone}</span>
        <span className="swimlane__date">{dateRange}</span>
        <span className="swimlane__count">{lane.workCount}건</span>
      </div>
      {lane.isExpanded && (
        <div className="swimlane__body">
          {lane.divisionGroups.map(group => (
            <DivisionGroup
              key={group.division}
              group={group}
              scale={scale}
              isGrouped={isGrouped}
              onWorkIdClick={onWorkIdClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
