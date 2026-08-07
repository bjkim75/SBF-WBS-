import { GanttRow, GanttTimeScale } from '../../models/viewModel';

interface Props {
  row: GanttRow;
  scale: GanttTimeScale;
}

export function TaskRow({ row, scale }: Props) {
  return (
    <div className="task-row">
      <div className="task-row__info">
        <span className="task-row__id" title={row.workId}>{row.workId}</span>
        <span className="task-row__name" title={row.workName}>{row.workName}</span>
        <span className="task-row__assignee" title={row.assigneeR}>{row.assigneeR}</span>
      </div>
      <div className="task-row__timeline" style={{ width: scale.totalWidth }}>
        {row.isPointMarker ? (
          <div
            className="task-row__point"
            style={{ left: row.barStartPx }}
            title={`${row.workId}: ${row.workName}`}
          />
        ) : row.barWidthPx > 0 ? (
          <div
            className="task-row__bar"
            style={{ left: row.barStartPx, width: row.barWidthPx }}
            title={`${row.workId}: ${row.workName}`}
          />
        ) : null}
      </div>
    </div>
  );
}
