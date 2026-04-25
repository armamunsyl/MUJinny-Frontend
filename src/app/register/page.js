'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shapes, User } from 'lucide-react';

import { registerUser } from '@/lib/auth';

const ID_LENGTH = 9;

function StudentIdInput({ value, onChange }) {
    const digits = value.split('').concat(Array(ID_LENGTH).fill('')).slice(0, ID_LENGTH);
    const refs = useRef([]);

    const update = (idx, char) => {
        const next = digits.slice();
        next[idx] = char;
        onChange(next.join(''));
    };

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (digits[idx]) {
                update(idx, '');
            } else if (idx > 0) {
                update(idx - 1, '');
                refs.current[idx - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
            refs.current[idx - 1]?.focus();
        } else if (e.key === 'ArrowRight' && idx < ID_LENGTH - 1) {
            refs.current[idx + 1]?.focus();
        }
    };

    const handleInput = (e, idx) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) return;
        const char = raw[raw.length - 1];
        update(idx, char);
        if (idx < ID_LENGTH - 1) refs.current[idx + 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, ID_LENGTH);
        const next = pasted.split('').concat(Array(ID_LENGTH).fill('')).slice(0, ID_LENGTH);
        onChange(next.join(''));
        const focusIdx = Math.min(pasted.length, ID_LENGTH - 1);
        refs.current[focusIdx]?.focus();
    };

    return (
        <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">Student ID</p>
            <div className="flex gap-1.5">
                {digits.map((d, i) => (
                    <input
                        key={i}
                        ref={el => refs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={d}
                        onKeyDown={e => handleKeyDown(e, i)}
                        onInput={e => handleInput(e, i)}
                        onPaste={handlePaste}
                        onChange={() => {}}
                        className="h-11 w-full min-w-0 rounded-[10px] border border-white/10 bg-[#1d212b] text-center text-[15px] font-semibold text-white outline-none transition focus:border-white/40 focus:bg-[#232938] caret-transparent"
                    />
                ))}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        studentId: '',
        batch: '',
        sec: '',
        gender: 'male',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateStepOne = () => {
        setError('');

        if (!formData.email.trim()) {
            setError('Email address is required.');
            return false;
        }

        if (!formData.password || formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }

        return true;
    };

    const validateStepTwo = () => {
        setError('');

        if (!formData.name.trim()) {
            setError('Name is required.');
            return false;
        }

        const secRegex = /^[A-Z]$/;
        if (!secRegex.test(formData.sec)) {
            setError('Section must be a single uppercase letter (A, B, C...).');
            return false;
        }

        if (formData.studentId.replace(/\D/g, '').length !== 9) {
            setError('Student ID must be exactly 9 digits.');
            return false;
        }

        if (!formData.batch) {
            setError('Batch is required.');
            return false;
        }

        return true;
    };

    const handleContinue = (e) => {
        e.preventDefault();
        if (!validateStepOne()) return;
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStepTwo()) return;

        setLoading(true);

        try {
            await registerUser(formData.email, formData.password, {
                name: formData.name,
                studentId: Number(formData.studentId),
                batch: Number(formData.batch),
                sec: formData.sec,
                gender: formData.gender,
            });
            router.push('/chat');
        } catch (err) {
            console.error(err);
            const code = err?.code || '';
            if (code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Try logging in instead.');
            } else if (code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (code === 'auth/weak-password') {
                setError('Password is too weak. Please choose a stronger password.');
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
        <div className="relative min-h-screen overflow-hidden bg-[#171a21] px-4 py-5 text-white sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px,44px_44px]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-[linear-gradient(90deg,rgba(27,32,93,0.82)_0%,rgba(27,32,93,0.52)_34%,rgba(23,26,33,0)_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[36%] bg-[linear-gradient(270deg,rgba(17,19,26,0.18)_0%,rgba(17,19,26,0)_56%)]" />

            <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-sm flex-col">
                <div className="mb-8 pt-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (step === 2) {
                                setError('');
                                setStep(1);
                                return;
                            }
                            router.push('/login');
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-white/75 transition hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>
                </div>

                <div className="flex flex-1 flex-col justify-center">
                    <div className="mb-8 text-left">
                        <h1 className="text-[36px] font-semibold leading-[0.98] tracking-tight text-white sm:text-[42px]">
                            {step === 1 ? (
                                <>
                                    Let&apos;s get
                                    <br />
                                    Started
                                </>
                            ) : (
                                <>
                                    Finish your
                                    <br />
                                    profile
                                </>
                            )}
                        </h1>
                    </div>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                        {error ? (
                            <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}

                        {step === 1 ? (
                            <>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Email id"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-11 py-3.5 text-[14px] text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Password"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-11 py-3.5 pr-10 text-[14px] text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-white"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                                    <input
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm Password"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-11 py-3.5 pr-10 text-[14px] text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-white"
                                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleContinue}
                                    className="mt-6 w-full rounded-full bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:bg-white/90"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Your name"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-11 py-3.5 text-[14px] text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />
                                </div>

                                <StudentIdInput
                                    value={formData.studentId}
                                    onChange={(val) => setFormData({ ...formData, studentId: val })}
                                />

                                <div className="relative">
                                    <Shapes className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" />
                                    <input
                                        name="batch"
                                        type="number"
                                        required
                                        value={formData.batch}
                                        onChange={handleChange}
                                        placeholder="Batch"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-9 py-3.5 text-[13.5px] text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        name="sec"
                                        type="text"
                                        required
                                        maxLength={1}
                                        value={formData.sec}
                                        onChange={(e) => setFormData({ ...formData, sec: e.target.value.toUpperCase() })}
                                        placeholder="Section"
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-4 py-3.5 text-[13.5px] uppercase text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-[#232938]"
                                    />

                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full rounded-[16px] border border-white/10 bg-[#1d212b] px-4 py-3.5 text-[13.5px] text-white outline-none transition focus:border-white/25 focus:bg-[#232938]"
                                    >
                                        <option className="bg-black" value="male">Male</option>
                                        <option className="bg-black" value="female">Female</option>
                                        <option className="bg-black" value="other">Other</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-6 w-full rounded-full bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </>
                        )}
                    </form>
                </div>

                <div className="mt-8 pb-1 text-center text-sm text-white/70">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-white transition hover:text-white/80">
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    );
}
