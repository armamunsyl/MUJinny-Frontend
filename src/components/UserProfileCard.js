import React, { useEffect, useRef, useState } from 'react';
import {
    ChevronRight,
    ChevronUp,
    LogOut,
    Shield,
    UserRound,
} from 'lucide-react';

const getInitials = (value) => {
    if (!value) return 'U';
    const parts = value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return 'U';
    return parts.map((part) => part[0]).join('').toUpperCase();
};

const toTitleCase = (value, fallback = 'Not added') => {
    if (!value) return fallback;
    return String(value)
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const MenuItem = ({ icon: Icon, label, onClick, trailing, danger = false }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-[12px] transition ${
            danger ? 'text-red-100 hover:bg-red-500/10' : 'text-slate-100 hover:bg-[#1b2640]'
        }`}
    >
        <Icon className={`h-4 w-4 shrink-0 ${danger ? 'text-red-200' : 'text-slate-300'}`} />
        <span className="flex-1">{label}</span>
        {trailing ? trailing : null}
    </button>
);

export default function UserProfileCard({ user, onLogout, collapsed = false }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState('menu');

    const containerRef = useRef(null);

    const safeUser = user || {};
    const displayName = safeUser.name || safeUser.displayName || 'User';
    const displayEmail = safeUser.email || 'No email provided';
    const initials = getInitials(displayName);
    const role = safeUser.role || 'student';

    const closeMenu = () => {
        setIsMenuOpen(false);
        setMenuView('menu');
    };

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                closeMenu();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') closeMenu();
        };

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen]);

    if (!user) return null;

    return (
        <>
            <div ref={containerRef} className="relative mt-3 px-3 pb-3">
                {isMenuOpen && (
                    <div
                        className={`absolute bottom-full z-40 mb-2 overflow-hidden rounded-[24px] border border-[#31446f] bg-[linear-gradient(180deg,#182033_0%,#131a2b_100%)] shadow-[0_18px_42px_rgba(5,10,24,0.58)] ${
                            collapsed ? 'left-0 w-[236px]' : 'left-0 w-[calc(100vw-3rem)] max-w-[304px]'
                        }`}
                    >
                        <div className="px-4 pb-2.5 pt-4">
                            {menuView === 'menu' ? (
                                <>
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#24c6b5] text-[11px] font-semibold text-white">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-[14px] font-medium leading-none text-white">{displayName}</div>
                                            <div className="mt-1 truncate text-[11px] text-slate-300">@{displayEmail.split('@')[0] || 'user'}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-[#2a3550] pt-3">
                                        <MenuItem icon={UserRound} label="Profile" onClick={() => setMenuView('profile')} />
                                    </div>

                                    <div className="mt-2.5 border-t border-[#2a3550] pt-2.5">
                                        <MenuItem
                                            icon={LogOut}
                                            label="Log out"
                                            onClick={() => { closeMenu(); onLogout(); }}
                                        />
                                    </div>
                                </>
                            ) : menuView === 'profile' ? (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMenuView('menu')}
                                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-300 transition hover:bg-[#1c2740] hover:text-white"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                                            Back
                                        </button>
                                        <div className="text-[12px] font-medium text-white">Profile</div>
                                        <div className="w-10" />
                                    </div>

                                    <div className="mt-3 flex items-center gap-3 border-t border-[#2a3550] pt-3.5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#24c6b5] text-sm font-bold text-white">
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[13px] font-semibold text-white">{displayName}</div>
                                            <div className="truncate text-[10px] text-slate-400">{displayEmail}</div>
                                        </div>
                                        <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                                            <Shield className="h-2.5 w-2.5" />
                                            {toTitleCase(role)}
                                        </div>
                                    </div>

                                    <div className="mt-3 space-y-1.5">
                                        {[
                                            { label: 'Batch', value: safeUser.batch || '—' },
                                            { label: 'Section', value: safeUser.sec || safeUser.section || '—' },
                                            {
                                                label: 'Student ID',
                                                value: safeUser.studentId
                                                    ? String(safeUser.studentId).replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3')
                                                    : '—'
                                            },
                                        ].map((field) => (
                                            <div key={field.label} className="flex items-center justify-between rounded-[12px] border border-[#25314a] bg-[#161f32] px-3 py-2.5">
                                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{field.label}</div>
                                                <div className="text-[12px] font-semibold text-white">{field.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => {
                        setIsMenuOpen((prev) => {
                            const next = !prev;
                            if (next) setMenuView('menu');
                            return next;
                        });
                    }}
                    className={`flex w-full items-center rounded-xl border border-white/8 bg-[#161922] text-left ${
                        collapsed ? 'mx-auto h-11 w-11 justify-center border-none bg-transparent px-0 py-0' : 'gap-2 px-2.5 py-2'
                    }`}
                    title={collapsed ? displayName : undefined}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="dialog"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#24c6b5] text-xs font-semibold text-white">
                        {initials}
                    </div>
                    {!collapsed ? (
                        <>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] font-medium text-slate-100">{displayName}</div>
                                <div className="truncate text-[10px] text-slate-500">{displayEmail}</div>
                            </div>
                            <ChevronUp className={`h-4 w-4 text-slate-500 transition ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </>
                    ) : null}
                </button>
            </div>

        </>
    );
}
