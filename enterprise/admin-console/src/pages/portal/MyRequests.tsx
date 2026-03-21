import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Card, Badge } from '../../components/ui';

export default function MyRequests() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/portal/requests').then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="p-6 text-text-muted">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">My Requests</h1>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Pending ({data.pending?.length || 0})</h3>
        {data.pending?.length > 0 ? (
          <div className="space-y-2">
            {data.pending.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/10 px-4 py-3">
                <Clock size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Request access to: {r.tool}</p>
                  <p className="text-xs text-text-muted mt-0.5">{r.reason}</p>
                  <p className="text-[10px] text-text-muted mt-1">Submitted: {new Date(r.timestamp).toLocaleString()}</p>
                </div>
                <Badge color="warning">Pending</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">No pending requests</p>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Resolved ({data.resolved?.length || 0})</h3>
        {data.resolved?.length > 0 ? (
          <div className="space-y-2">
            {data.resolved.map((r: any) => (
              <div key={r.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 ${
                r.status === 'approved' ? 'bg-green-500/5 border border-green-500/10' : 'bg-red-500/5 border border-red-500/10'
              }`}>
                {r.status === 'approved' ? <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" /> : <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-text-primary">{r.tool}</p>
                  <p className="text-xs text-text-muted mt-0.5">Reviewed by: {r.reviewer}</p>
                  <p className="text-[10px] text-text-muted mt-1">{new Date(r.resolvedAt || r.timestamp).toLocaleString()}</p>
                </div>
                <Badge color={r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">No resolved requests</p>
        )}
      </Card>
    </div>
  );
}
