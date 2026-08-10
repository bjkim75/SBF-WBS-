import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { applyFilters } from '../../core/analyzer/filterEngine';
import { computeAggregation } from '../../core/analyzer/aggregator';
import { groupByMilestone } from '../../core/normalizer/milestoneGrouper';
import { formatStartDate, formatDate } from '../../utils/dateUtils';

export function AggregationPanel() {
  const normalizedWorks = useDataStore(state => state.normalizedWorks);
  const filters = useFilterStore(state => state.filters);

  const filteredWorks = useMemo(() => {
    return applyFilters(normalizedWorks, filters);
  }, [normalizedWorks, filters]);

  const aggregation = useMemo(() => {
    return computeAggregation(filteredWorks);
  }, [filteredWorks]);

  const milestoneGroups = useMemo(() => {
    return groupByMilestone(filteredWorks);
  }, [filteredWorks]);

  // Milestone bar chart data (sorted by start date, earliest first)
  const milestoneData = useMemo(() => {
    return [...aggregation.byMilestone.entries()]
      .map(([name, count]) => {
        const group = milestoneGroups.find(g => g.milestone === name);
        const dateLabel = group && (group.startDate || group.finishDate)
          ? `${group.startDate ? formatStartDate(group.startDate) : '?'} ~ ${group.finishDate ? formatDate(group.finishDate) : '?'}`
          : '';
        return { name, count, dateLabel, startDate: group?.startDate || null };
      })
      .sort((a, b) => {
        // 마일스톤 미지정 always last
        if (a.name === '마일스톤 미지정') return 1;
        if (b.name === '마일스톤 미지정') return -1;
        // Sort by startDate (null dates go after dated ones)
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.getTime() - b.startDate.getTime();
      });
  }, [aggregation, milestoneGroups]);

  // Division bar chart data
  const divisionData = useMemo(() => {
    return [...aggregation.byDivision.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [aggregation]);

  return (
    <div className="aggregation-panel">
      <div className="aggregation-panel__section">
        <h3>Milestone별 업무 수</h3>
        <div style={{ minWidth: Math.max(600, milestoneData.length * 50), width: '100%' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={milestoneData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-45}
                textAnchor="end"
                fontSize={11}
                height={80}
                tickFormatter={(value: string) => {
                  const item = milestoneData.find((d: any) => d.name === value);
                  return item?.dateLabel ? `${value} (${item.dateLabel})` : value;
                }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4a90d9" name="업무 수">
                <LabelList dataKey="count" position="top" fontSize={10} fill="#333" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="aggregation-panel__section">
        <h3>분과별 업무 수</h3>
        <div style={{ minWidth: Math.max(600, divisionData.length * 60), width: '100%' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={divisionData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#67b168" name="업무 수">
                <LabelList dataKey="count" position="top" fontSize={10} fill="#333" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="aggregation-panel__section">
        <h3>Milestone × 분과 매트릭스</h3>
        <div className="matrix-table-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Milestone</th>
                {[...aggregation.byDivision.keys()].sort().map(div => (
                  <th key={div} title={div}>{div.length > 8 ? div.slice(0, 8) + '…' : div}</th>
                ))}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const divisions = [...aggregation.byDivision.keys()].sort();
                return [...aggregation.milestoneXDivision.entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([ms, divMap]) => {
                    const total = [...divMap.values()].reduce((s, v) => s + v, 0);
                    return (
                      <tr key={ms}>
                        <td className="matrix-table__ms">{ms}</td>
                        {divisions.map(div => (
                          <td key={div} className="matrix-table__cell">
                            {divMap.get(div) || ''}
                          </td>
                        ))}
                        <td className="matrix-table__total">{total}</td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
            <tfoot>
              <tr className="matrix-table__footer">
                <td className="matrix-table__ms">합계</td>
                {[...aggregation.byDivision.keys()].sort().map(div => (
                  <td key={div} className="matrix-table__total">
                    {aggregation.byDivision.get(div) || 0}
                  </td>
                ))}
                <td className="matrix-table__total">
                  {aggregation.totalWorkCount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
