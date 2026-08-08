import { useMemo } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { useUIStore, DrilldownContext } from '../../store/uiStore';
import { getDrilldownData } from '../../core/analyzer/drilldownService';
import { formatDate, formatStartDate } from '../../utils/dateUtils';

export function DrilldownPanel() {
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);
  const drilldownContext = useUIStore(state => state.drilldownContext) as DrilldownContext | null;
  const setDrilldown = useUIStore(state => state.setDrilldown);

  const drilldownData = useMemo(() => {
    if (!drilldownContext) return [];
    return getDrilldownData(normalizedWorks, drilldownContext, filters);
  }, [normalizedWorks, drilldownContext, filters]);

  if (!drilldownContext) return null;

  const contextLabel = [
    drilldownContext.milestone && `Milestone: ${drilldownContext.milestone}`,
    drilldownContext.division && `분과: ${drilldownContext.division}`,
    drilldownContext.assigneeR && `담당자: ${drilldownContext.assigneeR}`,
  ].filter(Boolean).join(' / ');

  return (
    <div className="drilldown-panel">
      <div className="drilldown-panel__header">
        <h3>상세 업무 목록 ({drilldownData.length}건)</h3>
        <span className="drilldown-panel__context">{contextLabel}</span>
        <button onClick={() => setDrilldown(null)} className="drilldown-panel__close">✕ 닫기</button>
      </div>

      <div className="drilldown-panel__table-wrapper">
        <table className="drilldown-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Start</th>
              <th>Finish</th>
              <th>분과</th>
              <th>업무ID</th>
              <th>SUB ID</th>
              <th>업무명</th>
              <th>책임담당자R</th>
              <th>AX기획</th>
              <th>AX개발</th>
              <th>원본 Row</th>
            </tr>
          </thead>
          <tbody>
            {drilldownData.map(row => (
              <tr key={row.workId}>
                <td>{row.milestone}</td>
                <td>{row.milestoneStart ? formatStartDate(row.milestoneStart) : '-'}</td>
                <td>{formatDate(row.milestoneFinish) || '-'}</td>
                <td>{row.division}</td>
                <td className="drilldown-table__id">{row.workId}</td>
                <td>{row.subIds.join(', ')}</td>
                <td title={row.workName}>{row.workName}</td>
                <td>{row.assigneeR}</td>
                <td>{row.assigneeAXPlan}</td>
                <td>{row.assigneeAXDev}</td>
                <td className="drilldown-table__row">{row.sourceRows.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
