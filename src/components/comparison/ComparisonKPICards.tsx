import { useComparisonStore } from '../../store/comparisonStore';

export function ComparisonKPICards() {
  const result = useComparisonStore(state => state.comparisonResult);
  if (!result) return null;

  const { summary } = result.diffResult;

  return (
    <div className="comparison-kpi-row">
      <div className="comparison-kpi">
        <div className="comparison-kpi__label">Before 전체</div>
        <div className="comparison-kpi__value">{summary.beforeTotal}</div>
      </div>
      <div className="comparison-kpi">
        <div className="comparison-kpi__label">After 전체</div>
        <div className="comparison-kpi__value">{summary.afterTotal}</div>
      </div>
      <div className="comparison-kpi comparison-kpi--added">
        <div className="comparison-kpi__label">추가</div>
        <div className="comparison-kpi__value">+{summary.addedCount}</div>
      </div>
      <div className="comparison-kpi comparison-kpi--deleted">
        <div className="comparison-kpi__label">삭제</div>
        <div className="comparison-kpi__value">-{summary.deletedCount}</div>
      </div>
      <div className="comparison-kpi comparison-kpi--changed">
        <div className="comparison-kpi__label">변경</div>
        <div className="comparison-kpi__value">{summary.changedCount}</div>
      </div>
      <div className="comparison-kpi comparison-kpi--unchanged">
        <div className="comparison-kpi__label">동일</div>
        <div className="comparison-kpi__value">{summary.unchangedCount}</div>
      </div>
    </div>
  );
}
