import { useComparisonStore } from '../../store/comparisonStore';

export function MilestoneSummaryTable() {
  const result = useComparisonStore(state => state.comparisonResult);
  if (!result) return null;

  const { milestoneSummaries } = result;

  return (
    <div className="comparison-section">
      <h4>Milestone별 업무ID 증감</h4>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Before</th>
              <th>After</th>
              <th>증감</th>
              <th>추가 수</th>
              <th>삭제 수</th>
              <th>추가 업무ID</th>
              <th>삭제 업무ID</th>
            </tr>
          </thead>
          <tbody>
            {milestoneSummaries.map(s => (
              <tr key={s.milestone}>
                <td>{s.milestone}</td>
                <td className="comparison-table__num">{s.beforeCount}</td>
                <td className="comparison-table__num">{s.afterCount}</td>
                <td className={`comparison-table__num ${s.delta > 0 ? 'comparison-table__positive' : s.delta < 0 ? 'comparison-table__negative' : ''}`}>
                  {s.delta > 0 ? `+${s.delta}` : s.delta}
                </td>
                <td className="comparison-table__num comparison-table__positive">{s.addedWorkIds.length > 0 ? `+${s.addedWorkIds.length}` : '-'}</td>
                <td className="comparison-table__num comparison-table__negative">{s.deletedWorkIds.length > 0 ? `-${s.deletedWorkIds.length}` : '-'}</td>
                <td className="comparison-table__ids">{s.addedWorkIds.join(', ') || '-'}</td>
                <td className="comparison-table__ids">{s.deletedWorkIds.join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
