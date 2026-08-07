import { GanttTimeScale } from '../../models/viewModel';

interface Props {
  scale: GanttTimeScale;
}

export function TimeAxisHeader({ scale }: Props) {
  return (
    <div className="time-axis" style={{ width: scale.totalWidth, marginLeft: 320 }}>
      {scale.weekIntervals.map((week, i) => (
        <div
          key={i}
          className="time-axis__week"
          style={{ left: week.startPx, width: week.widthPx }}
        >
          <span className="time-axis__label">{week.label}</span>
        </div>
      ))}
    </div>
  );
}
