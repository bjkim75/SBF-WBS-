import { create } from 'zustand';
import { NormalizedWork } from '../models/normalized';
import { ComparisonResult } from '../models/comparison';
import { compare } from '../core/comparison/comparisonEngine';
import { computeDivisionSummary, computeMilestoneSummary } from '../core/comparison/summaryAggregator';
import { useDataStore } from './dataStore';

interface ComparisonStore {
  /** After 파일명 */
  afterFileName: string | null;
  /** After 파싱 결과 */
  afterWorks: NormalizedWork[];
  /** 비교 결과 (null = 비교 미실행) */
  comparisonResult: ComparisonResult | null;
  /** 비교 진행 중 여부 */
  isComparing: boolean;
  /** 에러 메시지 */
  error: string | null;

  /** After 데이터 설정 + 비교 실행 */
  setAfterData: (works: NormalizedWork[], fileName: string) => void;
  /** 비교 진행 상태 설정 */
  setIsComparing: (isComparing: boolean) => void;
  /** 에러 설정 */
  setError: (error: string) => void;
  /** 비교 결과 초기화 (닫기) */
  reset: () => void;
}

export const useComparisonStore = create<ComparisonStore>((set) => ({
  afterFileName: null,
  afterWorks: [],
  comparisonResult: null,
  isComparing: false,
  error: null,

  setAfterData: (works, fileName) => {
    try {
      // Read Before data from dataStore (read-only reference)
      const before = useDataStore.getState().normalizedWorks;

      // Run comparison
      const diffResult = compare(before, works);

      // Compute summaries
      const divisionSummaries = computeDivisionSummary(diffResult, before, works);
      const milestoneSummaries = computeMilestoneSummary(diffResult, before, works);

      set({
        afterWorks: works,
        afterFileName: fileName,
        comparisonResult: { diffResult, divisionSummaries, milestoneSummaries },
        isComparing: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '비교 실행 중 오류가 발생했습니다',
        isComparing: false,
      });
    }
  },

  setIsComparing: (isComparing) => set({ isComparing, error: null }),

  setError: (error) => set({ error, isComparing: false }),

  reset: () => set({
    afterFileName: null,
    afterWorks: [],
    comparisonResult: null,
    isComparing: false,
    error: null,
  }),
}));
