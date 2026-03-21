import { useState } from 'react';
import { BookOpen, Search, FolderOpen, Globe, Building2, FileText, Plus, Eye } from 'lucide-react';
import { Card, StatCard, Badge, Button, PageHeader, Table, Modal, Input, Select, Tabs, Textarea } from '../../components/ui';
import { useKnowledgeBases, useUploadKnowledgeDoc } from '../../hooks/useApi';
import type { KnowledgeBaseItem } from '../../hooks/useApi';
import { api } from '../../api/client';

export default function KnowledgeBase_() {
  const { data: kbs = [], isLoading } = useKnowledgeBases();
  const uploadMut = useUploadKnowledgeDoc();
  const [activeTab, setActiveTab] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFile, setShowFile] = useState<{ name: string; content: string } | null>(null);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [uploadKbId, setUploadKbId] = useState('');
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadContent, setUploadContent] = useState('');

  const globalKBs = kbs.filter(kb => kb.scope === 'global');
  const deptKBs = kbs.filter(kb => kb.scope === 'department');
  const totalDocs = kbs.reduce((s, kb) => s + kb.docCount, 0);
  const totalSize = kbs.reduce((s, kb) => s + (kb.sizeBytes || 0), 0);

  const tabData: Record<string, KnowledgeBaseItem[]> = { all: kbs, global: globalKBs, department: deptKBs };

  const handleSearch = async () => {
    setSearched(true);
    try {
      const resp = await api.get<any[]>(`/knowledge/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(resp);
    } catch { setSearchResults([]); }
  };

  const handleViewFile = async (key: string, name: string) => {
    try {
      const resp = await api.get<{ content: string }>(`/workspace/file?key=${encodeURIComponent(key)}`);
      setShowFile({ name, content: resp.content });
    } catch { setShowFile({ name, content: 'Failed to load file' }); }
  };

  const handleUpload = () => {
    if (uploadKbId && uploadFilename && uploadContent) {
      uploadMut.mutate({ kbId: uploadKbId, filename: uploadFilename, content: uploadContent }, {
        onSuccess: () => { setShowUpload(false); setUploadKbId(''); setUploadFilename(''); setUploadContent(''); },
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Markdown documents in S3 — synced to agent workspace/knowledge/ at runtime"
        actions={
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setShowSearch(true)}><Search size={16} /> Search</Button>
            <Button variant="primary" onClick={() => setShowUpload(true)}><Plus size={16} /> New Document</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Knowledge Bases" value={kbs.length} icon={<BookOpen size={22} />} color="primary" />
        <StatCard title="Documents" value={totalDocs} icon={<FileText size={22} />} color="info" />
        <StatCard title="Total Size" value={totalSize > 0 ? `${(totalSize / 1024).toFixed(1)} KB` : '0'} icon={<FolderOpen size={22} />} color="success" />
        <StatCard title="Format" value="Markdown" icon={<FileText size={22} />} color="cyan" />
      </div>

      <Card className="mb-6">
        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: kbs.length },
            { id: 'global', label: 'Organization', count: globalKBs.length },
            { id: 'department', label: 'Department', count: deptKBs.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="mt-4">
          <Table
            columns={[
              { key: 'name', label: 'Knowledge Base', render: (kb: KnowledgeBaseItem) => (
                <button onClick={() => setSelectedKb(kb)} className="flex items-center gap-2 text-primary-light hover:underline">
                  {kb.scope === 'global' ? <Globe size={14} /> : <Building2 size={14} />}
                  <div><p className="font-medium text-left">{kb.name}</p><p className="text-xs text-text-muted">{kb.scopeName}</p></div>
                </button>
              )},
              { key: 'docs', label: 'Documents', render: (kb: KnowledgeBaseItem) => kb.docCount },
              { key: 'size', label: 'Size', render: (kb: KnowledgeBaseItem) => kb.sizeBytes > 0 ? `${(kb.sizeBytes / 1024).toFixed(1)} KB` : '—' },
              { key: 'status', label: 'Status', render: (kb: KnowledgeBaseItem) => (
                <Badge color={kb.status === 'indexed' ? 'success' : 'warning'} dot>{kb.status}</Badge>
              )},
              { key: 'access', label: 'Access', render: (kb: KnowledgeBaseItem) => <span className="text-xs text-text-muted">{kb.accessibleBy}</span> },
            ]}
            data={tabData[activeTab] || []}
          />
        </div>
      </Card>

      {/* KB Detail Drawer */}
      {selectedKb && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{selectedKb.name}</h3>
              <p className="text-sm text-text-muted">{selectedKb.scopeName} · {selectedKb.docCount} documents · S3: {selectedKb.s3Prefix}</p>
            </div>
            <Button variant="default" size="sm" onClick={() => setSelectedKb(null)}>Close</Button>
          </div>
          <div className="space-y-2">
            {(selectedKb.files || []).map(f => (
              <div key={f.key} className="flex items-center justify-between rounded-lg bg-dark-bg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-text-muted" />
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="text-xs text-text-muted">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleViewFile(f.key, f.name)}><Eye size={14} /> View</Button>
              </div>
            ))}
            {(!selectedKb.files || selectedKb.files.length === 0) && (
              <p className="text-sm text-text-muted text-center py-4">No documents yet</p>
            )}
          </div>
        </Card>
      )}

      {/* File Viewer */}
      <Modal open={!!showFile} onClose={() => setShowFile(null)} title={showFile?.name || ''} size="lg">
        {showFile && (
          <pre className="rounded-lg bg-dark-bg border border-dark-border p-4 text-sm text-text-secondary whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto">
            {showFile.content}
          </pre>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="New Knowledge Document" size="md"
        footer={<div className="flex justify-end gap-3">
          <Button variant="default" onClick={() => setShowUpload(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpload} disabled={!uploadKbId || !uploadFilename || !uploadContent || uploadMut.isPending}>
            {uploadMut.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </div>}
      >
        <div className="space-y-4">
          <Select label="Knowledge Base" value={uploadKbId} onChange={setUploadKbId}
            options={kbs.map(kb => ({ label: `${kb.name} (${kb.scopeName})`, value: kb.id }))}
            placeholder="Select target knowledge base" />
          <Input label="Filename" value={uploadFilename} onChange={setUploadFilename}
            placeholder="e.g. api-guidelines.md" description="Must end with .md" />
          <Textarea label="Content (Markdown)" value={uploadContent} onChange={setUploadContent}
            rows={12} placeholder="# Document Title&#10;&#10;Write your knowledge document in Markdown format..." />
        </div>
      </Modal>

      {/* Search Modal */}
      <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearched(false); setSearchQuery(''); setSearchResults([]); }} title="Knowledge Search" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Full-text search across all knowledge documents in S3</p>
          <div className="flex gap-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchQuery && handleSearch()}
              placeholder="Enter search query..."
              className="flex-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
            <Button variant="primary" onClick={handleSearch} disabled={!searchQuery}><Search size={16} /> Search</Button>
          </div>
          {searched && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">{searchResults.length} results found</p>
              {searchResults.map((r, i) => (
                <div key={i} className="rounded-lg bg-dark-bg border border-dark-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{r.doc}</span>
                      <Badge>{r.kbName}</Badge>
                    </div>
                    <Badge color={r.score > 0.9 ? 'success' : r.score > 0.8 ? 'info' : 'warning'}>Score: {r.score}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{r.snippet}</p>
                </div>
              ))}
              {searchResults.length === 0 && <p className="text-sm text-text-muted text-center py-4">No matches found</p>}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
