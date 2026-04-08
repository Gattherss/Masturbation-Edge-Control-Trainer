import type { Session } from '@/types/models';

export function sessionsToCSV(sessions: Session[]): string {
  const header = [
    'session_id',
    'date',
    'start_ts',
    'end_ts',
    'duration_sec',
    'edges',
    'usedPorn',
    'ejaculated',
    'lfe_sec',
    'pdi',
    'rci',
    'cei',
    'odf',
    'rest_penalty',
    'score_total',
    'grade',
    'perceived_arousal',
    'stop_reason',
    'note'
  ];

  const lines = sessions.map((s) => {
    const m = s.metrics ?? ({} as any);
    const sc = s.scores ?? ({} as any);
    return [
      s.id,
      s.dateKey,
      s.startAt,
      s.endAt,
      Math.round(s.durationMs / 1000),
      s.edges,
      s.usedPorn,
      s.ejaculated,
      m.lfeSec ?? '',
      m.pdi ?? '',
      m.rci ?? '',
      m.cei ?? '',
      m.odf ?? '',
      m.restPenalty ?? '',
      sc.total ?? '',
      sc.grade ?? '',
      s.perceivedArousal ?? '',
      s.stopReason ?? '',
      (s.note ?? '').replace(/\n/g, ' ')
    ]
      .map(String)
      .map((v) => (v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v))
      .join(',');
  });

  return [header.join(','), ...lines].join('\n');
}

export function segmentsToCSV(sessions: Session[]): string {
  const header = ['session_id', 'seq', 'type', 'duration_sec', 'suggested_sec', 'hit_target'];
  const lines: string[] = [];
  sessions.forEach((s) => {
    s.segments.forEach((seg) => {
      const row = [
        s.id,
        seg.seq,
        seg.type,
        Math.round(seg.durationMs / 1000),
        seg.suggestedSec ?? '',
        seg.hitTarget ?? ''
      ]
        .map(String)
        .map((v) => (v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v))
        .join(',');
      lines.push(row);
    });
  });

  return [header.join(','), ...lines].join('\n');
}
