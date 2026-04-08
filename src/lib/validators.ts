import type { Segment, Session } from '@/types/models';

const DURATION_TOLERANCE_MS = 1000;

export function validateSegments(segments: Segment[]): string[] {
  const errors: string[] = [];

  if (!segments.length) {
    return errors;
  }

  const sorted = [...segments].sort((a, b) => a.seq - b.seq);

  sorted.forEach((segment, index) => {
    if (segment.seq !== index + 1) {
      errors.push(`段 ${segment.seq} 序号异常（应为 ${index + 1}）。`);
    }

    const startMs = Date.parse(segment.startAt);
    const endMs = Date.parse(segment.endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      errors.push(`段 ${segment.seq} 时间戳无效。`);
      return;
    }
    if (endMs <= startMs) {
      errors.push(`段 ${segment.seq} 结束时间必须大于开始时间。`);
    }
    const diff = endMs - startMs;
    if (Math.abs(diff - segment.durationMs) > DURATION_TOLERANCE_MS) {
      errors.push(`段 ${segment.seq} 时长与时间差不一致（声明 ${segment.durationMs}ms，实际 ${diff}ms）。`);
    }

    if (index > 0) {
      const prev = sorted[index - 1];
      const prevEnd = Date.parse(prev.endAt);
      if (startMs < prevEnd - DURATION_TOLERANCE_MS) {
        errors.push(`段 ${segment.seq} 开始时间早于段 ${prev.seq} 的结束时间。`);
      }
    }
  });

  return errors;
}

export function validateSession(session: Session): string[] {
  const errors: string[] = [];

  const segmentErrors = validateSegments(session.segments);
  errors.push(...segmentErrors);

  const declaredDuration = session.durationMs;
  const computedDuration = session.segments.reduce((acc, segment) => acc + segment.durationMs, 0);

  if (Math.abs(declaredDuration - computedDuration) > DURATION_TOLERANCE_MS) {
    errors.push(
      `会话时长与分段总和不符（session=${declaredDuration}ms, segments=${computedDuration}ms）。`
    );
  }

  if (session.startAt && session.endAt) {
    const startMs = Date.parse(session.startAt);
    const endMs = Date.parse(session.endAt);
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      if (endMs <= startMs) {
        errors.push('会话结束时间必须大于开始时间。');
      } else if (Math.abs(endMs - startMs - declaredDuration) > DURATION_TOLERANCE_MS) {
        errors.push('开始/结束时间与 durationMs 不一致。');
      }
    }
  }

  return errors;
}
