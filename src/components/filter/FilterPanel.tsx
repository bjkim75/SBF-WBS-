import { useMemo, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { IA_DEFAULT_EXCLUDED_DIVISIONS } from '../../core/constants/iaSchema';

export function FilterPanel() {
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);
  const setMilestones = useFilterStore(state => state.setMilestones);
  const setAssigneesR = useFilterStore(state => state.setAssigneesR);
  const toggleDivision = useFilterStore(state => state.toggleDivision);
  const selectAllDivisions = useFilterStore(state => state.selectAllDivisions);
  const deselectAllDivisions = useFilterStore(state => state.deselectAllDivisions);
  const initializeDivisions = useFilterStore(state => state.initializeDivisions);
  const resetFilters = useFilterStore(state => state.resetFilters);

  // Extract unique values
  const allDivisions = useMemo(() =>
    [...new Set(normalizedWorks.map(w => w.division))].sort(),
    [normalizedWorks]
  );

  const milestoneOptions = useMemo(() =>
    [...new Set(normalizedWorks.map(w => w.milestone))].sort(),
    [normalizedWorks]
  );

  const assigneeROptions = useMemo(() =>
    [...new Set(normalizedWorks.map(w => w.assigneeR))].sort(),
    [normalizedWorks]
  );

  const filteredAssigneeCount = useMemo(() => {
    const selectedDivs = filters.selectedDivisions;
    if (selectedDivs === null) return assigneeROptions.length;
    const filteredWorks = normalizedWorks.filter(w => selectedDivs.includes(w.division));
    return new Set(filteredWorks.map(w => w.assigneeR)).size;
  }, [normalizedWorks, filters.selectedDivisions, assigneeROptions]);

  // Initialize selectedDivisions when data loads (only if null)
  useEffect(() => {
    if (normalizedWorks.length > 0 && filters.selectedDivisions === null) {
      initializeDivisions(allDivisions);
    }
  }, [normalizedWorks, allDivisions, filters.selectedDivisions, initializeDivisions]);

  const selectedDivisions = filters.selectedDivisions || [];
  const allSelected = selectedDivisions.length === allDivisions.length;
  const noneSelected = selectedDivisions.length === 0;

  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <h3>필터</h3>
        <button onClick={() => resetFilters(allDivisions)} className="filter-panel__reset">초기화</button>
      </div>

      {/* 분과 선택 (체크박스) */}
      <div className="filter-panel__group">
        <div className="filter-panel__group-header">
          <label>분과 ({selectedDivisions.length}/{allDivisions.length})</label>
          <div className="filter-panel__group-actions">
            <button
              onClick={() => selectAllDivisions(allDivisions)}
              className="filter-panel__btn-small"
              disabled={allSelected}
            >전체</button>
            <button
              onClick={deselectAllDivisions}
              className="filter-panel__btn-small"
              disabled={noneSelected}
            >없음</button>
          </div>
        </div>
        <div className="filter-panel__checkbox-list">
          {allDivisions.map(div => {
            const isDefault = (IA_DEFAULT_EXCLUDED_DIVISIONS as readonly string[]).includes(div);
            const isChecked = selectedDivisions.includes(div);
            return (
              <label key={div} className={`filter-panel__checkbox-item ${isDefault ? 'filter-panel__checkbox-item--default-excluded' : ''}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleDivision(div)}
                />
                <span>{div}</span>
                {isDefault && !isChecked && <span className="filter-panel__default-badge">기본제외</span>}
              </label>
            );
          })}
        </div>
        <div className="filter-panel__selection-info">
          {selectedDivisions.length}/{allDivisions.length} 선택됨
        </div>
      </div>

      {/* Milestone 필터 */}
      <div className="filter-panel__group">
        <div className="filter-panel__group-header">
          <label>Milestone ({milestoneOptions.length})</label>
          {filters.milestones.length > 0 && (
            <button onClick={() => setMilestones([])} className="filter-panel__btn-small">해제</button>
          )}
        </div>
        <select
          multiple
          value={filters.milestones}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, o => o.value);
            setMilestones(selected);
          }}
          size={Math.min(milestoneOptions.length, 6)}
        >
          {milestoneOptions.map(ms => (
            <option key={ms} value={ms}>{ms}</option>
          ))}
        </select>
      </div>

      {/* 책임 담당자 필터 */}
      <div className="filter-panel__group">
        <div className="filter-panel__group-header">
          <label>책임 담당자R ({filteredAssigneeCount}/{assigneeROptions.length})</label>
          {filters.assigneesR.length > 0 && (
            <button onClick={() => setAssigneesR([])} className="filter-panel__btn-small">해제</button>
          )}
        </div>
        <select
          multiple
          value={filters.assigneesR}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, o => o.value);
            setAssigneesR(selected);
          }}
          size={Math.min(assigneeROptions.length, 6)}
        >
          {assigneeROptions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* 활성 필터 요약 */}
      <div className="filter-panel__active">
        {filters.milestones.length > 0 && (
          <span className="filter-tag">MS: {filters.milestones.length}개</span>
        )}
        {selectedDivisions.length < allDivisions.length && (
          <span className="filter-tag">분과: {selectedDivisions.length}/{allDivisions.length}</span>
        )}
        {filters.assigneesR.length > 0 && (
          <span className="filter-tag">담당자: {filters.assigneesR.length}개</span>
        )}
      </div>
    </div>
  );
}
