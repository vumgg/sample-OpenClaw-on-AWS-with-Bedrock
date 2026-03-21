import { useState, useEffect } from 'react';
import { FolderOpen, File, Lock, Edit3, User, ChevronRight, ChevronDown, Eye, GitCompare, Save, Globe, Briefcase, Bot, ArrowRight, Loader } from 'lucide-react';
import { Card, Badge, Button, PageHeader } from '../../components/ui';
import { useAgents, usePositions, useWorkspaceTree, useWorkspaceFile } from '../../hooks/useApi';
import { api } from '../../api/client';
import clsx from 'clsx';

interface WsFile {
  key: string; name: string; layer: 'global' | 'position' | 'personal';
  locked: boolean; size: number; lastModified?: string;
}

const layerColors: Record<string, { text: string; border: string; bg: string }> = {
  global: { text: 'text-text-muted', border: 'border-text-muted/30', bg: 'bg-dark-bg/30' },
  position: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/5' },
  personal: { text: 'text-success', border: 'border-success/30', bg: 'bg-success/5' },
};

function FileRow({ file, selected, onSelect }: { file: WsFile; selected: boolean; onSelect: () => void }) {
  const colors = layerColors[file.layer];
  return (
    <button
      onClick={onSelect}
      className={clsx('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        selected ? 'bg-primary/10 text-primary-light' : `hover:bg-dark-hover ${colors.text}`)}
    >
      <File size={14} />
      <span className="flex-1 text-left truncate">{file.name}</span>
      {file.locked ? <Lock size={11} className="text-text-muted shrink-0" /> : <Edit3 size={11} className="text-text-muted shrink-0" />}
      <span className="text-xs text-text-muted shrink-0">{file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}</span>
    </button>
  );
}

export default function Workspace() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: positions = [] } = usePositions();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedFileKey, setSelectedFileKey] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Set default agent when data loads
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].id);
    }
  }, [agents, selectedAgent]);

  const { data: wsTree, isLoading: treeLoading } = useWorkspaceTree(selectedAgent);

  const agent = agents.find(a => a.id === selectedAgent);
  const position = positions.find(p => p.id === agent?.positionId);

  // Build flat file list from workspace tree API response
  const allFiles: WsFile[] = [];
  if (wsTree) {
    const tree = wsTree as { global: { soul: { key: string; name: string; size: number; lastModified: string }[]; skills: { key: string; name: string; size: number; lastModified: string }[] }; position: { soul: { key: string; name: string; size: number; lastModified: string }[]; skills: { key: string; name: string; size: number; lastModified: string }[] }; personal: { files: { key: string; name: string; size: number; lastModified: string }[] } };
    for (const f of (tree.global?.soul || [])) {
      allFiles.push({ key: f.key, name: f.name, layer: 'global', locked: true, size: f.size, lastModified: f.lastModified });
    }
    for (const f of (tree.global?.skills || [])) {
      allFiles.push({ key: f.key, name: `skills/${f.name}`, layer: 'global', locked: true, size: f.size, lastModified: f.lastModified });
    }
    for (const f of (tree.position?.soul || [])) {
      allFiles.push({ key: f.key, name: f.name, layer: 'position', locked: false, size: f.size, lastModified: f.lastModified });
    }
    for (const f of (tree.position?.skills || [])) {
      allFiles.push({ key: f.key, name: `skills/${f.name}`, layer: 'position', locked: false, size: f.size, lastModified: f.lastModified });
    }
    for (const f of (tree.personal?.files || [])) {
      const isMemory = f.name.includes('MEMORY') || f.name.startsWith('memory/');
      allFiles.push({ key: f.key, name: f.name, layer: 'personal', locked: isMemory, size: f.size, lastModified: f.lastModified });
    }
  }

  const globalFiles = allFiles.filter(f => f.layer === 'global');
  const positionFiles = allFiles.filter(f => f.layer === 'position');
  const personalFiles = allFiles.filter(f => f.layer === 'personal');

  const handleSelectFile = async (file: WsFile) => {
    setSelectedFileKey(file.key);
    setShowDiff(false);
    setLoading(true);
    try {
      const resp = await api.get<{ key: string; content: string; size: number }>(`/workspace/file?key=${encodeURIComponent(file.key)}`);
      setFileContent(resp.content);
      setEditContent(resp.content);
    } catch {
      setFileContent('(Failed to load file)');
      setEditContent('');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedFileKey) return;
    setSaving(true);
    try {
      await api.put('/workspace/file', { key: selectedFileKey, content: editContent });
      setFileContent(editContent);
      setTimeout(() => setSaving(false), 1000);
    } catch {
      setSaving(false);
      // Error is shown by the API client (401 redirect, etc.)
    }
  };

  const handleAgentChange = (id: string) => {
    setSelectedAgent(id);
    setSelectedFileKey('');
    setFileContent('');
    setEditContent('');
  };

  const selectedFile = allFiles.find(f => f.key === selectedFileKey);

  return (
    <div>
      <PageHeader
        title="Workspace Manager"
        description="Inspect and edit the three-layer file system that composes each agent's runtime workspace"
        actions={
          <div className="flex gap-2">
            {selectedFile && (
              <Button variant="default" onClick={() => setShowDiff(!showDiff)}>
                <GitCompare size={16} /> {showDiff ? 'Editor' : 'Diff View'}
              </Button>
            )}
            <Button variant="primary" disabled={!selectedFile || selectedFile.locked || saving} onClick={handleSave}>
              <Save size={16} /> {saving ? '✓ Saved' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* Agent selector + inheritance chain */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Bot size={20} className="text-primary shrink-0" />
            {agentsLoading ? (
              <Loader size={16} className="animate-spin text-text-muted" />
            ) : (
              <select value={selectedAgent} onChange={e => handleAgentChange(e.target.value)}
                className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none appearance-none min-w-[280px]">
                <optgroup label="Personal Agents (1:1)">
                  {agents.filter(a => a.employeeId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.positionName})</option>)}
                </optgroup>
                <optgroup label="Shared Agents (N:1)">
                  {agents.filter(a => !a.employeeId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5"><Globe size={14} className="text-text-muted" /><span className="text-text-muted">Global ({globalFiles.length})</span></div>
            <ArrowRight size={14} className="text-text-muted" />
            <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-primary" /><span className="text-primary">{position?.name || '?'} ({positionFiles.length})</span></div>
            <ArrowRight size={14} className="text-text-muted" />
            <div className="flex items-center gap-1.5"><User size={14} className="text-success" /><span className="text-success">{agent?.employeeName || 'Shared'} ({personalFiles.length})</span></div>
            <span className="text-text-muted">=</span>
            <Badge color="info">{allFiles.length} files</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4" style={{ minHeight: '600px' }}>
        {/* File tree */}
        <Card className="lg:col-span-1 overflow-y-auto max-h-[700px]">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Workspace Explorer</h3>

          {treeLoading ? (
            <div className="flex items-center justify-center py-8"><Loader size={20} className="animate-spin text-text-muted" /></div>
          ) : (
            <div className="space-y-4">
              {/* Global */}
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 px-2">🔒 Global</p>
                <div className="space-y-0.5">
                  {globalFiles.map(f => (
                    <FileRow key={f.key} file={f} selected={selectedFileKey === f.key} onSelect={() => handleSelectFile(f)} />
                  ))}
                  {globalFiles.length === 0 && <p className="text-xs text-text-muted px-3 py-2">No global files</p>}
                </div>
              </div>

              {/* Position */}
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1 px-2">📋 Position: {position?.name || '?'}</p>
                <div className="space-y-0.5">
                  {positionFiles.map(f => (
                    <FileRow key={f.key} file={f} selected={selectedFileKey === f.key} onSelect={() => handleSelectFile(f)} />
                  ))}
                  {positionFiles.length === 0 && <p className="text-xs text-text-muted px-3 py-2">No position files</p>}
                </div>
              </div>

              {/* Personal */}
              <div>
                <p className="text-xs font-medium text-success uppercase tracking-wider mb-1 px-2">👤 Personal: {agent?.employeeName || 'Shared'}</p>
                <div className="space-y-0.5">
                  {personalFiles.map(f => (
                    <FileRow key={f.key} file={f} selected={selectedFileKey === f.key} onSelect={() => handleSelectFile(f)} />
                  ))}
                  {personalFiles.length === 0 && <p className="text-xs text-text-muted px-3 py-2">No personal files</p>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-dark-border space-y-1.5 text-xs text-text-muted">
            <div className="flex items-center gap-1.5"><Lock size={11} /> Read-only (IT locked or system-generated)</div>
            <div className="flex items-center gap-1.5"><Edit3 size={11} /> Editable (position admin or employee)</div>
          </div>
        </Card>

        {/* File editor / viewer */}
        <Card className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-primary" /></div>
          ) : selectedFile && fileContent ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <File size={18} className={layerColors[selectedFile.layer].text} />
                  <h3 className="text-lg font-semibold text-text-primary">{selectedFile.name}</h3>
                  <Badge color={selectedFile.layer === 'global' ? 'default' : selectedFile.layer === 'position' ? 'primary' : 'success'}>
                    {selectedFile.layer}
                  </Badge>
                  {selectedFile.locked && <Badge color="warning">🔒 Read-only</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{selectedFile.size > 1024 ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `${selectedFile.size} B`}</span>
                  {selectedFile.lastModified && <span>{new Date(selectedFile.lastModified).toLocaleString()}</span>}
                </div>
              </div>

              {selectedFile.locked ? (
                <pre className={`rounded-lg ${layerColors[selectedFile.layer].bg} border-l-2 ${layerColors[selectedFile.layer].border} p-4 text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed min-h-[450px] max-h-[550px] overflow-y-auto`}>
                  {fileContent}
                </pre>
              ) : (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className={`w-full rounded-lg ${layerColors[selectedFile.layer].bg} border-l-2 ${layerColors[selectedFile.layer].border} border border-dark-border p-4 text-sm text-text-primary font-mono leading-relaxed min-h-[450px] max-h-[550px] focus:border-primary focus:outline-none resize-none`}
                />
              )}

              <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between text-xs text-text-muted">
                <span className="font-mono">s3://{selectedFile.key}</span>
                <span>{fileContent.split('\n').length} lines · {fileContent.length} chars</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-muted py-20">
              <FolderOpen size={48} className="mb-4 opacity-30" />
              <p className="text-lg mb-2">Select a file from the explorer</p>
              <p className="text-sm">Files are read from S3 in real-time. Click any file to view its content.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
