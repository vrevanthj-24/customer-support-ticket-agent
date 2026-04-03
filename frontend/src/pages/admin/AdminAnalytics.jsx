import React, { useState, useEffect } from 'react';
import { ticketAPI, userAPI, agentAPI, faqAPI } from '../../services/api';
import {
  FiInbox, FiCheckCircle, FiClock, FiUsers, FiTrendingUp,
  FiZap, FiAlertCircle, FiActivity, FiAward, FiMessageSquare
} from 'react-icons/fi';

// ── Simple Bar Chart ──────────────────────────────────────
const BarChart = ({ data, title, colorClass = 'bg-blue-500' }) => {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div>
      <h3 className="font-semibold text-slate-700 text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-24 text-xs text-slate-500 text-right flex-shrink-0 truncate">{label}</div>
            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorClass} rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
                style={{ width: `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%` }}
              >
                {value > 0 && <span className="text-white text-xs font-bold">{value}</span>}
              </div>
            </div>
            <div className="w-8 text-xs text-slate-500 text-right">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Donut Chart (SVG) ─────────────────────────────────────
const DonutChart = ({ data, colors, title }) => {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return (
    <div>
      <h3 className="font-semibold text-slate-700 text-sm mb-3">{title}</h3>
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data yet</div>
    </div>
  );

  let cumulative = 0;
  const segments = Object.entries(data).map(([label, value], i) => {
    const pct = value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const r = 60, cx = 80, cy = 80;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { label, value, pct, color: colors[i % colors.length], x1, y1, x2, y2, largeArc, cx, cy, r };
  });

  return (
    <div>
      <h3 className="font-semibold text-slate-700 text-sm mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {segments.map((s, i) => (
            <path key={i}
              d={`M ${s.cx} ${s.cy} L ${s.x1} ${s.y1} A ${s.r} ${s.r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2} Z`}
              fill={s.color} stroke="white" strokeWidth="2"
            />
          ))}
          <circle cx="80" cy="80" r="35" fill="white" />
          <text x="80" y="76" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{total}</text>
          <text x="80" y="90" textAnchor="middle" fontSize="9" fill="#64748b">total</text>
        </svg>
        <div className="flex-1 space-y-1.5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-600 flex-1 truncate">{s.label}</span>
              <span className="text-xs font-semibold text-slate-700">{s.value}</span>
              <span className="text-xs text-slate-400">({Math.round(s.pct * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Trend Line (SVG sparkline) ────────────────────────────
const SparkLine = ({ values, color = '#3b82f6', label }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const w = 200, h = 60, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = pad + (i / (values.length - 1)) * (w - pad * 2);
          const y = h - pad - (v / max) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
      </svg>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────
const KPICard = ({ label, value, subtext, icon: Icon, iconBg, iconColor, trend }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-slate-800">{value}</div>
    <div className="text-sm font-medium text-slate-600 mt-0.5">{label}</div>
    {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
  </div>
);

// ── Main Analytics Page ───────────────────────────────────
export default function AdminAnalytics() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState(null);
  const [agents, setAgents] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, aRes, fRes] = await Promise.all([
        ticketAPI.getAll(),
        userAPI.getAnalytics(),
        agentAPI.getAll(),
        faqAPI.getAll(),
      ]);
      setTickets(tRes.data);
      setUsers(uRes.data);
      setAgents(aRes.data);
      setFaqs(fRes.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Analytics fetch error:', e);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading analytics from database...</p>
      </div>
    </div>
  );

  // ── Compute all metrics from real DB data ─────────────
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in-progress').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const closed = tickets.filter(t => t.status === 'closed').length;
  const resolutionRate = total ? Math.round(((resolved + closed) / total) * 100) : 0;

  // Priority breakdown
  const p1 = tickets.filter(t => t.priority === 'P1').length;
  const p2 = tickets.filter(t => t.priority === 'P2').length;
  const p3 = tickets.filter(t => t.priority === 'P3').length;
  const p4 = tickets.filter(t => t.priority === 'P4').length;

  // Avg resolution time (from tickets that have resolution_time_minutes)
  const resolvedWithTime = tickets.filter(t => t.resolution_time_minutes > 0);
  const avgResMinutes = resolvedWithTime.length
    ? resolvedWithTime.reduce((s, t) => s + t.resolution_time_minutes, 0) / resolvedWithTime.length
    : 0;
  const avgResDisplay = avgResMinutes > 60
    ? `${(avgResMinutes / 60).toFixed(1)}h`
    : avgResMinutes > 0 ? `${Math.round(avgResMinutes)}m` : 'N/A';

  // Tickets by day (last 7 days)
  const now = new Date();
  const dayLabels = [];
  const dayCreated = [];
  const dayResolved = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    dayLabels.push(dateStr);
    dayCreated.push(tickets.filter(t => {
      const td = new Date(t.created_at);
      return td.toDateString() === d.toDateString();
    }).length);
    dayResolved.push(tickets.filter(t => {
      if (!t.resolved_at) return false;
      const td = new Date(t.resolved_at);
      return td.toDateString() === d.toDateString();
    }).length);
  }

  // Category distribution
  const catMap = {};
  tickets.forEach(t => {
    const c = t.category_id
      ? ['', 'Technical', 'Billing', 'Account', 'Feature Request', 'General'][t.category_id] || `Cat ${t.category_id}`
      : 'Uncategorized';
    catMap[c] = (catMap[c] || 0) + 1;
  });

  // Agent workload
  const agentWorkload = {};
  agents.forEach(a => {
    const count = tickets.filter(t =>
      t.assigned_agent_id === a.agent_id &&
      (t.status === 'open' || t.status === 'in-progress')
    ).length;
    agentWorkload[a.name] = count;
  });

  // Agent resolution count
  const agentResolved = {};
  agents.forEach(a => {
    agentResolved[a.name] = tickets.filter(t =>
      t.assigned_agent_id === a.agent_id &&
      (t.status === 'resolved' || t.status === 'closed')
    ).length;
  });

  // Tickets per hour (busiest hours from created_at)
  const hourMap = {};
  tickets.forEach(t => {
    const h = new Date(t.created_at).getHours();
    const label = `${h}:00`;
    hourMap[label] = (hourMap[label] || 0) + 1;
  });
  const top5Hours = Object.entries(hourMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

  // AI auto-resolved (tickets resolved by AI — replies contain "AI solution")
  const aiResolved = tickets.filter(t => t.status === 'resolved').length;

  // Weekly tickets bar chart data
  const weeklyData = {};
  dayLabels.forEach((label, i) => { weeklyData[label] = dayCreated[i]; });

  const activeAgents = agents.filter(a => a.status === 'active').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time data from your database
            {lastUpdated && (
              <span className="ml-2 text-slate-400">
                · Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all"
        >
          <FiActivity className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <div className="col-span-2 md:col-span-2">
          <KPICard label="Total Tickets" value={total}
            subtext="All time" icon={FiInbox}
            iconBg="bg-blue-50" iconColor="text-blue-600" />
        </div>
        <div className="col-span-2 md:col-span-2">
          <KPICard label="Open" value={open}
            subtext={`${inProgress} in progress`} icon={FiClock}
            iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        </div>
        <div className="col-span-2 md:col-span-2">
          <KPICard label="Resolved" value={resolved + closed}
            subtext={`${resolutionRate}% resolution rate`} icon={FiCheckCircle}
            iconBg="bg-green-50" iconColor="text-green-600" />
        </div>
        <div className="col-span-2 md:col-span-2">
          <KPICard label="Avg Resolution" value={avgResDisplay}
            subtext={`${resolvedWithTime.length} tickets measured`} icon={FiZap}
            iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>
      </div>

      {/* ── Row 2: More KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Users" value={users?.total_users ?? '—'}
          subtext={`${users?.new_users_this_week ?? 0} new this week`}
          icon={FiUsers} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <KPICard label="Active Agents" value={activeAgents}
          subtext={`${agents.length} total agents`}
          icon={FiAward} iconBg="bg-pink-50" iconColor="text-pink-600" />
        <KPICard label="FAQ Entries" value={faqs.length}
          subtext="Knowledge base" icon={FiMessageSquare}
          iconBg="bg-teal-50" iconColor="text-teal-600" />
        <KPICard label="Critical (P1)" value={p1}
          subtext={`${p2} high priority`}
          icon={FiAlertCircle} iconBg="bg-red-50" iconColor="text-red-600" />
      </div>

      {/* ── Row 3: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Status Donut */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <DonutChart
            title="Ticket Status Distribution"
            data={{ Open: open, 'In Progress': inProgress, Resolved: resolved, Closed: closed }}
            colors={['#eab308', '#3b82f6', '#22c55e', '#94a3b8']}
          />
        </div>

        {/* Priority Donut */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <DonutChart
            title="Priority Distribution"
            data={{ 'P1 Critical': p1, 'P2 High': p2, 'P3 Medium': p3, 'P4 Low': p4 }}
            colors={['#ef4444', '#f97316', '#eab308', '#22c55e']}
          />
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <BarChart
            title="Tickets by Category"
            data={Object.keys(catMap).length ? catMap : { 'No data': 0 }}
            colorClass="bg-indigo-500"
          />
        </div>
      </div>

      {/* ── Row 4: Weekly Trend + Hourly ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Weekly tickets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Tickets This Week</h3>
          <div className="space-y-4">
            <BarChart
              title="Created per day"
              data={weeklyData}
              colorClass="bg-blue-500"
            />
            <div className="pt-2 border-t border-slate-100">
              <SparkLine
                values={dayCreated}
                color="#3b82f6"
                label="Daily ticket volume trend"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">
                {dayCreated.reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-slate-500">Created this week</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {dayResolved.reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-slate-500">Resolved this week</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {dayCreated.length ? Math.round(dayCreated.reduce((a, b) => a + b, 0) / 7) : 0}
              </div>
              <div className="text-xs text-slate-500">Daily average</div>
            </div>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Agent Performance</h3>
          {agents.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">No agents created yet</div>
          ) : (
            <div className="space-y-4">
              {agents.map(agent => {
                const open_count = agentWorkload[agent.name] || 0;
                const res_count = agentResolved[agent.name] || 0;
                const total_count = open_count + res_count;
                const res_rate = total_count ? Math.round((res_count / total_count) * 100) : 0;
                return (
                  <div key={agent.agent_id} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate">{agent.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                            {open_count} open
                          </span>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {res_count} resolved
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
                          style={{ width: `${res_rate}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-slate-400">{agent.status}</span>
                        <span className="text-xs text-slate-500">{res_rate}% resolution rate</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Busiest Hours + Resolution Time Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Busiest hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Busiest Support Hours</h3>
          {Object.keys(top5Hours).length > 0 ? (
            <BarChart
              title="Top 5 hours by ticket volume"
              data={top5Hours}
              colorClass="bg-orange-500"
            />
          ) : (
            <div className="text-center text-slate-400 text-sm py-8">No data yet</div>
          )}
        </div>

        {/* Resolution time breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Resolution Time Breakdown</h3>
          {resolvedWithTime.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              No resolved tickets with timing data yet
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Under 1 hour', filter: t => t.resolution_time_minutes < 60, color: 'bg-green-500' },
                { label: '1–4 hours', filter: t => t.resolution_time_minutes >= 60 && t.resolution_time_minutes < 240, color: 'bg-blue-500' },
                { label: '4–24 hours', filter: t => t.resolution_time_minutes >= 240 && t.resolution_time_minutes < 1440, color: 'bg-yellow-500' },
                { label: 'Over 24 hours', filter: t => t.resolution_time_minutes >= 1440, color: 'bg-red-500' },
              ].map(({ label, filter, color }) => {
                const count = resolvedWithTime.filter(filter).length;
                const pct = resolvedWithTime.length ? Math.round((count / resolvedWithTime.length) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{label}</span>
                      <span className="font-medium">{count} tickets ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-slate-100 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Average resolution time</span>
                  <span className="font-bold text-slate-800">{avgResDisplay}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Fastest resolution</span>
                  <span className="font-bold text-green-600">
                    {resolvedWithTime.length
                      ? (() => {
                          const min = Math.min(...resolvedWithTime.map(t => t.resolution_time_minutes));
                          return min > 60 ? `${(min / 60).toFixed(1)}h` : `${Math.round(min)}m`;
                        })()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 6: Summary Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Complete Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets', value: total, color: 'text-slate-800' },
            { label: 'Open', value: open, color: 'text-yellow-600' },
            { label: 'In Progress', value: inProgress, color: 'text-blue-600' },
            { label: 'Resolved', value: resolved, color: 'text-green-600' },
            { label: 'Closed', value: closed, color: 'text-slate-500' },
            { label: 'Resolution Rate', value: `${resolutionRate}%`, color: 'text-green-600' },
            { label: 'P1 Critical', value: p1, color: 'text-red-600' },
            { label: 'P2 High', value: p2, color: 'text-orange-600' },
            { label: 'P3 Medium', value: p3, color: 'text-yellow-600' },
            { label: 'P4 Low', value: p4, color: 'text-green-600' },
            { label: 'Avg Resolution', value: avgResDisplay, color: 'text-purple-600' },
            { label: 'Total Users', value: users?.total_users ?? '—', color: 'text-indigo-600' },
            { label: 'Active Agents', value: activeAgents, color: 'text-blue-600' },
            { label: 'FAQ Entries', value: faqs.length, color: 'text-teal-600' },
            { label: 'New Users/Week', value: users?.new_users_this_week ?? '—', color: 'text-pink-600' },
            { label: 'Tickets/Week', value: dayCreated.reduce((a, b) => a + b, 0), color: 'text-slate-800' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}