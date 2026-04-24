'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function MessageActions({ content = '' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleCopy}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                aria-label="Copy message"
                title={copied ? 'Copied' : 'Copy'}
            >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {copied ? <span className="text-xs text-slate-400">Copied</span> : null}
        </div>
    );
}
