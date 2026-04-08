import { useMemo, useState } from 'react';
import type { Session } from '@/types/models';
import { loadCheckins } from '@/lib/storage';
import { todayKey } from '@/lib/time';
import { Modal } from './Modal';
import { DayView } from './DayView';

interface CalendarProps {
  sessions: Session[];
}

function getMonthMatrix(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = new Date(year, month, 1 - ((firstDay.getDay() + 6) % 7)); // Monday-start
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }
  return weeks;
}

export function Calendar({ sessions }: CalendarProps) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    sessions.forEach((s) => {
      if (!map.has(s.dateKey)) map.set(s.dateKey, []);
      map.get(s.dateKey)!.push(s);
    });
    return map;
  }, [sessions]);
  const checkins = loadCheckins();

  const weeks = getMonthMatrix(cursor);
  const month = cursor.getMonth();
  const isToday = (d: Date) => todayKey(d) === todayKey();
  const inMonth = (d: Date) => d.getMonth() === month;

  const selectedSessions = selectedDay ? groups.get(selectedDay) ?? [] : [];

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          上个月
        </button>
        <div className="text-sm text-slate-300">
          {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
        </div>
        <button
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          下个月
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <div key={d} className="py-1">
            周{d}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {weeks.flat().map((d) => {
          const key = todayKey(d);
          const hasCheckin = checkins.includes(key);
          const hasSession = groups.has(key);
          return (
            <button
              key={key + String(inMonth(d))}
              type="button"
              onClick={() => setSelectedDay(key)}
              className={
                'aspect-square rounded-[18px] border px-1 py-1 text-left transition ' +
                (inMonth(d) ? 'border-white/8 bg-white/[0.03] hover:border-white/15' : 'border-white/5 bg-white/[0.015]')
              }
            >
              <div className="flex items-center justify-between">
                <span className={inMonth(d) ? 'text-slate-300' : 'text-slate-600'}>
                  {d.getDate()}
                </span>
                {isToday(d) ? (
                  <span className="rounded bg-indigo-500/20 px-1 text-[10px] text-indigo-300">今</span>
                ) : null}
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                <div
                  className={
                    'h-full rounded-full ' +
                    (hasSession ? 'bg-emerald-500' : hasCheckin ? 'bg-slate-600' : 'bg-transparent')
                  }
                  style={{ width: hasSession ? '100%' : hasCheckin ? '40%' : '0%' }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={`日期 ${selectedDay ?? ''}`}>
        <DayView dateKey={selectedDay ?? ''} sessions={selectedSessions} />
      </Modal>
    </div>
  );
}
