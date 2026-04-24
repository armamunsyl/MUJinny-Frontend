'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    Users, LayoutGrid, GraduationCap, BarChart2,
    Bell, Search, ChevronDown, LogOut,
    Filter, Download, Zap, CalendarDays,
    RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const fmt = (n) => Number(n || 0).toLocaleString();

const NAVY = '#1d2b6b';
const BLUE = '#2f6fed';
const WHITE = '#ffffff';
const BG = '#f4f6fb';
const BORDER = '#e8edf5';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const SUB = '#94a3b8';

const AVATAR_COLORS = [
    '#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b',
    '#06b6d4','#ec4899','#22c55e','#a855f7','#f97316',
];
function avatarColor(s = '') {
    let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function Avatar({ name, email, size = 36 }) {
    const init = (name && name !== 'Unknown')
        ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : (email || '?')[0].toUpperCase();
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(email || name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {init}
        </div>
    );
}

function timeAgo(date) {
    if (!date) return 'Never';
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isActive(lastActive) {
    if (!lastActive) return false;
    return (Date.now() - new Date(lastActive)) < 7 * 24 * 3600 * 1000;
}

// 242115194 → 242-115-194
const fmtId = (id) => {
    if (!id) return '—';
    return String(id).replace(/(\d{3})(?=\d)/g, '$1-');
};

const CHART_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#22c55e'];

function DonutChart({ data, valueKey, labelKey, title, unit = '' }) {
    const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
    if (!total) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: MUTED, fontSize: 12 }}>No data yet</div>
    );
    const cx = 80, cy = 80, R = 65, r = 38;
    let angle = -Math.PI / 2;
    const slices = data.map((d, i) => {
        const val = d[valueKey] || 0;
        const sweep = (val / total) * 2 * Math.PI;
        const x1 = cx + R * Math.cos(angle);
        const y1 = cy + R * Math.sin(angle);
        angle += sweep;
        const x2 = cx + R * Math.cos(angle);
        const y2 = cy + R * Math.sin(angle);
        const ix1 = cx + r * Math.cos(angle);
        const iy1 = cy + r * Math.sin(angle);
        const ix2 = cx + r * Math.cos(angle - sweep);
        const iy2 = cy + r * Math.sin(angle - sweep);
        const lg = sweep > Math.PI ? 1 : 0;
        const path = `M${x1} ${y1} A${R} ${R} 0 ${lg} 1 ${x2} ${y2} L${ix1} ${iy1} A${r} ${r} 0 ${lg} 0 ${ix2} ${iy2}Z`;
        return { path, color: CHART_COLORS[i % CHART_COLORS.length], label: d[labelKey], val, pct: Math.round((val / total) * 100) };
    });
    return (
        <div>
            <svg viewBox="0 0 160 160" width={160} height={160} style={{ display: 'block', margin: '0 auto' }}>
                {slices.map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} opacity={0.88} style={{ transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.88'}>
                        <title>Batch {s.label}: {unit}{fmt(s.val)} ({s.pct}%)</title>
                    </path>
                ))}
                <text x={cx} y={cy - 7} textAnchor="middle" fontSize={16} fontWeight={700} fill={TEXT}>{data.length}</text>
                <text x={cx} y={cx + 10} textAnchor="middle" fontSize={9} fill={MUTED}>{title}</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {slices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: TEXT, flex: 1 }}>Batch {s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: BLUE }}>{unit}{fmt(s.val)}</span>
                        <span style={{ fontSize: 10, color: MUTED, background: '#f1f5f9', borderRadius: 99, padding: '1px 6px', minWidth: 32, textAlign: 'center' }}>{s.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ active }) {
    return (
        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: active ? '#d1fae5' : '#fee2e2', color: active ? '#059669' : '#dc2626' }}>
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function RoleBadge({ role }) {
    const isAdmin = role?.toLowerCase() === 'admin';
    return (
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: isAdmin ? '#ede9fe' : '#f1f5f9', color: isAdmin ? '#7c3aed' : MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {role || 'student'}
        </span>
    );
}

