'use client';

import { isValidElement, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Play, Square, Terminal, Copy, ChevronDown, ChevronUp, Keyboard } from 'lucide-react';
import { auth } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SUPPORTED_LANGUAGES = new Set(['c', 'cpp', 'java', 'python']);
let cachedRunnerConfig = null;
let cachedRunnerConfigPromise = null;

const extractText = (node) => {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(extractText).join('');
    }

    if (node && typeof node === 'object' && 'props' in node) {
        return extractText(node.props.children);
    }

    return '';
};

const normalizeLanguage = (language = '') => {
    const normalized = language.toLowerCase();
    if (normalized === 'c++') return 'cpp';
    if (normalized === 'py') return 'python';
    return normalized;
};

const getStorageKey = ({ chatId, messageId, code }) => {
    if (!chatId || !messageId || !code) return null;
    return `mugpt-codeblock:${chatId}:${messageId}:${code.slice(0, 48)}`;
};

const appendChunk = (previous, chunk) => `${previous}${chunk}`.slice(-50000);

const fetchRunnerConfig = async () => {
    if (cachedRunnerConfig) return cachedRunnerConfig;
    if (cachedRunnerConfigPromise) return cachedRunnerConfigPromise;

    cachedRunnerConfigPromise = (async () => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
            return { enabled: false, reason: 'Please sign in to run code.' };
        }

        const response = await fetch(`${API_URL}/api/run/config`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Failed to load runner configuration.');
        }

        cachedRunnerConfig = payload;
        return payload;
    })();

    try {
        return await cachedRunnerConfigPromise;
    } finally {
        cachedRunnerConfigPromise = null;
    }
};

