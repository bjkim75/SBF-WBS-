import { NormalizedWbsTicket, WbsIndex } from '../../models/wbsTicket';

/**
 * 정규화된 Ticket 배열로부터 WorkId Index를 생성한다.
 *
 * - canonicalWorkId가 null인 Ticket은 인덱싱에서 제외
 * - 하나의 canonicalWorkId에 여러 Ticket이 매핑될 수 있음 (1:N)
 * - Index는 1회 생성 후 불변(immutable) — 파일 교체 시에만 새로 생성
 * - 모든 workId 조회는 이 Map의 .get()으로 O(1) 수행
 *
 * @param tickets - 전체 NormalizedWbsTicket 배열
 * @returns WbsIndex (Map<string, NormalizedWbsTicket[]>)
 */
export function buildWorkIdIndex(tickets: NormalizedWbsTicket[]): WbsIndex {
  const index: WbsIndex = new Map();

  for (const ticket of tickets) {
    if (!ticket.canonicalWorkId) continue;

    const existing = index.get(ticket.canonicalWorkId);
    if (existing) {
      existing.push(ticket);
    } else {
      index.set(ticket.canonicalWorkId, [ticket]);
    }
  }

  return index;
}
