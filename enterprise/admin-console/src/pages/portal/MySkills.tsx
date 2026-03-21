import { useEffect, useState } from 'react';
import { Puzzle, Lock, Check } from 'lucide-react';
import { api } from '../../api/client';
import { Card, Badge } from '../../components/ui';

export default function MySkills() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/portal/skills').then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="p-6 text-text-muted">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">My Skills</h1>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Available ({data.available?.length || 0})</h3>
        <div className="grid grid-cols-2 gap-3">
          {(data.available || []).map((s: any) => (
            <div key={s.id || s.name} className="flex items-center gap-3 rounded-lg bg-green-500/5 border border-green-500/10 px-3 py-2.5">
              <Check size={16} className="text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                <p className="text-xs text-text-muted truncate">{s.description?.slice(0, 60)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Restricted ({data.restricted?.length || 0})</h3>
        <p className="text-xs text-text-muted mb-3">These skills require approval from your manager or IT admin.</p>
        <div className="grid grid-cols-2 gap-3">
          {(data.restricted || []).map((s: any) => (
            <div key={s.id || s.name} className="flex items-center gap-3 rounded-lg bg-dark-bg border border-dark-border px-3 py-2.5">
              <Lock size={16} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary truncate">{s.name}</p>
                <p className="text-xs text-text-muted truncate">{s.description?.slice(0, 60)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
