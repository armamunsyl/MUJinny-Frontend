'use client';

import { useRouter } from 'next/navigation';

export default function QuotaExceededModal({ onClose }) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2f6fed]/15">
                    <img src="/MUJinny-Logo.png" alt="MUJinny" className="h-8 w-8 rounded-full object-cover" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-white">Free quota exhausted</h2>
                <p className="mb-6 text-sm leading-6 text-slate-400">
                    Your free daily quota is exhausted. Login to continue chatting — your quota resets every day.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/login')}
                        className="flex-1 rounded-xl bg-[#2f6fed] py-2.5 text-sm font-medium text-white transition hover:bg-[#2563eb]"
                    >
                        Login to continue
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-white/5"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
