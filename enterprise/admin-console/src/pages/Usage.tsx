import { useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Bot, AlertTriangle, Download, Calendar } from 'lucide-react';
import { Card, StatCard, Badge, Button, PageHeader, Table, Tabs } from '../components/ui';
import { useUsageSummary, useUsageByDepartment, useUsageByAgent, useUsageBudgets, useUsageTrend } from '../hooks/useApi';

const costTrendOpts: ApexOptions = {
  chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
  colors: ['#22c55e', '#6366f1'],
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
  grid: { borderColor: '#2e3039', strokeDashArray: 4 },
  xaxis: { categories: ['Mar 14', 'Mar 15', 'Mar 16', 'Mar 17', 'Mar 18', 'Mar 19', 'Mar 20'], labels: { style: { colors: '#64748b', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#64748b', fontSize: '12px' }, formatter: (v: number) => `$${v.toFixed(2)}` } },
  tooltip: { theme: 'dark' },
  legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#94a3b8' } },
  dataLabels: { enabled: false },
};

export default function Usage() {
  const { data: summary } = useUsageSummary();
  const { data: byDept = [] } = useUsageByDepartment();
  const { data: byAgent = [] } = useUsageByAgent();
  const { data: budgets = [] } = useUsageBudgets();
  const { data: trend = [] } = useUsageTrend();
  const [activeTab, setActiveTab] = useState('department');
  const [timeRange, setTimeRange] = useState('7d');

  const s = summary || { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, totalRequests: 0, tenantCount: 0, chatgptEquivalent: 5 };

  const deptBarOpts: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', stacked: true },
    colors: ['#6366f1', '#22c55e'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', horizontal: true } },
    grid: { borderColor: '#2e3039', strokeDashArray: 4 },
    xaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: string) => `${(Number(v) / 1000).toFixed(0)}k` }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '12px' } } },
    tooltip: { theme: 'dark' },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#94a3b8' } },
    dataLabels: { enabled: false },
  };

  return (
    <div>
      <PageHeader
        title="Usage & Cost"
        description="Token consumption, cost tracking, budget management, and multi-dimension analysis"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-dark-border overflow-hidden">
              {[
                { label: 'Today', value: '1d' },
                { label: '7 Days', value: '7d' },
                { label: '30 Days', value: '30d' },
                { label: 'MTD', value: 'mtd' },
              ].map(r => (
                <button key={r.value} onClick={() => setTimeRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${timeRange === r.value ? 'bg-primary text-white' : 'bg-dark-card text-text-muted hover:text-text-primary'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="default" size="sm" onClick={() => {
              const csv = ['Agent,Employee,Position,Requests,Input Tokens,Output Tokens,Cost', ...byAgent.map(a =>
                `"${a.agentName}","${a.employeeName}","${a.positionName}",${a.requests},${a.inputTokens},${a.outputTokens},${a.cost}`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `usage-export-${new Date().toISOString().slice(0,10)}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}><Download size={14} /> Export</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
        <StatCard title="Input Tokens" value={`${(s.totalInputTokens / 1000).toFixed(0)}k`} subtitle="Today" icon={<TrendingUp size={22} />} color="primary" />
        <StatCard title="Output Tokens" value={`${(s.totalOutputTokens / 1000).toFixed(0)}k`} subtitle="Today" icon={<TrendingDown size={22} />} color="info" />
        <StatCard title="Cost Today" value={`$${s.totalCost.toFixed(2)}`} subtitle={`${s.totalRequests} requests`} icon={<DollarSign size={22} />} color="success" />
        <StatCard title="Active Tenants" value={s.tenantCount} subtitle="With agents" icon={<Users size={22} />} color="cyan" />
        <StatCard title="vs ChatGPT" value={`$${s.chatgptEquivalent}/day`} subtitle={`Save $${(s.chatgptEquivalent - s.totalCost).toFixed(2)}/day`} icon={<DollarSign size={22} />} color="warning" />
      </div>

      {/* Cost trend chart */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">Cost Trend</h3>
        <p className="text-sm text-text-secondary mb-4">OpenClaw vs ChatGPT equivalent cost ({timeRange === '1d' ? 'Today' : timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Month to date'})</p>
        {(() => {
          const filtered = timeRange === '1d' ? trend.slice(-1) : timeRange === '7d' ? trend : trend;
          return (
            <Chart
              options={{...costTrendOpts, xaxis: { ...costTrendOpts.xaxis, categories: filtered.map(t => t.date.slice(5)) }}}
              series={[
                { name: 'OpenClaw Cost', data: filtered.map(t => t.openclawCost) },
                { name: 'ChatGPT Equivalent', data: filtered.map(t => t.chatgptEquivalent) },
              ]}
              type="area" height={280}
            />
          );
        })()}
      </Card>

      <Card>
        <Tabs
          tabs={[
            { id: 'department', label: 'By Department', count: byDept.length },
            { id: 'agent', label: 'By Agent', count: byAgent.length },
            { id: 'model', label: 'By Model' },
            { id: 'budget', label: 'Budget Management', count: budgets.filter(b => b.status !== 'ok').length || undefined },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-4">
          {activeTab === 'department' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <Chart
                  options={{...deptBarOpts, yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '12px' } } }}}
                  series={[
                    { name: 'Input Tokens', data: byDept.map(d => d.inputTokens) },
                    { name: 'Output Tokens', data: byDept.map(d => d.outputTokens) },
                  ]}
                  type="bar" height={byDept.length * 50 + 60}
                  categories={byDept.map(d => d.department)}
                />
              </div>
              <Table
                columns={[
                  { key: 'dept', label: 'Department', render: (d: typeof byDept[0]) => <span className="font-medium">{d.department}</span> },
                  { key: 'agents', label: 'Agents', render: (d: typeof byDept[0]) => d.agents },
                  { key: 'requests', label: 'Requests', render: (d: typeof byDept[0]) => d.requests },
                  { key: 'tokens', label: 'Tokens', render: (d: typeof byDept[0]) => `${((d.inputTokens + d.outputTokens) / 1000).toFixed(0)}k` },
                  { key: 'cost', label: 'Cost', render: (d: typeof byDept[0]) => `$${d.cost.toFixed(2)}` },
                  { key: 'share', label: 'Share', render: (d: typeof byDept[0]) => {
                    const pct = s.totalCost > 0 ? (d.cost / s.totalCost * 100).toFixed(0) : '0';
                    return <Badge color="info">{pct}%</Badge>;
                  }},
                ]}
                data={byDept}
              />
            </div>
          )}

          {activeTab === 'agent' && (
            <Table
              columns={[
                { key: 'agent', label: 'Agent', render: (a: typeof byAgent[0]) => (
                  <div><p className="font-medium">{a.agentName}</p><p className="text-xs text-text-muted">{a.employeeName}</p></div>
                )},
                { key: 'position', label: 'Position', render: (a: typeof byAgent[0]) => <Badge>{a.positionName}</Badge> },
                { key: 'requests', label: 'Requests', render: (a: typeof byAgent[0]) => a.requests },
                { key: 'input', label: 'Input', render: (a: typeof byAgent[0]) => `${(a.inputTokens / 1000).toFixed(1)}k` },
                { key: 'output', label: 'Output', render: (a: typeof byAgent[0]) => `${(a.outputTokens / 1000).toFixed(1)}k` },
                { key: 'cost', label: 'Cost', render: (a: typeof byAgent[0]) => `$${a.cost.toFixed(2)}` },
                { key: 'share', label: 'Share', render: (a: typeof byAgent[0]) => {
                  const pct = s.totalCost > 0 ? (a.cost / s.totalCost * 100).toFixed(1) : '0';
                  return <Badge color="info">{pct}%</Badge>;
                }},
              ]}
              data={byAgent}
            />
          )}

          {activeTab === 'model' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Token Distribution by Model</h3>
                <Chart
                  options={{
                    chart: { type: 'donut', background: 'transparent' },
                    colors: ['#22c55e', '#6366f1', '#f59e0b'],
                    labels: ['Nova 2 Lite', 'Claude Sonnet 4.5', 'Nova Pro'],
                    legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
                    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total Tokens', color: '#94a3b8', formatter: () => `${((s.totalInputTokens + s.totalOutputTokens) / 1000).toFixed(0)}k` } } } } },
                    dataLabels: { enabled: false },
                    tooltip: { theme: 'dark' },
                  }}
                  series={[
                    Math.round((s.totalInputTokens + s.totalOutputTokens) * 0.72),
                    Math.round((s.totalInputTokens + s.totalOutputTokens) * 0.18),
                    Math.round((s.totalInputTokens + s.totalOutputTokens) * 0.10),
                  ]}
                  type="donut" height={300}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Cost by Model</h3>
                <div className="space-y-4">
                  {[
                    { model: 'Nova 2 Lite', id: 'global.amazon.nova-2-lite-v1:0', requests: Math.round(s.totalRequests * 0.72), cost: s.totalCost * 0.45, inputRate: 0.30, outputRate: 2.50, color: '#22c55e', positions: 'Default (all positions)' },
                    { model: 'Claude Sonnet 4.5', id: 'global.anthropic.claude-sonnet-4-5', requests: Math.round(s.totalRequests * 0.18), cost: s.totalCost * 0.42, inputRate: 3.00, outputRate: 15.00, color: '#6366f1', positions: 'SA, SDE (override)' },
                    { model: 'Nova Pro', id: 'us.amazon.nova-pro-v1:0', requests: Math.round(s.totalRequests * 0.10), cost: s.totalCost * 0.13, inputRate: 0.80, outputRate: 3.20, color: '#f59e0b', positions: 'Finance, Legal (override)' },
                  ].map(m => (
                    <div key={m.model} className="rounded-lg bg-dark-bg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-sm font-medium">{m.model}</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: m.color }}>${m.cost.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-text-muted">
                        <div><span className="block text-text-secondary">{m.requests}</span>requests</div>
                        <div><span className="block text-text-secondary">${m.inputRate}/${m.outputRate}</span>per 1M tokens</div>
                        <div><span className="block text-text-secondary">{m.positions}</span>assigned to</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-success/5 border border-success/20 p-3 text-xs text-success">
                  💡 Nova 2 Lite handles 72% of requests at 45% of cost. Claude Sonnet 4.5 handles 18% of requests but accounts for 42% of cost due to higher per-token pricing.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div>
              <p className="text-sm text-text-secondary mb-4">Monthly budget tracking by department. Projected cost based on current daily usage × 30 days.</p>
              <Table
                columns={[
                  { key: 'dept', label: 'Department', render: (b: typeof budgets[0]) => <span className="font-medium">{b.department}</span> },
                  { key: 'budget', label: 'Monthly Budget', render: (b: typeof budgets[0]) => `$${b.budget.toFixed(0)}` },
                  { key: 'used', label: 'Used Today', render: (b: typeof budgets[0]) => `$${b.used.toFixed(2)}` },
                  { key: 'projected', label: 'Projected Monthly', render: (b: typeof budgets[0]) => `$${b.projected.toFixed(2)}` },
                  { key: 'utilization', label: 'Utilization', render: (b: typeof budgets[0]) => {
                    const pct = Math.round(b.projected / b.budget * 100);
                    return (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-dark-bg">
                          <div className={`h-full rounded-full ${pct > 100 ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{pct}%</span>
                      </div>
                    );
                  }},
                  { key: 'status', label: 'Status', render: (b: typeof budgets[0]) => (
                    <Badge color={b.status === 'ok' ? 'success' : b.status === 'warning' ? 'warning' : 'danger'} dot>
                      {b.status === 'ok' ? 'On track' : b.status === 'warning' ? 'Near limit' : 'Over budget'}
                    </Badge>
                  )},
                ]}
                data={budgets}
              />
              <div className="mt-4 rounded-lg bg-info/5 border border-info/20 p-3 text-xs text-info">
                Over-budget actions: Alert → Downgrade model (Sonnet→Nova) → Rate limit → Pause agent
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