export default function CodeBlock({ children, className = '', language = '', chatId = null, messageId = null }) {
    const codeNode = Array.isArray(children) ? children[0] : children;
    const codeChildren = isValidElement(codeNode) ? codeNode.props.children : children;
    const childClassName = isValidElement(codeNode) ? codeNode.props.className || '' : '';
    const mergedClassName = [className, childClassName].filter(Boolean).join(' ').trim();
    const [copied, setCopied] = useState(false);
    const [runId, setRunId] = useState(null);
    const [running, setRunning] = useState(false);
    const [outputOpen, setOutputOpen] = useState(false);
    const [stdinOpen, setStdinOpen] = useState(false);
    const [stdin, setStdin] = useState('');
    const [statusText, setStatusText] = useState('');
    const [stdout, setStdout] = useState('');
    const [stderr, setStderr] = useState('');
    const [panelError, setPanelError] = useState('');
    const [runnerConfig, setRunnerConfig] = useState({ enabled: true, reason: '' });
    const rawCode = extractText(codeChildren).replace(/\n$/, '');
    const detectedLanguage = language || mergedClassName.replace('hljs', '').trim().match(/language-([A-Za-z0-9+#_-]+)/)?.[1] || '';
    const normalizedLanguage = normalizeLanguage(detectedLanguage);
    const canRun = Boolean(chatId && messageId && SUPPORTED_LANGUAGES.has(normalizedLanguage));
    const isRunAvailable = canRun && runnerConfig.enabled !== false;
    const storageKey = useMemo(() => getStorageKey({ chatId, messageId, code: rawCode }), [chatId, messageId, rawCode]);
    const outputText = `${stdout}${stderr}`;

    useEffect(() => {
        if (!canRun) return;

        let cancelled = false;

        fetchRunnerConfig()
            .then((config) => {
                if (!cancelled) setRunnerConfig(config);
            })
            .catch((error) => {
                if (!cancelled) {
                    setRunnerConfig({ enabled: false, reason: error.message || 'Docker not installed or not running' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [canRun]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(storageKey);
        if (stored === 'open') setOutputOpen(true);
    }, [storageKey]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        window.localStorage.setItem(storageKey, outputOpen ? 'open' : 'closed');
    }, [outputOpen, storageKey]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(rawCode);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const streamRun = async (nextRunId, token) => {
        const response = await fetch(`${API_URL}/api/run/stream?runId=${encodeURIComponent(nextRunId)}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok || !response.body) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Failed to connect to run stream.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const eventChunk of events) {
                const dataLine = eventChunk
                    .split('\n')
                    .find((line) => line.startsWith('data: '));

                if (!dataLine) continue;

                const event = JSON.parse(dataLine.slice(6));

                if (event.type === 'stdout') {
                    setStdout((prev) => appendChunk(prev, event.data || ''));
                } else if (event.type === 'stderr') {
                    setStderr((prev) => appendChunk(prev, event.data || ''));
                } else if (event.type === 'status') {
                    setStatusText(event.data || event.status || '');
                } else if (event.type === 'exit') {
                    setStatusText(event.data || event.status || 'Execution finished.');
                    setRunning(false);
                    return;
                }
            }
        }

        setRunning(false);
    };

    const handleRun = async () => {
        if (!isRunAvailable || running) return;

        try {
            setPanelError('');
            setStatusText('Starting sandbox...');
            setStdout('');
            setStderr('');
            setOutputOpen(true);
            setRunning(true);

            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Please sign in to run code.');
            }

            const response = await fetch(`${API_URL}/api/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatId,
                    messageId,
                    language: normalizedLanguage,
                    code: rawCode,
                    stdin,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to start code execution.');
            }

            setRunId(payload.runId);
            await streamRun(payload.runId, token);
        } catch (error) {
            setRunning(false);
            setPanelError(error.message || 'Failed to run code.');
            setStatusText('Execution failed.');
            setOutputOpen(true);
        }
    };

    const handleStop = async () => {
        if (!runId || !running) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Please sign in to stop code execution.');
            }

            await fetch(`${API_URL}/api/run/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ runId }),
            });
            setStatusText('Stopping execution...');
        } catch (error) {
            setPanelError(error.message || 'Failed to stop execution.');
        }
    };

    return (
        <div className="my-4 overflow-hidden rounded-xl border border-[#1E293B] bg-[#0B1220]">
            <div className="flex items-center justify-between gap-3 border-b border-white/6 bg-[#10192d] px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                    <Terminal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {normalizedLanguage || 'text'}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {canRun && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStdinOpen((prev) => !prev)}
                                disabled={!isRunAvailable}
                                title="Input"
                                aria-label="Input"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Keyboard className="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                onClick={handleRun}
                                disabled={running || !isRunAvailable}
                                title={!isRunAvailable ? runnerConfig.reason || 'Docker not installed or not running' : undefined}
                                aria-label="Run"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1f3a72] text-slate-100 transition hover:bg-[#274792] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {running ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleStop}
                                disabled={!running}
                                title="Stop"
                                aria-label="Stop"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Square className="h-3 w-3" />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={handleCopy}
                        title={copied ? 'Copied' : 'Copy'}
                        aria-label="Copy code"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1E293B] text-[#CBD5F5] transition hover:bg-[#334155]"
                    >
                        <Copy className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <pre className="app-scrollbar m-0 max-w-full overflow-x-auto p-3 font-mono text-[13px] leading-[1.6] text-[#E2E8F0] sm:p-4 sm:text-[13.5px]">
                <code className={mergedClassName}>{codeChildren}</code>
            </pre>

            {(stdinOpen || outputOpen || running || outputText || panelError) && (
                <div className="border-t border-white/6 bg-[rgba(6,12,24,0.86)] px-4 py-3">
                    {!isRunAvailable && canRun ? (
                        <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                            {runnerConfig.reason || 'Docker not installed or not running'}
                        </div>
                    ) : null}
                    {stdinOpen && (
                        <div className="mb-3">
                            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                Program Input
                            </label>
                            <textarea
                                value={stdin}
                                onChange={(event) => setStdin(event.target.value)}
                                rows={3}
                                disabled={running}
                                className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2 font-mono text-xs leading-6 text-slate-200 outline-none placeholder:text-slate-500"
                                placeholder="Optional stdin..."
                            />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setOutputOpen((prev) => !prev)}
                        className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-300"
                    >
                        {outputOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Output
                    </button>

                    {outputOpen && (
                        <div className="rounded-lg border border-white/8 bg-[#08101f]/85">
                            <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2 text-xs text-slate-400">
                                <span>{statusText || (running ? 'Running...' : 'Ready')}</span>
                                {panelError ? <span className="text-rose-300">{panelError}</span> : null}
                            </div>
                            <div className="max-h-56 overflow-y-auto p-3 font-mono text-[12.5px] leading-6 text-slate-200">
                                {outputText ? (
                                    <>
                                        {stdout ? <pre className="m-0 whitespace-pre-wrap break-words text-slate-100">{stdout}</pre> : null}
                                        {stderr ? <pre className="m-0 mt-2 whitespace-pre-wrap break-words text-rose-300">{stderr}</pre> : null}
                                    </>
                                ) : (
                                    <div className="text-slate-500">{running ? 'Waiting for output...' : 'No output yet.'}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
