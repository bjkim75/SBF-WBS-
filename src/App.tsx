import { useState, useMemo } from 'react';
import { FileUpload } from './components/upload/FileUpload';
import { SchemaValidationAlert } from './components/validation/SchemaValidationAlert';
import { KPICard } from './components/kpi/KPICard';
import { FilterPanel } from './components/filter/FilterPanel';
import { AggregationPanel } from './components/aggregation/AggregationPanel';
import { MilestoneGanttView } from './components/gantt/MilestoneGanttView';
import { DrilldownPanel } from './components/drilldown/DrilldownPanel';
import { WbsTicketPanel } from './components/wbs/WbsTicketPanel';
import { DownloadButton } from './components/download/DownloadButton';
import { ComparisonFileUpload } from './components/comparison/ComparisonFileUpload';
import { ComparisonResultPanel } from './components/comparison/ComparisonResultPanel';
import { SchemaValidationResult } from './models/raw';
import { useDataStore } from './store/dataStore';
import { useFilterStore } from './store/filterStore';
import { applyFilters } from './core/analyzer/filterEngine';
import { computeAggregation } from './core/analyzer/aggregator';

function App() {
  const [validationError, setValidationError] = useState<SchemaValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);
  const hasData = normalizedWorks.length > 0;

  const aggregation = useMemo(() => {
    if (!hasData) return null;
    const filtered = applyFilters(normalizedWorks, filters);
    return computeAggregation(filtered);
  }, [normalizedWorks, filters, hasData]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>SBF Framework Analysis</h1>
        <p>Milestone 기반 업무 배분 분석 도구</p>
      </header>

      <main className="app__main">
        <section className="app__upload">
          <FileUpload
            onValidationError={(result) => {
              setValidationError(result);
              setError(null);
            }}
            onSuccess={() => {
              setValidationError(null);
              setError(null);
            }}
            onError={(msg) => {
              setError(msg);
              setValidationError(null);
            }}
          />
        </section>

        {validationError && <SchemaValidationAlert result={validationError} />}

        {error && (
          <section className="app__error" role="alert">
            <h2>오류</h2>
            <p>{error}</p>
          </section>
        )}

        {hasData && (
          <section className="app__download">
            <DownloadButton />
            <ComparisonFileUpload />
          </section>
        )}

        {hasData && aggregation && (
          <section className="app__dashboard">
            <div className="dashboard__kpi-row">
              <KPICard 
                title="전체 업무 수" 
                value={aggregation.totalWorkCount}
                description="DISTINCT 업무ID (IA초안 제외)"
              />
              <KPICard 
                title="Milestone" 
                value={aggregation.byMilestone.size}
                description="Milestone 수"
              />
              <KPICard 
                title="분과" 
                value={aggregation.byDivision.size}
                description="담당 분과 수"
              />
              <KPICard 
                title="책임 담당자" 
                value={aggregation.byAssigneeR.size}
                description="책임담당자(R) 수"
              />
            </div>

            <div className="dashboard__content">
              <aside className="dashboard__sidebar">
                <FilterPanel />
              </aside>
              <div className="dashboard__charts">
                <AggregationPanel />
                <MilestoneGanttView />
                <DrilldownPanel />
                <WbsTicketPanel />
              </div>
            </div>
          </section>
        )}

        <ComparisonResultPanel />
      </main>
    </div>
  );
}

export default App;
