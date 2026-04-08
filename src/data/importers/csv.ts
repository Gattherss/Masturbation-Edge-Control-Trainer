import type { Session, Segment } from '@/types/models';
import { listSessions, saveSession } from '@/data/repositories/sessionRepo';
import { getPlan } from '@/lib/plans';
import { loadSettings } from '@/lib/settings';
import { scoreSession } from '@/lib/eval';
import { todayKey } from '@/lib/time';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cell += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
        continue;
      }
      if (ch === '\n' || ch === '\r') {
        if (cell.length > 0 || row.length > 0) {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        }
        i++;
        // handle CRLF
        if (ch === '\r' && text[i] === '\n') i++;
        continue;
      }
      cell += ch;
      i++;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length));
}

export async function importSessionsAndSegmentsCSV(files: File[]) {
  const sessionsFile = files.find((f) => /sessions\.csv$/i.test(f.name)) ?? files[0];
  const segmentsFile = files.find((f) => /segments\.csv$/i.test(f.name));

  const sessionsText = await sessionsFile.text();
  const sessionsRows = parseCSV(sessionsText);
  const header = sessionsRows.shift() || [];
  const col = (name: string) => header.findIndex((h) => h.trim() === name);

  const map = new Map<string, Session>();
  const modePlan = getPlan(loadSettings().mode);

  sessionsRows.forEach((r) => {
    const id = r[col('session_id')] || r[0];
    const start = r[col('start_ts')] || new Date().toISOString();
    const end = r[col('end_ts')] || start;
    const durationSec = Number(r[col('duration_sec')] || '0');
    const usedPorn = String(r[col('usedPorn')] || '').toLowerCase() === 'true';
    const ejaculated = String(r[col('ejaculated')] || '').toLowerCase() === 'true';
    const edges = Number(r[col('edges')] || '0');
    const dateKey = r[col('date')] || todayKey(new Date(start));

    const session: Session = {
      id,
      schemaVersion: 'v1',
      startAt: start,
      endAt: end,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dateKey,
      durationMs: Math.round(durationSec * 1000),
      edges,
      usedPorn,
      ejaculated,
      segments: [],
      events: [],
      note: r[col('note')] || undefined,
      perceivedArousal: r[col('perceived_arousal')] ? Number(r[col('perceived_arousal')]) : undefined,
      stopReason: r[col('stop_reason')] || undefined,
      planSnapshot: modePlan
    };
    map.set(id, session);
  });

  if (segmentsFile) {
    const segmentsText = await segmentsFile.text();
    const segRows = parseCSV(segmentsText);
    const segHeader = segRows.shift() || [];
    const sc = (name: string) => segHeader.findIndex((h) => h.trim() === name);
    const groups = new Map<string, Segment[]>();
    segRows.forEach((r) => {
      const sid = r[sc('session_id')] || r[0];
      const seq = Number(r[sc('seq')] || '0');
      const type = (r[sc('type')] || 'stim') as Segment['type'];
      const durationSec = Number(r[sc('duration_sec')] || '0');
      const suggested = r[sc('suggested_sec')] ? Number(r[sc('suggested_sec')]) : undefined;
      const hit = r[sc('hit_target')] ? r[sc('hit_target')] === 'true' : undefined;
      const arr = groups.get(sid) ?? [];
      arr.push({
        seq,
        type,
        startAt: '',
        endAt: '',
        durationMs: Math.round(durationSec * 1000),
        suggestedSec: suggested,
        hitTarget: hit
      });
      groups.set(sid, arr);
    });
    groups.forEach((list) => list.sort((a, b) => a.seq - b.seq));

    groups.forEach((segments, sid) => {
      const session = map.get(sid);
      if (!session) return;
      // reconstruct start/end from startAt and durations
      let t = Date.parse(session.startAt);
      const rebuilt = segments.map((s) => {
        const start = new Date(t).toISOString();
        t += s.durationMs;
        const end = new Date(t).toISOString();
        return { ...s, startAt: start, endAt: end } as Segment;
      });
      session.segments = rebuilt;
      session.durationMs = rebuilt.reduce((a, b) => a + b.durationMs, 0);
    });
  }

  // Save and score
  let sessionsImported = 0;
  let segmentsImported = 0;
  map.forEach((session) => {
    if (session.segments.length > 0) segmentsImported += session.segments.length;
    const plan = session.planSnapshot ?? modePlan;
    const scored = scoreSession(session, plan);
    session.metrics = scored;
    session.scores = {
      total: scored.total,
      grade: scored.grade,
      PDI_score: scored.PDI_score,
      RCI_score: scored.RCI_score,
      CEI_score: scored.CEI_score
    };
    saveSession(session);
    sessionsImported += 1;
  });

  return { sessions: sessionsImported, segments: segmentsImported };
}

