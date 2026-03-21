import { useState } from 'react';
import { Puzzle, Plus, Search, Key, Shield, Upload, Package, Container as ContainerIcon, Cloud, CheckCircle, Lock, Users } from 'lucide-react';
import { Card, StatCard, Badge, Button, PageHeader, Table, Modal, Input, Select, Tabs } from '../../components/ui';
import { useSkills, useSkillKeys, usePositions } from '../../hooks/useApi';
import type { SkillManifest, SkillApiKey } from '../../hooks/useApi';

const layerColor = (l: number): 'primary' | 'success' | 'info' => l === 1 ? 'primary' : l === 2 ? 'success' : 'info';
const statusColor = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  switch (s) { case 'installed': return 'success'; case 'pending_review': return 'warning'; case 'building': return 'info'; case 'error': return 'danger'; default: return 'default'; }
};
const categoryIcon: Record<string, string> = {
  information: '🔍', communication: '📧', collaboration: '📝', 'project-management': '📋',
  crm: '💼', erp: '🏦', development: '💻', data: '📊', productivity: '⚡', utility: '🔧',
};

export default function SkillCatalog() {
  const { data: skills = [], isLoading } = useSkills();
  const { data: apiKeys = [] } = useSkillKeys();
  const { data: positions = [] } = usePositions();
  const [activeTab, setActiveTab] = useState('catalog');
  const [filterLayer, setFilterLayer] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  const installed = skills.filter(s => (s.status || 'installed') === 'installed');
  const l1 = installed.filter(s => s.layer === 1);
  const l2 = installed.filter(s => s.layer === 2);
  const l3 = installed.filter(s => s.layer === 3);
  const categories = [...new Set(skills.map(s => s.category))].sort();

  const filtered = skills.filter(s => {
    const matchText = !filterText || s.name.includes(filterText.toLowerCase()) || s.description.toLowerCase().includes(filterText.toLowerCase());
    const matchLayer = filterLayer === 'all' || s.layer === Number(filterLayer);
    const matchCat = filterCategory === 'all' || s.category === filterCategory;
    return matchText && matchLayer && matchCat;
  });

  return (
    <div>
      <PageHeader
        title="Skill Platform"
        description={`${installed.length} skills installed · ${apiKeys.length} API keys managed · ${skills.filter(s => s.status === 'pending_review').length} pending review`}
        actions={
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setActiveTab('keys')}><Key size={16} /> API Keys</Button>
            <Button variant="primary" onClick={() => setShowInstall(true)}><Plus size={16} /> Add Skill</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
        <StatCard title="Total Installed" value={installed.length} icon={<Puzzle size={22} />} color="primary" />
        <StatCard title="Layer 1 (Docker)" value={l1.length} icon={<ContainerIcon size={22} />} color="primary" subtitle="Built into image" />
        <StatCard title="Layer 2 (S3)" value={l2.length} icon={<Cloud size={22} />} color="success" subtitle="Hot-loaded scripts" />
        <StatCard title="Layer 3 (Bundle)" value={l3.length} icon={<Package size={22} />} color="info" subtitle="Pre-built packages" />
        <StatCard title="API Keys" value={apiKeys.length} icon={<Key size={22} />} color="warning" subtitle={`${apiKeys.filter(k => k.status === 'iam-role').length} via IAM, ${apiKeys.filter(k => k.status === 'not-configured').length} need config`} />
      </div>

      <Card>
        <Tabs
          tabs={[
            { id: 'catalog', label: 'Skill Catalog', count: skills.length },
            { id: 'keys', label: 'API Key Vault', count: apiKeys.length },
            { id: 'permissions', label: 'Role Permissions' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'catalog' && (
          <div className="mt-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Search skills..."
                  className="w-full rounded-lg border border-dark-border bg-dark-bg py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
              </div>
              <select value={filterLayer} onChange={e => setFilterLayer(e.target.value)} className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none appearance-none">
                <option value="all">All Layers</option>
                <option value="1">Layer 1 — Docker</option>
                <option value="2">Layer 2 — S3</option>
                <option value="3">Layer 3 — Bundle</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none appearance-none">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <Table
              columns={[
                { key: 'name', label: 'Skill', render: (s: SkillManifest) => (
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcon[s.category] || '🧩'}</span>
                    <div>
                      <button onClick={() => setSelectedSkill(s)} className="text-sm font-medium text-primary-light hover:underline">{s.name}</button>
                      <p className="text-xs text-text-muted">v{s.version} · {s.author}</p>
                    </div>
                  </div>
                )},
                { key: 'layer', label: 'Layer', render: (s: SkillManifest) => <Badge color={layerColor(s.layer)}>L{s.layer}</Badge> },
                { key: 'category', label: 'Category', render: (s: SkillManifest) => <Badge>{s.category}</Badge> },
                { key: 'desc', label: 'Description', render: (s: SkillManifest) => <span className="text-xs text-text-secondary">{s.description}</span> },
                { key: 'scope', label: 'Scope', render: (s: SkillManifest) => <Badge color={s.scope === 'global' ? 'info' : 'default'}>{s.scope}</Badge> },
                { key: 'keys', label: 'Keys', render: (s: SkillManifest) => s.requires.env.length > 0 ? <Badge color="warning">{s.requires.env.length}</Badge> : <span className="text-xs text-text-muted">—</span> },
                { key: 'access', label: 'Access', render: (s: SkillManifest) => <span className="text-xs text-text-muted">{s.permissions.allowedRoles.includes('*') ? 'All' : s.permissions.allowedRoles.join(', ')}</span> },
                { key: 'status', label: 'Status', render: (s: SkillManifest) => <Badge color={statusColor(s.status || 'installed')} dot>{(s.status || 'installed').replace('_', ' ')}</Badge> },
              ]}
              data={filtered}
            />
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="mt-4">
            <div className="mb-4 rounded-lg bg-warning/5 border border-warning/20 px-4 py-3 text-sm text-warning">
              <div className="flex items-center gap-2 mb-1"><Lock size={14} /> API keys are stored as SecureString in SSM Parameter Store (KMS encrypted)</div>
              <p className="text-xs text-text-muted">Keys are injected as environment variables at microVM startup. Employees never see the actual key values.</p>
            </div>
            <Table
              columns={[
                { key: 'skill', label: 'Skill', render: (k: SkillApiKey) => <span className="font-medium">{k.skillName}</span> },
                { key: 'env', label: 'Env Variable', render: (k: SkillApiKey) => <code className="text-xs bg-dark-bg px-1.5 py-0.5 rounded text-primary-light">{k.envVar}</code> },
                { key: 'ssm', label: 'SSM Path', render: (k: SkillApiKey) => <span className="text-xs text-text-muted font-mono">{k.ssmPath}</span> },
                { key: 'status', label: 'Status', render: (k: SkillApiKey) => <Badge color={k.status === 'iam-role' ? 'success' : k.status === 'active' ? 'success' : 'warning'} dot>{k.status === 'iam-role' ? 'IAM Role' : k.status === 'not-configured' ? 'Needs Config' : k.status}</Badge> },
                { key: 'note', label: 'Note', render: (k: SkillApiKey) => <span className="text-xs text-text-muted">{(k as any).note || ''}</span> },
                { key: 'actions', label: '', render: () => <div className="flex gap-1"><Button variant="ghost" size="sm" disabled>Rotate</Button><Button variant="ghost" size="sm" disabled>Revoke</Button></div> },
              ]}
              data={apiKeys}
            />
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="mt-4">
            <p className="text-sm text-text-secondary mb-4">Role-based skill access matrix. Skills are filtered at microVM startup based on tenant role.</p>
            <div className="overflow-x-auto rounded-xl border border-dark-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-bg/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Skill</th>
                    {['engineering', 'sales', 'finance', 'product', 'hr', 'csm', 'legal', 'intern'].map(role => (
                      <th key={role} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {installed.map(s => (
                    <tr key={s.id || s.name} className="bg-dark-card hover:bg-dark-hover">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Badge color={layerColor(s.layer)}>L{s.layer}</Badge>
                          <span className="font-medium text-xs">{s.name}</span>
                        </div>
                      </td>
                      {['engineering', 'sales', 'finance', 'product', 'hr', 'csm', 'legal', 'intern'].map(role => {
                        const blocked = s.permissions.blockedRoles.includes(role);
                        const allowed = s.permissions.allowedRoles.includes('*') || s.permissions.allowedRoles.includes(role);
                        return (
                          <td key={role} className="px-3 py-2.5 text-center">
                            {allowed && !blocked ? <CheckCircle size={16} className="inline text-success" /> : <span className="inline-block h-4 w-4 rounded-full bg-dark-border" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Skill Detail Modal */}
      <Modal open={!!selectedSkill} onClose={() => setSelectedSkill(null)} title={selectedSkill?.name || ''} size="lg">
        {selectedSkill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-text-muted">Version</p><p className="text-sm font-medium">v{selectedSkill.version}</p></div>
              <div><p className="text-xs text-text-muted">Layer</p><Badge color={layerColor(selectedSkill.layer)}>Layer {selectedSkill.layer}</Badge></div>
              <div><p className="text-xs text-text-muted">Category</p><Badge>{selectedSkill.category}</Badge></div>
              <div><p className="text-xs text-text-muted">Scope</p><Badge color={selectedSkill.scope === 'global' ? 'info' : 'default'}>{selectedSkill.scope}</Badge></div>
              <div><p className="text-xs text-text-muted">Author</p><p className="text-sm">{selectedSkill.author}</p></div>
              <div><p className="text-xs text-text-muted">Status</p><Badge color={statusColor(selectedSkill.status || 'installed')} dot>{selectedSkill.status || 'installed'}</Badge></div>
              {selectedSkill.bundleSizeMB && <div><p className="text-xs text-text-muted">Bundle Size</p><p className="text-sm">{selectedSkill.bundleSizeMB} MB</p></div>}
              {selectedSkill.approvalRequired && <div><p className="text-xs text-text-muted">Approval</p><Badge color="warning">Required per use</Badge></div>}
            </div>
            <div><p className="text-xs text-text-muted mb-1">Description</p><p className="text-sm text-text-secondary">{selectedSkill.description}</p></div>
            {selectedSkill.approvalNote && (
              <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-xs text-warning">{selectedSkill.approvalNote}</div>
            )}
            {selectedSkill.requires.env.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2">Required Environment Variables</p>
                <div className="space-y-1">
                  {selectedSkill.requires.env.map(env => {
                    const key = apiKeys.find(k => k.skillName === selectedSkill.name && k.envVar === env);
                    return (
                      <div key={env} className="flex items-center justify-between rounded-lg bg-dark-bg px-3 py-2">
                        <code className="text-xs text-primary-light">{env}</code>
                        {key ? <Badge color="success" dot>Configured</Badge> : <Badge color="danger" dot>Missing</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted mb-2">Access Control</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-dark-bg px-3 py-2">
                  <p className="text-xs text-text-muted mb-1">Allowed Roles</p>
                  <div className="flex flex-wrap gap-1">{selectedSkill.permissions.allowedRoles.map(r => <Badge key={r} color="success">{r}</Badge>)}</div>
                </div>
                <div className="rounded-lg bg-dark-bg px-3 py-2">
                  <p className="text-xs text-text-muted mb-1">Blocked Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkill.permissions.blockedRoles.length > 0 ? selectedSkill.permissions.blockedRoles.map(r => <Badge key={r} color="danger">{r}</Badge>) : <span className="text-xs text-text-muted">None</span>}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-2">Manifest (skill.json)</p>
              <pre className="rounded-lg bg-dark-bg border border-dark-border p-3 text-xs text-text-secondary font-mono whitespace-pre-wrap">
{JSON.stringify({ name: selectedSkill.name, version: selectedSkill.version, description: selectedSkill.description, layer: selectedSkill.layer, category: selectedSkill.category, requires: selectedSkill.requires, permissions: selectedSkill.permissions }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Install Skill Modal */}
      <Modal open={showInstall} onClose={() => setShowInstall(false)} title="Add Skill" size="md"
        footer={<div className="flex justify-end gap-3"><Button variant="default" onClick={() => setShowInstall(false)}>Close</Button></div>}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm font-medium text-text-primary mb-2">Skill Installation Methods</p>
            <div className="space-y-3 text-sm text-text-secondary">
              <div>
                <p className="font-medium text-text-primary">Layer 1 — Docker Built-in</p>
                <p className="text-xs text-text-muted">Pre-installed in Docker image. Requires image rebuild via <code className="bg-dark-bg px-1 rounded">build-on-ec2.sh</code>. Currently: 13 skills.</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">Layer 2 — S3 Hot-Load</p>
                <p className="text-xs text-text-muted">Upload skill.json + tool.js to <code className="bg-dark-bg px-1 rounded">s3://_shared/skills/skill-name/</code>. Loaded at microVM startup. No npm deps.</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">Layer 3 — Pre-built Bundle</p>
                <p className="text-xs text-text-muted">For skills with npm dependencies. Requires CodeBuild pipeline (see Roadmap). Upload tar.gz to S3 skill-bundles/.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-muted">Current skills are managed via seed scripts and S3 upload. Self-service skill installation UI is planned for v1.1.</p>
        </div>
      </Modal>
    </div>
  );
}
