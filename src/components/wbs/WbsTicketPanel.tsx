import { useMemo } from 'react';
import { useWbsStore } from '../../store/wbsStore';
import { NormalizedWbsTicket } from '../../models/wbsTicket';
import { WbsFileUpload } from './WbsFileUpload';

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
function formatDate(date: Date | null): string {
  if (!date) return '-';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * WBS Ticket 표시 패널
 *
 * 선택된 WorkId에 해당하는 WBS Ticket 목록을 테이블 형태로 보여준다.
 * DrilldownPanel과 독립적으로 동작하며, wbsStore 상태에 따라
 * 5가지 패널 상태를 조건부 렌더링한다.
 */
export function WbsTicketPanel() {
  const selectedWorkId = useWbsStore(state => state.selectedWorkId);
  const wbsIndex = useWbsStore(state => state.wbsIndex);
  const isLoading = useWbsStore(state => state.isLoading);
  const error = useWbsStore(state => state.error);
  const currentTickets = useWbsStore(state => state.currentTickets);


  // 티켓 목록 메모이제이션
  const tickets: NormalizedWbsTicket[] = useMemo(() => {
    return currentTickets;
  }, [currentTickets]);

  // State 1: selectedWorkId가 없으면 렌더링하지 않음
  if (selectedWorkId === null) return null;

  // State 2: WBS Index가 없으면 파일 업로드 안내
  if (wbsIndex === null) {
    return (
      <div className="wbs-ticket-panel">
        <div className="wbs-ticket-panel__header">
          <h3>WBS Tickets: {selectedWorkId}</h3>
          <WbsFileUpload />
        </div>
        <p className="wbs-ticket-panel__msg">WBS 분석을 위한 데이터가 없습니다. WBS XLSX 파일을 선택해 주세요.</p>
      </div>
    );
  }

  // State 3: 로딩 중
  if (isLoading) {
    return (
      <div className="wbs-ticket-panel">
        <div className="wbs-ticket-panel__header">
          <h3>WBS Tickets: {selectedWorkId}</h3>
        </div>
        <p className="wbs-ticket-panel__msg">분석 중...</p>
      </div>
    );
  }

  // State 4: 에러 발생
  if (error !== null) {
    return (
      <div className="wbs-ticket-panel">
        <div className="wbs-ticket-panel__header">
          <h3>WBS Tickets: {selectedWorkId}</h3>
          <WbsFileUpload />
        </div>
        <div className="wbs-ticket-panel__error">
          <p className="wbs-ticket-panel__msg"><strong>[{error.type}]</strong> {error.message}</p>
          {error.details && error.details.length > 0 && (
            <ul>
              {error.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // State 5: 연결된 Ticket 없음
  if (tickets.length === 0) {
    return (
      <div className="wbs-ticket-panel">
        <div className="wbs-ticket-panel__header">
          <h3>WBS Tickets: {selectedWorkId} (0건)</h3>
          <WbsFileUpload replace />
        </div>
        <p className="wbs-ticket-panel__msg">연결된 WBS Ticket이 없습니다</p>
      </div>
    );
  }

  // State 6: Ticket 목록 표시
  return (
    <div className="wbs-ticket-panel">
      <div className="wbs-ticket-panel__header">
        <h3>WBS Tickets: {selectedWorkId} ({tickets.length}건)</h3>
        <WbsFileUpload replace />
      </div>

      <div className="wbs-ticket-panel__table-wrapper">
        <table className="wbs-ticket-table">
          <thead>
            <tr>
              <th>키</th>
              <th>요약</th>
              <th>상태</th>
              <th>계획시작일</th>
              <th>계획종료일</th>
              <th>WBS 담당자</th>
              <th>SKT/B 담당자</th>
              <th>SBF 도메인</th>
              <th>SBF 업무ID/명</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={`${ticket.jiraKey}-${ticket.sourceRow}`}>
                <td>{ticket.jiraKey}</td>
                <td title={ticket.summary}>{ticket.summary}</td>
                <td>{ticket.status ?? '-'}</td>
                <td>{formatDate(ticket.planStartDate)}</td>
                <td>{formatDate(ticket.planEndDate)}</td>
                <td>{ticket.wbsAssignee ?? '-'}</td>
                <td>{ticket.sktAssignee ?? '-'}</td>
                <td>{ticket.sbfDomain ?? '-'}</td>
                <td>{ticket.sbfWorkIdRaw ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
