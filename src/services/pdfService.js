const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Call backend to generate PDF and trigger browser download.
 */
export async function downloadPdf(token, title, content, options = {}) {
    const res = await fetch(`${API_URL}/api/pdf/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, options }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `PDF generation failed (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'mugpt-export'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Save an MCQ snapshot to the backend so it can be re-exported later.
 */
export async function saveSnapshot(token, chatId, title, content) {
    await fetch(`${API_URL}/api/pdf/snapshot`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId, title, content, type: 'mcq' }),
    });
}

/**
 * Fetch the most recent MCQ snapshot for a chat session.
 * Returns null if none exists.
 */
export async function fetchLatestSnapshot(token, chatId) {
    const res = await fetch(`${API_URL}/api/pdf/snapshot/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content ? data : null;
}
