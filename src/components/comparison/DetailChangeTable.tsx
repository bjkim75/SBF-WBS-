import { useComparisonStore } from '../../store/comparisonStore';
import { COMPARISON_FIELD_LABELS } from '../../models/comparison';

export function DetailChangeTable() {
  const result = useComparisonStore(state => state.comparisonResult);
  if (!result) return null;

  const { diffResult } = result;
  const totalChanges = diffResult.added.length + diffResult.deleted.length + diffResult.changed.length;

  return (
    <div className="comparison-section">
      <h4>상세 변경 내역 ({totalChanges}건)</h4>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>업무ID</th>
              <th>변경 유형</th>
              <th>변경 필드</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {/* Added */}
            {diffResult.added.map(d => (
              <tr key={`added-${d.workId}`} className="comparison-table__row--added">
                <td>{d.workId}</td>
                <td><span className="comparison-badge comparison-badge--added">추가</span></td>
                <td>-</td>
                <td>-</td>
                <td>{d.afterWork?.division} / {d.afterWork?.milestone} / {d.afterWork?.assigneeR}</td>
              </tr>
            ))}
            {/* Deleted */}
            {diffResult.deleted.map(d => (
              <tr key={`deleted-${d.workId}`} className="comparison-table__row--deleted">
                <td>{d.workId}</td>
                <td><span className="comparison-badge comparison-badge--deleted">삭제</span></td>
                <td>-</td>
                <td>{d.beforeWork?.division} / {d.beforeWork?.milestone} / {d.beforeWork?.assigneeR}</td>
                <td>-</td>
              </tr>
            ))}
            {/* Changed — one row per field change */}
            {diffResult.changed.flatMap(d =>
              d.fieldChanges.map((fc, idx) => (
                <tr key={`changed-${d.workId}-${fc.fieldName}`} className="comparison-table__row--changed">
                  <td>{idx === 0 ? d.workId : ''}</td>
                  <td>{idx === 0 ? <span className="comparison-badge comparison-badge--changed">변경</span> : ''}</td>
                  <td>{COMPARISON_FIELD_LABELS[fc.fieldName]}</td>
                  <td>{fc.beforeValue ?? '(없음)'}</td>
                  <td>{fc.afterValue ?? '(없음)'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
