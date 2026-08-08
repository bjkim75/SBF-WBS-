import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { applyFilters } from '../../core/analyzer/filterEngine';
import { computeAggregation } from '../../core/analyzer/aggregator';
import { exportToExcel } from '../../core/analyzer/exportService';

export function DownloadButton() {
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);

  const handleDownload = () => {
    const filtered = applyFilters(normalizedWorks, filters);
    const aggregation = computeAggregation(filtered);
    exportToExcel(filtered, aggregation);
  };

  return (
    <button
      onClick={handleDownload}
      className="download-btn"
      disabled={normalizedWorks.length === 0}
    >
      📥 분석 결과 다운로드
    </button>
  );
}
