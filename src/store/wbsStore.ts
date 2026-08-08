import { create } from 'zustand';
import { NormalizedWbsTicket, WbsIndex, WbsError } from '../models/wbsTicket';

interface WbsStore {
  // === State ===
  /** 전체 정규화된 티켓 목록 */
  tickets: NormalizedWbsTicket[];
  /** WorkId → Ticket[] 색인 (null = 미로딩) */
  wbsIndex: WbsIndex | null;
  /** 현재 선택된 WorkId (클릭 즉시 설정, 업로드 중에도 보존) */
  selectedWorkId: string | null;
  /** 현재 조회된 Ticket 목록 */
  currentTickets: NormalizedWbsTicket[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 상태 */
  error: WbsError | null;
  /** 로드된 파일명 (표시용) */
  loadedFileName: string | null;

  // === Actions ===

  /**
   * WorkId 선택 — 클릭 즉시 호출
   * wbsIndex가 있으면 즉시 lookup, 없으면 selectedWorkId만 저장
   */
  setSelectedWorkId: (workId: string) => void;

  /**
   * WBS 데이터 설정 — 파싱 완료 후 호출
   * selectedWorkId가 이미 설정되어 있으면 자동 lookup 실행
   */
  setWbsData: (tickets: NormalizedWbsTicket[], index: WbsIndex, fileName: string) => void;

  /**
   * WBS 데이터 교체 — 새 파일 파싱 완료 후 호출 (validate-then-replace)
   * 기존 데이터 폐기 + 새 데이터 설정 + selectedWorkId 보존 + 자동 relookup
   */
  replaceWbsData: (tickets: NormalizedWbsTicket[], index: WbsIndex, fileName: string) => void;

  /** 로딩 상태 설정 */
  setLoading: (loading: boolean) => void;

  /** 에러 설정 */
  setError: (error: WbsError | null) => void;

  /** 선택 해제 */
  clearSelection: () => void;

  /** 전체 초기화 */
  reset: () => void;
}

export const useWbsStore = create<WbsStore>((set, get) => ({
  // Initial state
  tickets: [],
  wbsIndex: null,
  selectedWorkId: null,
  currentTickets: [],
  isLoading: false,
  error: null,
  loadedFileName: null,

  setSelectedWorkId: (workId) => {
    const { wbsIndex } = get();
    if (wbsIndex) {
      // Index exists → immediate lookup
      const tickets = wbsIndex.get(workId) ?? [];
      set({ selectedWorkId: workId, currentTickets: tickets });
    } else {
      // No index yet → just store the workId (preserved through upload flow)
      set({ selectedWorkId: workId, currentTickets: [] });
    }
  },

  setWbsData: (tickets, index, fileName) => {
    const { selectedWorkId } = get();
    // Auto-lookup if workId was previously selected
    const currentTickets = selectedWorkId ? (index.get(selectedWorkId) ?? []) : [];
    set({
      tickets,
      wbsIndex: index,
      loadedFileName: fileName,
      isLoading: false,
      error: null,
      currentTickets,
    });
  },

  replaceWbsData: (tickets, index, fileName) => {
    // Same as setWbsData — selectedWorkId is NOT cleared
    const { selectedWorkId } = get();
    const currentTickets = selectedWorkId ? (index.get(selectedWorkId) ?? []) : [];
    set({
      tickets,
      wbsIndex: index,
      loadedFileName: fileName,
      isLoading: false,
      error: null,
      currentTickets,
    });
  },

  setLoading: (loading) => set({ isLoading: loading, error: null }),

  setError: (error) => set({ error, isLoading: false }),

  clearSelection: () => set({ selectedWorkId: null, currentTickets: [] }),

  reset: () => set({
    tickets: [],
    wbsIndex: null,
    selectedWorkId: null,
    currentTickets: [],
    isLoading: false,
    error: null,
    loadedFileName: null,
  }),
}));
