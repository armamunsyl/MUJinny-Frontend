'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminLoginPage() {
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
            await signInWithEmailAndPassword(auth, email, password);
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 403) {
                setError('Access denied. Admin only.');
                await auth.signOut();
            } else if (res.ok) {
                router.push('/admin');
            } else {
                setError('Login failed.');
            }
        } catch (err) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#171a21', padding: '0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <div style={{ width: '100%', maxWidth: 360 }}>
                <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <img src="/MUJinny-Logo.png" alt="MUJinny" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Admin Panel</div>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>MUJinny — Restricted Access</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {error && (
                        <div style={{ borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Admin email"
                        style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1e2330', padding: '11px 16px', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#1e2330', padding: '11px 16px', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ marginTop: 4, width: '100%', borderRadius: 12, background: '#274792', border: 'none', padding: '12px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2f6fed'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#274792'; }}
                    >
                        {loading ? 'Verifying...' : 'Sign in as Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
}
