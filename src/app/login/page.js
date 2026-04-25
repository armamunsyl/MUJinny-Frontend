'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { loginUser } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await loginUser(email, password);
            router.push('/chat');
        } catch (err) {
            console.error(err);
            const code = err?.code || '';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                setError('Email or password is incorrect. Please try again.');
            } else if (code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (code === 'auth/user-disabled') {
                setError('This account has been disabled. Please contact support.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please wait a few minutes and try again.');
            } else if (code === 'auth/network-request-failed') {
                setError('Network error. Please check your internet connection.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative h-screen overflow-hidden bg-[#171a21] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px,44px_44px]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-[linear-gradient(90deg,rgba(27,32,93,0.82)_0%,rgba(27,32,93,0.52)_34%,rgba(23,26,33,0)_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[36%] bg-[linear-gradient(270deg,rgba(17,19,26,0.18)_0%,rgba(17,19,26,0)_56%)]" />

            <div className="relative flex h-full items-center justify-center px-4 sm:px-6">
                <div className="w-full max-w-sm">
                    <div className="mb-7 text-center">
                        <div className="mx-auto mb-3 inline-flex items-center justify-center gap-2 text-[26px] font-semibold tracking-tight text-white">
                            <Sparkles className="h-6 w-6" />
                            <span>MUJinny</span>
                        </div>
                        <h1 className="text-[32px] font-semibold tracking-tight text-white">Welcome back</h1>
                        <p className="mt-1.5 text-sm text-white/60">Sign in to your MUJinny account</p>
                    </div>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                        {error ? (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}

                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Your Email"
                            className="w-full rounded-[16px] border border-white/14 bg-[#1e2330] px-5 py-3.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/30 focus:bg-[#232938]"
                        />

                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your Password"
                            className="w-full rounded-[16px] border border-white/14 bg-[#1e2330] px-5 py-3.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/30 focus:bg-[#232938]"
                        />

                        <div className="text-center">
                            <button type="button" className="text-xs font-medium text-white/50 transition hover:text-white">
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        <div className="relative flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10" />
                            <span className="text-xs text-white/30">or</span>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <Link
                            href="/register"
                            className="flex w-full items-center justify-center rounded-full border border-white/20 bg-white/6 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            Create new account
                        </Link>

                        <Link
                            href="/chat"
                            className="flex w-full items-center justify-center py-1.5 text-xs font-medium text-white/40 transition hover:text-white/70"
                        >
                            Continue without login
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
}
