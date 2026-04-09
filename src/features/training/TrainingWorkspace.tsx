import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { useTrainingMachine } from './useTrainingMachine';
import { TrainingView } from './TrainingView';
import type { FinalizeResult } from '@/services/scoringPipeline';
import type { Plan, Settings as AppSettings } from '@/types/models';

interface NoteForm {
  note: string;
  perceivedArousal: number | null;
  stopReason: string;
}

interface TrainingWorkspaceProps {
  plan: Plan;
  settings: AppSettings;
  onSaved: (result: FinalizeResult) => void;
  onToast: (message: string) => void;
}

export function TrainingWorkspace({ plan, settings, onSaved, onToast }: TrainingWorkspaceProps) {
  const machine = useTrainingMachine({ plan });
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState<NoteForm>({ note: '', perceivedArousal: null, stopReason: '' });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        machine.switchPhase();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [machine.switchPhase]);

  const openFinalizeModal = useCallback(() => {
    const handle = machine.requestFinalize();
    if (!handle) {
      onToast('当前没有可保存的训练数据');
      return;
    }
    setNoteModalOpen(true);
  }, [machine, onToast]);

  const finalizeSession = useCallback(
    (payload: NoteForm) => {
      try {
        const normalizedPayload = settings.collectArousalOnFinish
          ? payload
          : { ...payload, perceivedArousal: null };
        const result = machine.finalize(normalizedPayload);

        setNoteModalOpen(false);
        setNoteForm({ note: '', perceivedArousal: null, stopReason: '' });
        onSaved(result);
      } catch (error) {
        onToast(error instanceof Error ? error.message : '保存失败');
        machine.cancelFinalize();
      }
    },
    [machine, onSaved, onToast, settings.collectArousalOnFinish]
  );

  return (
    <>
      <TrainingView machine={machine} onFinish={openFinalizeModal} restBeepEnabled={settings.restBeep} />

      <Modal
        open={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          machine.cancelFinalize();
        }}
        title="记录训练 / Save Session"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200"
              onClick={() => finalizeSession({ note: '', perceivedArousal: null, stopReason: '' })}
            >
              跳过 / Skip
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              onClick={() => finalizeSession(noteForm)}
            >
              提交并保存 / Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-300">训练备注 / Notes</span>
            <textarea
              className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              value={noteForm.note}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
          {settings.collectArousalOnFinish ? (
            <label className="block text-sm">
              <span className="text-slate-300">主观强度（1-10） / Arousal</span>
              <input
                type="number"
                min={1}
                max={10}
                value={noteForm.perceivedArousal ?? ''}
                onChange={(event) =>
                  setNoteForm((prev) => ({
                    ...prev,
                    perceivedArousal: event.target.value ? Number(event.target.value) : null
                  }))
                }
                className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-slate-300">停止原因 / Stop reason</span>
            <select
              className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              value={noteForm.stopReason}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, stopReason: event.target.value }))}
            >
              <option value="">未选择 / None</option>
              {['自然结束', '达到目标', '疲劳', '无聊', '射精', '其他'].map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </>
  );
}
