import { useRef, useEffect } from 'react';
import { useComparisonStore } from '../../store/comparisonStore';
import { useFileStore } from '../../store/fileStore';
import { ComparisonKPICards } from './ComparisonKPICards';
import { DivisionSummaryTable } from './DivisionSummaryTable';
import { MilestoneSummaryTable } from './MilestoneSummaryTable';
import { DetailChangeTable } from './DetailChangeTable';

export function ComparisonResultPanel() {
  const comparisonResult = useComparisonStore(state => state.comparisonResult);
  const afterFileName = useComparisonStore(state => state.afterFileName);
  const isComparing = useComparisonStore(state => state.isComparing);
  const error = useComparisonStore(state => state.error);
  const reset = useComparisonStore(state => state.reset);
  const beforeFile = useFileStore(state => state.file);
  const beforeFileName = beforeFile?.name ?? '(원본)';

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((comparisonResult || error) && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [comparisonResult, error]);

  // Loading state
  if (isComparing) {
    return (
      <section className="app__comparison" ref={panelRef}>
        <div className="comparison-panel">
          <p className="comparison-panel__msg">비교 분석 중...</p>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="app__comparison" ref={panelRef}>
        <div className="comparison-panel">
          <div className="comparison-panel__header">
            <h3>파일 비교 결과</h3>
            <button className="gantt-toggle-btn" onClick={reset}>닫기</button>
          </div>
          <p className="comparison-panel__error">{error}</p>
        </div>
      </section>
    );
  }

  // No result yet
  if (!comparisonResult) return null;

  return (
    <section className="app__comparison" ref={panelRef}>
      <div className="comparison-panel">
        <div className="comparison-panel__header">
          <h3>파일 비교 결과</h3>
          <span className="comparison-panel__files">원본: {beforeFileName} | 비교본: {afterFileName}</span>
          <button className="gantt-toggle-btn" onClick={reset}>닫기</button>
        </div>
        <ComparisonKPICards />
        <DivisionSummaryTable />
        <MilestoneSummaryTable />
        <DetailChangeTable />
      </div>
    </section>
  );
}