function IconBtn({ icon: Icon, color = MUTED, title, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button title={title} onClick={onClick}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${hover ? color : BORDER}`, background: hover ? color + '14' : WHITE, color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s' }}>
            <Icon size={12} />
        </button>
    );
}

function UserModal({ user, onClose }) {
    if (!user) return null;
    const active = isActive(user.lastActive);
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ background: NAVY, padding: '24px 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Avatar name={user.name} email={user.email} size={52} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{user.name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <StatusBadge active={active} />
                        <RoleBadge role={user.role} />
                    </div>
                </div>

                {/* Details grid */}
                <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                    {[
                        { label: 'Student ID', value: fmtId(user.studentId) },
                        { label: 'Batch', value: user.batch || '—' },
                        { label: 'Section', value: user.sec || '—' },
                        { label: 'Gender', value: user.gender || '—' },
                        { label: 'Plan', value: user.plan || 'free' },
                        { label: 'Last Active', value: timeAgo(user.lastActive) },
                        { label: 'Joined', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
                        { label: 'Firebase UID', value: user.firebaseUid ? user.firebaseUid.slice(0, 16) + '…' : '—' },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Token usage highlight */}
                <div style={{ margin: '0 24px 20px', background: BLUE + '10', border: `1px solid ${BLUE}30`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: BLUE, marginBottom: 2 }}>Total Tokens Used</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: BLUE }}>{fmt(user.tokens || 0)}</div>
                    </div>
                    <Zap size={28} color={BLUE} style={{ opacity: 0.4 }} />
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 22px', borderRadius: 8, border: `1px solid ${BORDER}`, background: WHITE, color: TEXT, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const NAV = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid },
    { id: 'users', label: 'Users', Icon: Users },
    { id: 'batches', label: 'Batches', Icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
];

export default function AdminPage() {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('users');
    const [subTab, setSubTab] = useState('members');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'tokens', dir: 'desc' });
    const [selectedUser, setSelectedUser] = useState(null);
    const tokenRef = useRef(null);

    const loadData = async (firebaseUser, showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const token = await firebaseUser.getIdToken();
            tokenRef.current = token;
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, { headers }),
                fetch(`${API_URL}/api/admin/users`, { headers }),
            ]);

            if (statsRes.status === 403) { router.replace('/admin/login'); return; }

            const [statsData, usersData] = await Promise.all([
                statsRes.json(),
                usersRes.json(),
            ]);

            setStats(statsData);
            // Use totalTokens field stored directly on User document
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch {
            router.replace('/admin/login');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) { router.replace('/admin/login'); return; }
            loadData(u);
        });
        return () => unsub();
    }, [router]);

    const filtered = useMemo(() => {
        const list = subTab === 'admins'
            ? users.filter(u => u.role?.toLowerCase() === 'admin')
            : users;
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            String(u.studentId).includes(q) ||
            String(u.batch).includes(q)
        );
    }, [users, search, subTab]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const va = a[sort.key] ?? '', vb = b[sort.key] ?? '';
            if (typeof va === 'number') return sort.dir === 'asc' ? va - vb : vb - va;
            return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
    }, [filtered, sort]);

    const toggleSort = (k) => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }));

    if (loading) return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: '-apple-system, sans-serif' }}>
            <span style={{ color: MUTED, fontSize: 13 }}>Loading dashboard...</span>
        </div>
    );

    const TH = ({ children, k, align = 'left' }) => (
        <th onClick={k ? () => toggleSort(k) : undefined}
            style={{ padding: '10px 14px', textAlign: align, fontSize: 11, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${BORDER}`, cursor: k ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap', background: '#fafbff' }}>
            {children}{k && <span style={{ marginLeft: 3, fontSize: 10, color: sort.key === k ? BLUE : '#cbd5e1' }}>{sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
        </th>
    );

    const activeCount = users.filter(u => isActive(u.lastActive)).length;
    const adminCount = users.filter(u => u.role?.toLowerCase() === 'admin').length;

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden' }}>

            {/* ── Sidebar ── */}
            <aside style={{ width: 220, background: NAVY, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="/MUJinny-Logo.png" alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>MUJinny</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Admin Panel</div>
                    </div>
                </div>
                <nav style={{ flex: 1, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', padding: '10px 8px 6px', textTransform: 'uppercase' }}>Main Menu</div>
                    {NAV.map(({ id, label, Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button key={id} onClick={() => setActiveTab(id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.13)' : 'transparent', color: active ? WHITE : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: active ? 600 : 400, marginBottom: 1, textAlign: 'left', transition: 'all 0.12s', borderLeft: active ? `3px solid ${WHITE}` : '3px solid transparent' }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}>
                                <Icon size={14} style={{ flexShrink: 0 }} />
                                {label}
                            </button>
                        );
                    })}
                </nav>
                <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={async () => { await signOut(auth); router.replace('/admin/login'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'left', transition: 'all 0.12s', borderLeft: '3px solid transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
                        <LogOut size={14} style={{ flexShrink: 0 }} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Right ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <header style={{ background: NAVY, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ flex: 1, position: 'relative', maxWidth: 380 }}>
                        <Search size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Search members..." value={search}
                            onChange={e => { setSearch(e.target.value); setActiveTab('users'); }}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px 6px 30px', fontSize: 12, color: WHITE, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => { const u = auth.currentUser; if (u) loadData(u, true); }}
                            title="Refresh data"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', padding: 4 }}>
                            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                        <div style={{ position: 'relative' }}>
                            <Bell size={16} color="rgba(255,255,255,0.5)" style={{ cursor: 'pointer' }} />
                            <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', border: '1.5px solid ' + NAVY }} />
                        </div>
                        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src="/MUJinny-Logo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: WHITE, lineHeight: 1.2 }}>Admin</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>MUJinny</div>
                            </div>
                            <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', background: BG, padding: 22 }}>

                    {/* ── OVERVIEW ── */}
                    {activeTab === 'overview' && stats && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                                {[
                                    { label: 'Total Users', value: fmt(stats.totalUsers), sub: `${activeCount} active this week`, Icon: Users, color: BLUE },
                                    { label: 'Total Tokens', value: fmt(stats.totalTokens), sub: 'all time', Icon: Zap, color: '#f59e0b' },
                                    { label: 'Today Tokens', value: fmt(stats.todayTokens), sub: 'logged-in users', Icon: CalendarDays, color: '#10b981' },
                                    { label: 'Active Batches', value: stats.batchAnalytics?.length || 0, sub: `${adminCount} admin(s)`, Icon: GraduationCap, color: '#8b5cf6' },
                                ].map(({ label, value, sub, Icon, color }, i) => (
                                    <div key={i} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>{label}</span>
                                            <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon size={15} color={color} />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</div>
                                        <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>{sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 16 }}>Daily Token Usage — Last 14 Days</div>
                                    {(() => {
                                        const data = stats.dailyUsage || [];
                                        const max = Math.max(...data.map(d => d.tokens || 0), 1);
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110 }}>
                                                {data.map((d, i) => (
                                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                                        <div title={`${d.date}: ${fmt(d.tokens)}`} style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.tokens ? BLUE : '#e8edf5', height: `${Math.max(((d.tokens || 0) / max) * 90, d.tokens ? 4 : 2)}px`, transition: 'height 0.4s' }} />
                                                        <span style={{ fontSize: 8, color: SUB, transform: 'rotate(45deg)', transformOrigin: 'left', whiteSpace: 'nowrap' }}>{d.date?.slice(5)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 16 }}>Token Usage by Model</div>
                                    {(() => {
                                        const data = stats.modelBreakdown || [];
                                        const max = Math.max(...data.map(d => d.tokens || 0), 1);
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {data.map((d, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ width: 72, textAlign: 'right', fontSize: 11, color: MUTED, flexShrink: 0 }}>{d.model}</span>
                                                        <div style={{ flex: 1, height: 8, background: '#e8edf5', borderRadius: 99 }}>
                                                            <div style={{ height: 8, borderRadius: 99, background: BLUE, width: `${((d.tokens || 0) / max) * 100}%` }} />
                                                        </div>
                                                        <span style={{ width: 56, textAlign: 'right', fontSize: 11, color: MUTED, flexShrink: 0 }}>{fmt(d.tokens)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Top users preview */}
                            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Top Users by Token Usage</span>
                                    <button onClick={() => setActiveTab('users')} style={{ background: 'none', border: 'none', color: BLUE, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>View all →</button>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {['Photo','Name','Email','Batch','Last Active','Tokens Used'].map((h, i) => (
                                                <th key={i} style={{ padding: '9px 14px', textAlign: i === 5 ? 'right' : 'left', fontSize: 11, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${BORDER}`, background: '#fafbff' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...users].sort((a,b) => (b.tokens||0)-(a.tokens||0)).slice(0,5).map((u, i) => (
                                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background='#f8faff'} onMouseLeave={e => e.currentTarget.style.background=WHITE}>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}><Avatar name={u.name} email={u.email} size={32} /></td>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontWeight: 500, color: TEXT }}>{u.name || '—'}</td>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: MUTED, fontSize: 12 }}>{u.email}</td>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: BLUE, fontWeight: 600, fontSize: 12 }}>{u.batch || '—'}</td>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: MUTED, fontSize: 12 }}>{timeAgo(u.lastActive)}</td>
                                                <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700, color: BLUE }}>{fmt(u.tokens)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── USERS ── */}
                    {activeTab === 'users' && (
                        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                            {/* Sub-tabs */}
                            <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex' }}>
                                    {[
                                        { id: 'members', label: 'Members', count: users.filter(u => u.role?.toLowerCase() !== 'admin').length },
                                        { id: 'admins', label: 'Admins', count: adminCount },
                                    ].map(t => (
                                        <button key={t.id} onClick={() => setSubTab(t.id)}
                                            style={{ padding: '13px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: subTab === t.id ? 600 : 400, color: subTab === t.id ? TEXT : MUTED, borderBottom: subTab === t.id ? `2px solid ${BLUE}` : '2px solid transparent', marginBottom: -1, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 7 }}>
                                            {t.label}
                                            <span style={{ fontSize: 10, fontWeight: 600, background: subTab === t.id ? BLUE+'18' : '#f1f5f9', color: subTab === t.id ? BLUE : MUTED, borderRadius: 99, padding: '1px 7px' }}>{t.count}</span>
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: MUTED }}>
                                    Total: <b style={{ color: TEXT }}>{fmt(users.length)}</b>
                                    <span style={{ marginLeft: 10 }}>Active: <b style={{ color: '#059669' }}>{activeCount}</b></span>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, flex: 1 }}>
                                    {subTab === 'admins' ? 'Admins' : 'Members'}
                                    <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: MUTED }}>({sorted.length})</span>
                                </h2>
                                <div style={{ position: 'relative' }}>
                                    <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                                        style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: '6px 10px 6px 26px', fontSize: 12, color: TEXT, outline: 'none', width: 180 }} />
                                </div>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: TEXT, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                    <Download size={12} /> Export
                                </button>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 7, border: 'none', background: BLUE, color: WHITE, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    <Filter size={12} /> Filter
                                </button>
                            </div>

                            {/* Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            <TH>Photo</TH>
                                            <TH k="name">Member name</TH>
                                            <TH k="studentId">Student ID</TH>
                                            <TH k="email">Email</TH>
                                            <TH k="batch">Batch</TH>
                                            <TH>Role</TH>
                                            <TH k="lastActive">Last Active</TH>
                                            <TH>Status</TH>
                                            <TH k="tokens" align="right">Tokens Used</TH>
                                            <TH align="center">Action</TH>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((u, i) => {
                                            const active = isActive(u.lastActive);
                                            return (
                                                <tr key={u._id || i}
                                                    style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                                                        <Avatar name={u.name} email={u.email} size={34} />
                                                    </td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                                                        <div style={{ fontWeight: 500, color: TEXT, whiteSpace: 'nowrap' }}>{u.name || '—'}</div>
                                                        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Sec {u.sec || '—'} · {u.gender || '—'}</div>
                                                    </td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', color: MUTED, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{fmtId(u.studentId)}</td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', color: MUTED, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', color: BLUE, fontWeight: 600, fontSize: 13 }}>{u.batch || '—'}</td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                                                        <RoleBadge role={u.role} />
                                                    </td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', color: MUTED, fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(u.lastActive)}</td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                                                        <StatusBadge active={active} />
                                                    </td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700, color: BLUE, fontSize: 13 }}>{fmt(u.tokens)}</td>
                                                    <td style={{ padding: '9px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                        <button onClick={() => setSelectedUser(u)}
                                                            style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${BLUE}40`, background: BLUE + '10', color: BLUE, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = WHITE; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = BLUE + '10'; e.currentTarget.style.color = BLUE; }}>
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sorted.length === 0 && (
                                            <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: MUTED, fontSize: 13 }}>No members found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── BATCHES ── */}
                    {activeTab === 'batches' && stats && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                                {(stats.batchAnalytics || []).map((b, i) => (
                                    <div key={i} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: BLUE }}>Batch {b.batch || '—'}</span>
                                            <span style={{ fontSize: 11, color: MUTED }}>{b.userCount} users</span>
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{fmt(b.tokens)}</div>
                                        <div style={{ fontSize: 10, color: MUTED, marginTop: 2, marginBottom: 12 }}>tokens used</div>
                                        <div style={{ height: 4, background: '#e8edf5', borderRadius: 99 }}>
                                            <div style={{ height: 4, borderRadius: 99, background: BLUE, width: `${((b.tokens || 0) / Math.max(...(stats.batchAnalytics || []).map(x => x.tokens || 0), 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Batchwise Breakdown</span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {['Batch','Users','Tokens Used','Avg / User','Status'].map((h, i) => (
                                                <th key={i} style={{ padding: '10px 14px', textAlign: i > 0 ? 'right' : 'left', fontSize: 11, fontWeight: 500, color: MUTED, borderBottom: `1px solid ${BORDER}`, background: '#fafbff' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(stats.batchAnalytics || []).map((b, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                onMouseLeave={e => e.currentTarget.style.background = WHITE}>
                                                <td style={{ padding: '11px 14px', fontWeight: 600, color: BLUE }}>Batch {b.batch || '—'}</td>
                                                <td style={{ padding: '11px 14px', textAlign: 'right', color: TEXT }}>{b.userCount}</td>
                                                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: BLUE }}>{fmt(b.tokens)}</td>
                                                <td style={{ padding: '11px 14px', textAlign: 'right', color: MUTED }}>{fmt(Math.round((b.tokens || 0) / (b.userCount || 1)))}</td>
                                                <td style={{ padding: '11px 14px', textAlign: 'right' }}><StatusBadge active={b.tokens > 0} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── ANALYTICS ── */}
                    {activeTab === 'analytics' && stats && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Stat summary row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                                {[
                                    { label: 'Peak Day', value: fmt(Math.max(...(stats.dailyUsage || []).map(d => d.tokens || 0))) },
                                    { label: '14-Day Total', value: fmt((stats.dailyUsage || []).reduce((a, d) => a + (d.tokens || 0), 0)) },
                                    { label: 'Daily Average', value: fmt(Math.round((stats.dailyUsage || []).reduce((a, d) => a + (d.tokens || 0), 0) / 14)) },
                                    { label: 'Total All-time', value: fmt(stats.totalTokens) },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '15px 18px' }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 6 }}>{s.label}</div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Pie charts row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Users per Batch</div>
                                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Number of registered users by batch</div>
                                    <DonutChart
                                        data={stats.batchAnalytics || []}
                                        valueKey="userCount"
                                        labelKey="batch"
                                        title="batches"
                                    />
                                </div>
                                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Token Usage per Batch</div>
                                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Total tokens consumed by each batch</div>
                                    <DonutChart
                                        data={stats.batchAnalytics || []}
                                        valueKey="tokens"
                                        labelKey="batch"
                                        title="batches"
                                    />
                                </div>
                            </div>

                            {/* Daily bar chart */}
                            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Daily Token Usage</div>
                                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Last 14 days — logged-in users only</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20 }}>
                                        {[
                                            { label: 'Peak', value: fmt(Math.max(...(stats.dailyUsage || []).map(d => d.tokens || 0))) },
                                            { label: 'Avg', value: fmt(Math.round((stats.dailyUsage || []).reduce((a, d) => a + (d.tokens || 0), 0) / 14)) },
                                        ].map((s, i) => (
                                            <div key={i} style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {(() => {
                                    const data = stats.dailyUsage || [];
                                    const max = Math.max(...data.map(d => d.tokens || 0), 1);
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
                                            {data.map((d, i) => (
                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                    <div
                                                        title={`${d.date}: ${fmt(d.tokens)} tokens`}
                                                        style={{ width: '100%', borderRadius: '4px 4px 0 0', background: d.tokens ? BLUE : '#e8edf5', height: `${Math.max(((d.tokens || 0) / max) * 116, d.tokens ? 5 : 2)}px`, transition: 'height 0.4s, opacity 0.15s', cursor: 'default', opacity: 0.82 }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.82'}
                                                    />
                                                    <span style={{ fontSize: 8, color: SUB, transform: 'rotate(45deg)', transformOrigin: 'left center', whiteSpace: 'nowrap' }}>{d.date?.slice(5)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Model breakdown */}
                            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Token Usage by Model</div>
                                <div style={{ fontSize: 11, color: MUTED, marginBottom: 18 }}>Breakdown of which AI model is used most</div>
                                {(() => {
                                    const data = stats.modelBreakdown || [];
                                    const max = Math.max(...data.map(d => d.tokens || 0), 1);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {data.map((d, i) => (
                                                <div key={i}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: TEXT }}>{d.model}</span>
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 12, color: MUTED }}>{fmt(d.tokens)} tokens</span>
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, background: BLUE + '15', borderRadius: 99, padding: '1px 8px' }}>
                                                                {stats.totalTokens ? `${Math.round((d.tokens / stats.totalTokens) * 100)}%` : '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ height: 10, background: '#e8edf5', borderRadius: 99 }}>
                                                        <div style={{ height: 10, borderRadius: 99, background: CHART_COLORS[i % CHART_COLORS.length], width: `${((d.tokens || 0) / max) * 100}%`, transition: 'width 0.5s' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                    )}

                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
        </div>
    );
}
