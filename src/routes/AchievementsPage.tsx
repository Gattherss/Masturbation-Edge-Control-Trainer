import type { Baseline, Plan, Session, Settings } from '@/types/models';
import SessionsDetailsTable from '@/components/SessionsDetailsTable';

interface AchievementsPageProps {
  sessions: Session[];
  settings: Settings;
  baseline: Baseline | null;
  currentPlan: Plan;
  onDataChanged: () => void;
}

export default function AchievementsPage({
  sessions,
  settings,
  baseline,
  currentPlan,
  onDataChanged
}: AchievementsPageProps) {
  return (
    <div className="space-y-6">
      <SessionsDetailsTable
        sessions={sessions}
        settings={settings}
        baseline={baseline}
        currentPlan={currentPlan}
        onDataChanged={onDataChanged}
        limit={50}
      />
    </div>
  );
}
