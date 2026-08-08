import { GanttDivisionGroup, GanttTimeScale } from '../../models/viewModel';
import { TaskRow } from './TaskRow';

interface Props {
  group: GanttDivisionGroup;
  scale: GanttTimeScale;
  isGrouped: boolean;
  /** workId 클릭 시 호출 (WBS Ticket 조회 트리거) */
  onWorkIdClick?: (workId: string) => void;
}

export function DivisionGroup({ group, scale, isGrouped, onWorkIdClick }: Props) {
  if (!isGrouped) {
    return (
      <>
        {group.rows.map(row => (
          <TaskRow key={row.workId} row={row} scale={scale} onWorkIdClick={onWorkIdClick} />
        ))}
      </>
    );
  }

  return (
    <div className="division-group">
      <div className="division-group__header">
        <span className="division-group__name">{group.division}</span>
        <span className="division-group__count">{group.rows.length}건</span>
      </div>
      <div className="division-group__body">
        {group.rows.map(row => (
          <TaskRow key={row.workId} row={row} scale={scale} onWorkIdClick={onWorkIdClick} />
        ))}
      </div>
    </div>
  );
}
