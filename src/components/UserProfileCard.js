import React, { useEffect, useRef, useState } from 'react';
import {
    ChevronRight,
    ChevronUp,
    Crown,
    LogOut,
    Mail,
    Settings,
    Shield,
    SlidersHorizontal,
    UserRound,
    X,
    CircleHelp,
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [settingsFocus, setSettingsFocus] = useState('account');
    const containerRef = useRef(null);

    const safeUser = user || {};
    const displayName = safeUser.name || safeUser.displayName || 'User';
    const displayEmail = safeUser.email || 'No email provided';
    const initials = getInitials(displayName);
    const plan = safeUser.plan || 'free';
    const role = safeUser.role || 'student';
    const weeklyCreditSpent =
        safeUser.weeklyCreditSpent ??
        safeUser.weeklyCreditsSpent ??
        safeUser.creditSpentThisWeek ??
        safeUser.weeklySpent ??
        null;

    const profileFields = [
        { label: 'Batch', value: safeUser.batch || 'Not added' },
        { label: 'Section', value: safeUser.sec || safeUser.section || 'Not added' },
        { label: 'ID Number', value: safeUser.studentId || safeUser.idNumber || 'Not added' },
        { label: 'Gmail', value: displayEmail },
        { label: 'Role', value: toTitleCase(role) },
        {
            label: 'Current Package',
            value: toTitleCase(plan),
            icon: plan === 'premium' || plan === 'pro' ? Crown : null,
        },
        {
            label: 'Weekly Credit Spent',
            value:
                weeklyCreditSpent === null || weeklyCreditSpent === undefined || weeklyCreditSpent === ''
                    ? 'Not tracked yet'
                    : `${weeklyCreditSpent} credits`,
        },
    ];

    const settingsCards = [
        {
            id: 'plan',
            label: 'Upgrade Plan',
            description: `Current package: ${toTitleCase(plan)}`,
            icon: Crown,
        },
        {
            id: 'personalization',
            label: 'Personalization',
            description: 'Chat preferences and personal options can be added here.',
            icon: SlidersHorizontal,
        },
        {
            id: 'account',
            label: 'Settings',
            description: `${displayEmail} • ${toTitleCase(role)}`,
            icon: Settings,
        },
        {
            id: 'help',
            label: 'Help',
            description: 'Support and help center links can be connected here.',
            icon: CircleHelp,
        },
    ];

    const closeMenu = () => {
        setIsMenuOpen(false);
        setMenuView('menu');
        setSettingsFocus('account');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveTab('profile');
        setSettingsFocus('account');
    };

    const openDetailView = (tab, focus = 'account') => {
        setActiveTab(tab);
        setSettingsFocus(focus);
        setIsMenuOpen(false);
        setMenuView('menu');
        setIsModalOpen(true);
    };

    const openMenuSettings = (focus = 'account') => {
        setSettingsFocus(focus);
        setMenuView('settings');
    };

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                closeMenu();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isModalOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isModalOpen]);

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
                                        <MenuItem icon={UserRound} label="Profile" onClick={() => openDetailView('profile')} />
                                        <MenuItem icon={Settings} label="Settings" onClick={() => openMenuSettings('account')} />
                                    </div>

                                    <div className="mt-2.5 border-t border-[#2a3550] pt-2.5">
                                        <MenuItem
                                            icon={CircleHelp}
                                            label="Help"
                                            onClick={() => openMenuSettings('help')}
                                            trailing={<ChevronRight className="h-4 w-4 text-slate-300" />}
                                        />
                                        <MenuItem
                                            icon={LogOut}
                                            label="Log out"
                                            onClick={() => {
                                                closeMenu();
                                                onLogout();
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
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
                                        <div className="text-[12px] font-medium text-white">Settings</div>
                                        <div className="w-10" />
                                    </div>

                                    <div className="mt-3 space-y-2 border-t border-[#2a3550] pt-3">
                                        {settingsCards.map((card) => {
                                            const Icon = card.icon;
                                            const isActive = settingsFocus === card.id;

                                            return (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => setSettingsFocus(card.id)}
                                                    className={`w-full rounded-[18px] border px-3 py-2.5 text-left transition ${
                                                        isActive
                                                            ? 'border-[#2aa7a0] bg-[#17323f]'
                                                            : 'border-[#25314a] bg-[#161f32] hover:bg-[#1a2540]'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <div
                                                            className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                                                                isActive ? 'bg-[#24c6b5]/15 text-[#79ede0]' : 'bg-[#1e2940] text-slate-300'
                                                            }`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[12px] font-medium text-white">{card.label}</div>
                                                            <div className="mt-0.5 text-[11px] leading-5 text-slate-400">{card.description}</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        <div className="rounded-[18px] border border-[#25314a] bg-[#161f32] px-3 py-2.5">
                                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Primary Gmail</div>
                                            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="truncate">{displayEmail}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => {
                        setIsMenuOpen((prev) => {
                            const next = !prev;
                            if (next) {
                                setMenuView('menu');
                                setSettingsFocus('account');
                            }
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4" onClick={closeModal}>
                    <div
                        className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[#171a21] shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="User profile"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(36,198,181,0.28),rgba(23,26,33,0)_72%)]" />
                        <button
                            type="button"
                            onClick={closeModal}
                            className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="relative max-h-[85vh] overflow-y-auto px-6 pb-6 pt-8">
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-[#202634] text-3xl font-bold text-white shadow-lg shadow-emerald-500/10">
                                    {initials}
                                </div>
                                <h2 className="mt-4 text-xl font-semibold text-white">{displayName}</h2>
                                <p className="mt-1 text-sm text-slate-400">{displayEmail}</p>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                                    {toTitleCase(role)}
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-[#131720] p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                        activeTab === 'profile'
                                            ? 'bg-[#24c6b5] text-white'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                                >
                                    <UserRound className="h-4 w-4" />
                                    Profile
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('settings')}
                                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                        activeTab === 'settings'
                                            ? 'bg-[#24c6b5] text-white'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </button>
                            </div>

                            {activeTab === 'profile' ? (
                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {profileFields.map((field) => {
                                        const FieldIcon = field.icon;
                                        return (
                                            <div key={field.label} className="rounded-2xl border border-white/8 bg-[#1d212a] p-4">
                                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{field.label}</div>
                                                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                                                    {FieldIcon ? <FieldIcon className="h-4 w-4 text-emerald-300" /> : null}
                                                    <span className="break-all">{field.value}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-5 space-y-3">
                                    {settingsCards.map((card) => {
                                        const Icon = card.icon;
                                        const isActive = settingsFocus === card.id;

                                        return (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={() => setSettingsFocus(card.id)}
                                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                                    isActive
                                                        ? 'border-emerald-400/30 bg-emerald-400/10'
                                                        : 'border-white/8 bg-[#1d212a] hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                                                            isActive ? 'bg-emerald-300/15 text-emerald-200' : 'bg-white/5 text-slate-300'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{card.label}</div>
                                                        <div className="mt-1 text-sm text-slate-400">{card.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    <div className="rounded-2xl border border-white/8 bg-[#1d212a] p-4">
                                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Primary Gmail</div>
                                        <div className="mt-2 flex items-center gap-2 text-sm text-white">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            {displayEmail}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onLogout}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
