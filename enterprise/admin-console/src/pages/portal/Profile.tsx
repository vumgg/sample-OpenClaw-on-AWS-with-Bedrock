import { useState, useEffect } from 'react';
import { User, Bot, Save, Brain, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { Badge, Button, Card, StatusDot } from '../../components/ui';

export default function PortalProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userMd, setUserMd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<any>('/portal/profile').then(data => {
      setProfile(data);
      setUserMd(data.userMd || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/portal/profile', { userMd });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {}
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">My Profile</h1>

      {/* Basic Info */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary text-xl font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{user?.name}</h2>
            <p className="text-sm text-text-muted">{user?.positionName} · {user?.departmentName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-text-muted">Employee ID</p><p className="text-sm font-medium">{user?.id}</p></div>
          <div><p className="text-xs text-text-muted">Position</p><p className="text-sm font-medium">{user?.positionName}</p></div>
          <div><p className="text-xs text-text-muted">Department</p><p className="text-sm font-medium">{user?.departmentName}</p></div>
          <div>
            <p className="text-xs text-text-muted">Agent</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Bot size={14} className="text-green-400" />
              <span className="text-sm font-medium">{profile?.agent?.name || 'Not assigned'}</span>
              {profile?.agent && <StatusDot status={profile.agent.status} />}
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Preferences (USER.md)</h3>
            <p className="text-xs text-text-muted">Customize how your AI assistant behaves</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
        <textarea
          value={userMd}
          onChange={e => setUserMd(e.target.value)}
          rows={10}
          placeholder="# My Preferences&#10;&#10;- I prefer concise answers&#10;- Always include code examples in TypeScript&#10;- Focus on AWS services"
          className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none font-mono"
        />
      </Card>

      {/* Memory */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-primary-light" />
            <h3 className="text-sm font-semibold text-text-primary">Agent Memory</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-dark-bg p-3">
            <p className="text-xs text-text-muted">MEMORY.md</p>
            <p className="text-sm font-medium">{profile?.memoryMdSize ? `${(profile.memoryMdSize / 1024).toFixed(1)} KB` : 'Empty'}</p>
          </div>
          <div className="rounded-lg bg-dark-bg p-3">
            <p className="text-xs text-text-muted">Daily Memories</p>
            <p className="text-sm font-medium">{profile?.dailyMemoryCount || 0} files</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
