'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
    ArrowDown,
    Bell,
    ChevronsLeft,
    ChevronDown,
    LogIn,
    Menu,
    MessageSquare,
    MoreHorizontal,
    NotebookText,
    Pencil,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import UserProfileCard from '@/components/UserProfileCard';
import QuotaExceededModal from '@/components/QuotaExceededModal';
import { auth } from '@/lib/firebase';
import { useUser } from '@/lib/useUser';
import { isPdfIntent, parsePdfOptions, extractPdfTitle, isMcqContent } from '@/utils/intent';
import { downloadPdf, saveSnapshot, fetchLatestSnapshot } from '@/services/pdfService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PDF_TEXT_LIMIT = 12000;

const SIDEBAR_LINKS = [
    { id: 'new', label: 'New Chat', icon: MessageSquare },
    { id: 'study', label: 'Study', icon: NotebookText },
    { id: 'notice', label: 'Notice', icon: Bell },
];

const MODEL_OPTIONS = [
    { value: 'auto', label: 'Jinny Go', mobileLabel: 'Go' },
    { value: 'gpt-5.2', label: 'Jinny Deep', mobileLabel: 'Deep' },
];

const EMPTY_PROMPTS = [
    'Ai script writer',
    'Coding Assistant',
    'Essay writer',
    'YouTube summaries',
    'Ai Email writing',
    'Ai pdf chat',
    'Research assistant',
];

const HERO_ROTATING_LINES = [
    'Heyy MUian whats your mind',
    'Ask me any university information',
    'Need todays class routine ?',
];
const HERO_ROTATE_INTERVAL_MS = 2600;
const AUTO_SCROLL_THRESHOLD = 120;

const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

const getBase64Payload = async (file) => {
    const dataUrl = await getBase64(file);
    return String(dataUrl).split(',')[1] || '';
};

const extractPdfTextFromFile = async (file) => {
    console.log(`[PDF-FE] Starting extraction: "${file.name}", size: ${file.size} bytes, type: "${file.type}"`);
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            useWorkerFetch: false,
            isEvalSupported: false,
        }).promise;

        console.log(`[PDF-FE] Loaded, pages: ${pdf.numPages}`);
        const chunks = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (pageText) chunks.push(pageText);
            if (chunks.join('\n\n').length >= PDF_TEXT_LIMIT) break;
        }

        const merged = chunks.join('\n\n').trim();
        console.log(`[PDF-FE] Extracted ${merged.length} chars`);

        if (!merged) {
            return null;
        }

        // Detect watermark-only PDFs (e.g. CamScanner): if >60% of words are known watermarks, treat as image-based
        const words = merged.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        const WATERMARKS = ['camscanner', 'scanned', 'adobe', 'ilovepdf', 'smallpdf'];
        const watermarkCount = words.filter((w) => WATERMARKS.some((wm) => w.includes(wm))).length;
        if (words.length > 0 && watermarkCount / words.length > 0.4) {
            console.log(`[PDF-FE] Watermark-only PDF detected (${watermarkCount}/${words.length} watermark words), switching to image render`);
            return null;
        }

        const text = merged.length > PDF_TEXT_LIMIT ? `${merged.slice(0, PDF_TEXT_LIMIT)}\n\n[PDF content truncated]` : merged;
        return `The user uploaded a PDF named "${file.name}". The full extracted text is below — use it to answer the user. Do NOT say you cannot access the PDF.\n\nPDF extracted text:\n${text}`;
    } catch (err) {
        console.error(`[PDF-FE] Extraction failed for "${file.name}":`, err);
        return null;
    }
};

const renderPdfPagesToImages = async (file, maxPages = 8) => {
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            useWorkerFetch: false,
            isEvalSupported: false,
        }).promise;

        const pagesToRender = Math.min(pdf.numPages, maxPages);
        const images = [];

        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.8));
        }

        console.log(`[PDF-FE] Rendered ${images.length} page(s) as images for "${file.name}"`);
        return images;
    } catch (err) {
        console.error(`[PDF-FE] Image rendering failed for "${file.name}":`, err);
        return [];
    }
};

const formatFileSize = (file) => {
    if (!file?.size) return 'Attachment';
    if (file.size < 1024 * 1024) {
        return `${Math.max(1, Math.round(file.size / 1024))} KB`;
    }
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdfFile = (file) => {
    const mimeType = String(file?.type || '').toLowerCase();
    const fileName = String(file?.name || '').toLowerCase();
    return mimeType.includes('pdf') || fileName.endsWith('.pdf');
};

const getInitials = (value, fallback = 'U') => {
    if (!value) return fallback;
    const parts = value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return fallback;
    return parts.map((part) => part[0]).join('').toUpperCase();
};

const createMessageId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('auto');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [heroLineIndex, setHeroLineIndex] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const [anonId, setAnonId] = useState(null);
    const [anonConversations, setAnonConversations] = useState([]);
    const [activeAnonConversationId, setActiveAnonConversationId] = useState(null);
    const messageViewportRef = useRef(null);
    const bottomSentinelRef = useRef(null);
    const autoScrollEnabledRef = useRef(true);
    const scrollFrameRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!loading) inputRef.current?.focus();
    }, [loading, messages]);

    // Generate or restore anonymous session ID + load saved anon conversations
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let id = localStorage.getItem('mujinny_anon_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('mujinny_anon_id', id);
        }
        setAnonId(id);

        try {
            const stored = localStorage.getItem('mujinny_anon_chats');
            if (stored) setAnonConversations(JSON.parse(stored));
        } catch {}
    }, []);

    const saveAnonChats = (chats) => {
        setAnonConversations(chats);
        try { localStorage.setItem('mujinny_anon_chats', JSON.stringify(chats)); } catch {}
    };

    const makeAnonTitle = (text) =>
        (text || '').split(/\s+/).slice(0, 5).join(' ').slice(0, 40) || 'New Chat';

    const loadAnonConversation = (id) => {
        const conv = anonConversations.find((c) => c.id === id);
        if (!conv) return;
        setActiveAnonConversationId(id);
        setMessages(conv.messages);
        setActiveConversationId(null);
        setAutoScrollState(true);
        setSidebarOpen(false);
    };

    const deleteAnonConversation = (id) => {
        const updated = anonConversations.filter((c) => c.id !== id);
        saveAnonChats(updated);
        if (activeAnonConversationId === id) {
            setActiveAnonConversationId(null);
            setMessages([]);
        }
    };

    useEffect(() => {
        if (user) {
            fetchConversations();
            setAnonConversations([]);
            try {
                localStorage.removeItem('mujinny_anon_chats');
                localStorage.removeItem('mujinny_anon_id');
            } catch {}
        } else if (!userLoading) {
            setConversations([]);
        }
    }, [user, userLoading]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (scrollFrameRef.current) {
            window.cancelAnimationFrame(scrollFrameRef.current);
        }

        scrollFrameRef.current = window.requestAnimationFrame(() => {
            // Read ref (always current) — not the stale state closure
            if (!autoScrollEnabledRef.current) return;
            const viewport = messageViewportRef.current;
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        });

        return () => {
            if (scrollFrameRef.current) {
                window.cancelAnimationFrame(scrollFrameRef.current);
            }
        };
    }, [messages, loading]);

    useEffect(() => {
        if (messages.length > 0) return undefined;

        setHeroLineIndex(0);
        const interval = window.setInterval(() => {
            setHeroLineIndex((prev) => (prev + 1) % HERO_ROTATING_LINES.length);
        }, HERO_ROTATE_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
        };
    }, [messages.length]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 639px)');
        const updateViewport = (event) => {
            setIsMobileViewport(event.matches);
        };

        setIsMobileViewport(mediaQuery.matches);
        mediaQuery.addEventListener('change', updateViewport);

        return () => {
            mediaQuery.removeEventListener('change', updateViewport);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && scrollFrameRef.current) {
                window.cancelAnimationFrame(scrollFrameRef.current);
            }
        };
    }, []);

    const setAutoScrollState = (enabled) => {
        if (autoScrollEnabledRef.current === enabled) return;
        autoScrollEnabledRef.current = enabled;
        setAutoScrollEnabled(enabled);
    };

    const updateAutoScrollState = () => {
        const viewport = messageViewportRef.current;
        if (!viewport) return;
        const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        setAutoScrollState(distanceFromBottom < AUTO_SCROLL_THRESHOLD);
    };

    const scrollToBottom = (behavior = 'auto') => {
        if (typeof window === 'undefined') return;
        if (scrollFrameRef.current) {
            window.cancelAnimationFrame(scrollFrameRef.current);
        }

        scrollFrameRef.current = window.requestAnimationFrame(() => {
            const viewport = messageViewportRef.current;
            if (!viewport) return;
            if (behavior === 'smooth') {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            } else {
                viewport.scrollTop = viewport.scrollHeight;
            }
        });
    };

    const handleJumpToLatest = () => {
        setAutoScrollState(true);
        scrollToBottom('smooth');
    };

    const fetchConversations = async () => {
        if (!auth.currentUser) return;
        setConversations([]);
        setHistoryLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_URL}/api/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadConversation = async (id) => {
        if (!auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_URL}/api/conversations/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setActiveConversationId(data._id);
            setMessages(data.messages);
            setAutoScrollState(true);
            setSidebarOpen(false);
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setActiveAnonConversationId(null);
        setMessages([]);
        setAutoScrollState(true);
        setSidebarOpen(false);
    };

    const buildRequestErrorMessage = (error) => {
        if (error?.name === 'TypeError') {
            return 'Backend server unreachable. Make sure the API server is running on port 8000.';
        }
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return 'Something went wrong while sending the message.';
    };

    const handlePdfExport = async (userText, userMessageId) => {
        if (!auth.currentUser) return;

        let content = '';
        let title = extractPdfTitle(userText, 'MUJinny Export');

        try {
            const token = await auth.currentUser.getIdToken();
            if (activeConversationId) {
                const snap = await fetchLatestSnapshot(token, activeConversationId);
                if (snap?.content) {
                    content = snap.content;
                    title = snap.title || title;
                }
            }
        } catch {}

        if (!content) {
            const lastAi = [...messages].reverse().find((m) => m.role === 'ai' || m.role === 'assistant');
            content = lastAi?.content || '';
        }

        if (!content.trim()) {
            setMessages((prev) => [
                ...prev,
                { role: 'user', content: userText, messageId: userMessageId },
                { role: 'ai', content: 'কোনো content পাওয়া যায়নি। আগে কিছু generate করতে বলুন, তারপর PDF বানানো যাবে।', messageId: createMessageId() },
            ]);
            setInput('');
            return;
        }

        const assistantMsgId = createMessageId();
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: userText, messageId: userMessageId },
            { role: 'ai', content: '⏳ PDF তৈরি হচ্ছে…', messageId: assistantMsgId },
        ]);
        setInput('');

        try {
            const token = await auth.currentUser.getIdToken();
            const options = parsePdfOptions(userText);
            await downloadPdf(token, title, content, options);
            setMessages((prev) => prev.map((m) =>
                m.messageId === assistantMsgId
                    ? { ...m, content: '✅ PDF ready! Download started.' }
                    : m,
            ));
        } catch (err) {
            setMessages((prev) => prev.map((m) =>
                m.messageId === assistantMsgId
                    ? { ...m, content: `PDF তৈরি করতে সমস্যা হয়েছে: ${err.message}` }
                    : m,
            ));
        }
    };

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!input.trim() && selectedFiles.length === 0) || loading) return;

        const userMsgContent = input.trim();
        const currentFiles = [...selectedFiles];

        if (userMsgContent && selectedFiles.length === 0 && isPdfIntent(userMsgContent)) {
            await handlePdfExport(userMsgContent, createMessageId());
            return;
        }
        const userMessageId = createMessageId();
        const pendingAssistantId = createMessageId();

        const attachedFiles = currentFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            sizeLabel: formatFileSize(file),
            url: URL.createObjectURL(file),
        }));

        setMessages((prev) => [
            ...prev,
            { role: 'user', content: userMsgContent, attachedFiles, messageId: userMessageId },
        ]);
        setInput('');
        setSelectedFiles([]);
        setLoading(true);
        setMessages((prev) => [...prev, { role: 'ai', content: '', messageId: pendingAssistantId }]);

        try {
            const isLoggedIn = !!auth.currentUser;
            const token = isLoggedIn ? await auth.currentUser.getIdToken() : null;

            let apiContent = userMsgContent;
            const imageFiles = currentFiles.filter((file) => file.type.startsWith('image/'));
            const pdfFiles = currentFiles.filter((file) => isPdfFile(file));
            console.log(`[UPLOAD] images: ${imageFiles.length}, pdfs: ${pdfFiles.length}`);

            if (imageFiles.length > 0 || pdfFiles.length > 0) {
                const defaultPrompt =
                    imageFiles.length > 0 && pdfFiles.length > 0
                        ? 'Please analyze these files and images:'
                        : pdfFiles.length > 0
                          ? 'Please read and analyze these PDF files:'
                          : 'Please analyze these images:';

                apiContent = [{ type: 'text', text: userMsgContent || defaultPrompt }];

                for (const file of pdfFiles) {
                    const extractedText = await extractPdfTextFromFile(file);
                    if (extractedText) {
                        apiContent.push({ type: 'text', text: extractedText });
                        const base64Str = await getBase64Payload(file);
                        apiContent.push({
                            type: 'document',
                            mime_type: file.type || 'application/pdf',
                            name: file.name,
                            data: base64Str,
                        });
                    } else {
                        apiContent.push({ type: 'text', text: `The user uploaded a scanned/image-based PDF named "${file.name}". The pages are rendered below as images — read them visually to answer.` });
                        const pageImages = await renderPdfPagesToImages(file);
                        for (const img of pageImages) {
                            apiContent.push({ type: 'image_url', image_url: { url: img } });
                        }
                    }
                }


                for (const file of imageFiles) {
                    const base64Str = await getBase64(file);
                    apiContent.push({ type: 'image_url', image_url: { url: base64Str } });
                }
            }

            const previousMessagesForApi = messages.map((msg) => ({
                messageId: msg.messageId,
                role: msg.role === 'ai' ? 'assistant' : msg.role,
                content: msg.content || '',
            }));

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            else if (anonId) headers['X-Anon-Id'] = anonId;

            const chatRes = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    conversationId: activeConversationId,
                    messages: [...previousMessagesForApi, { messageId: userMessageId, role: 'user', content: apiContent }],
                    model: selectedModel,
                }),
            });

            if (!chatRes.ok) {
                if (chatRes.status === 429) {
                    const errData = await chatRes.json().catch(() => ({}));
                    if (errData.isAnon) {
                        setQuotaExceeded(true);
                        setMessages((prev) => prev.filter((m) => m.messageId !== pendingAssistantId));
                        return;
                    }
                    throw new Error(errData.message || 'Daily limit reached.');
                }
                let errorMessage = `Request failed with status ${chatRes.status}`;
                try {
                    const errorData = await chatRes.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }

            if (!chatRes.body) {
                throw new Error('No response body received from the server.');
            }

            const reader = chatRes.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            let metadata = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                let chunk = decoder.decode(value, { stream: true });
                if (chunk.includes('__JSON_METADATA__')) {
                    const parts = chunk.split('__JSON_METADATA__');
                    chunk = parts[0];
                    if (parts[1]) {
                        try {
                            metadata = JSON.parse(parts[1]);
                            if (metadata?.conversationId) {
                                setActiveConversationId(metadata.conversationId);
                            }
                        } catch (error) {
                            console.error('Failed to parse metadata', error);
                        }
                    }
                }

                fullReply += chunk;
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: 'ai',
                        content: fullReply,
                        messageId: metadata?.assistantMessageId || pendingAssistantId,
                        ...(metadata && { usage: metadata.usage, cost: metadata.cost }),
                    };
                    return updated;
                });
            }

            if (fullReply && isMcqContent(fullReply)) {
                try {
                    const snapChatId = metadata?.conversationId || activeConversationId;
                    if (snapChatId && auth.currentUser) {
                        const snapToken = await auth.currentUser.getIdToken();
                        await saveSnapshot(snapToken, snapChatId, 'MCQ Set', fullReply);
                    }
                } catch {}
            }

            if (auth.currentUser) {
                fetchConversations();
            } else if (fullReply) {
                // Persist anonymous conversation to localStorage
                setMessages((currentMsgs) => {
                    const convId = activeAnonConversationId || crypto.randomUUID();
                    const saveable = currentMsgs
                        .filter((m) => m.content)
                        .map((m) => ({ role: m.role, content: m.content, messageId: m.messageId }));
                    const title = makeAnonTitle(
                        currentMsgs.find((m) => m.role === 'user')?.content || ''
                    );
                    setAnonConversations((prev) => {
                        const exists = prev.find((c) => c.id === convId);
                        let updated;
                        if (exists) {
                            updated = prev.map((c) => c.id === convId ? { ...c, messages: saveable, updatedAt: Date.now() } : c);
                        } else {
                            updated = [{ id: convId, title, messages: saveable, updatedAt: Date.now() }, ...prev];
                            setActiveAnonConversationId(convId);
                        }
                        try { localStorage.setItem('mujinny_anon_chats', JSON.stringify(updated)); } catch {}
                        return updated;
                    });
                    return currentMsgs;
                });
            }
        } catch (error) {
            const friendlyMessage = buildRequestErrorMessage(error);
            setMessages((prev) => {
                const hasPendingAssistant = prev[prev.length - 1]?.role === 'ai' && prev[prev.length - 1]?.content === '';
                if (hasPendingAssistant) {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'ai', content: friendlyMessage };
                    return updated;
                }
                return [...prev, { role: 'ai', content: friendlyMessage }];
            });
        } finally {
            setLoading(false);
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.focus();
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...newFiles]);
        }
        e.target.value = '';
    };

    const removeFile = (indexToRemove) => {
        setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const deleteConversation = async (id) => {
        if (!auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await fetch(`${API_URL}/api/conversations/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setConversations((prev) => prev.filter((c) => c._id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
        setMenuOpenId(null);
    };

    const startRename = (id, currentTitle) => {
        setEditingId(id);
        setEditTitle(currentTitle || '');
        setMenuOpenId(null);
    };

    const submitRename = async (id) => {
        if (!auth.currentUser || !editTitle.trim()) { setEditingId(null); return; }
        try {
            const token = await auth.currentUser.getIdToken();
            await fetch(`${API_URL}/api/conversations/${id}/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: editTitle.trim() }),
            });
            setConversations((prev) => prev.map((c) => c._id === id ? { ...c, title: editTitle.trim() } : c));
        } catch (err) {
            console.error('Rename failed:', err);
        }
        setEditingId(null);
    };

    useEffect(() => {
        if (!menuOpenId) return;
        const close = () => setMenuOpenId(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [menuOpenId]);

    const isEmptyState = messages.length === 0;
    const recentConversations = conversations;
    const userAvatarText = getInitials(user?.displayName || user?.email, 'U');
    const isSidebarExpanded = !sidebarCollapsed;
    const currentHeroLine = HERO_ROTATING_LINES[heroLineIndex] || HERO_ROTATING_LINES[0];

    return (
        <div className="h-[100dvh] w-full overflow-hidden bg-[#171a21] text-slate-100">
            {quotaExceeded && <QuotaExceededModal onClose={() => setQuotaExceeded(false)} />}
            <div className="flex h-full w-full overflow-hidden">
                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        className="absolute inset-0 z-20 bg-black/45 backdrop-blur-[2px] lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    onMouseEnter={() => {
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                    }}
                    className={`absolute inset-y-0 left-0 z-30 border-r border-white/8 bg-[#0f1219] transition-[width,transform] duration-200 lg:relative lg:translate-x-0 ${
                        isSidebarExpanded ? 'w-[280px] sm:w-[246px]' : 'w-[76px]'
                    } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="flex h-full min-h-0 flex-col">
                        <div className={`flex border-b border-white/8 px-3 py-3 ${isSidebarExpanded ? 'items-center justify-between' : 'justify-center'}`}>
                            <div className={`flex items-center text-sm font-semibold text-slate-100 ${isSidebarExpanded ? 'gap-2' : 'justify-center'}`}>
                                <div className="h-6 w-6 overflow-hidden rounded-full">
                                    <img src="/MUJinny-Logo.png" alt="MUJinny" className="h-full w-full object-cover" />
                                </div>
                                {isSidebarExpanded ? <span suppressHydrationWarning>MUJinny</span> : null}
                            </div>
                            {isSidebarExpanded ? (
                                <div className="flex items-center gap-2">
                                    {!sidebarCollapsed ? (
                                        <button
                                            type="button"
                                            className="hidden rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 lg:flex"
                                            onClick={() => setSidebarCollapsed(true)}
                                            aria-label="Collapse sidebar"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 lg:hidden"
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="px-3 py-3">
                            {!isSidebarExpanded ? (
                                <button
                                    type="button"
                                    className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5"
                                    aria-label="Search"
                                >
                                    <Search className="h-[18px] w-[18px]" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-slate-400">
                                    <Search className="h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="px-3">
                            {isSidebarExpanded ? (
                                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Main Menu</div>
                            ) : null}
                            {SIDEBAR_LINKS.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.id === 'new' && isEmptyState;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={item.id === 'new' ? handleNewChat : undefined}
                                        className={`mb-1 flex w-full items-center rounded-xl text-[13px] transition ${
                                            isActive ? 'bg-[#274792] text-white' : 'text-slate-300 hover:bg-white/5'
                                        } ${isSidebarExpanded ? 'gap-2 px-3 py-2.5' : 'mx-auto h-11 w-11 justify-center px-0 py-0'}`}
                                        aria-label={item.label}
                                        title={!isSidebarExpanded ? item.label : undefined}
                                    >
                                        <Icon className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} />
                                        {isSidebarExpanded ? item.label : null}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="min-h-0 flex-1 px-3 pb-3 pt-4">
                            {isSidebarExpanded && (
                                <>
                                    <div className="border-t border-white/8 pt-3">
                                        <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Chats</div>
                                    </div>
                                    <div className="app-scrollbar mt-2 h-full space-y-0.5 overflow-y-auto pr-1">
                                    {(userLoading || historyLoading) ? (
                                        <div className="flex items-center justify-center py-6">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
                                        </div>
                                    ) : (user ? recentConversations : anonConversations).length === 0 ? (
                                        <p className="px-2 pt-1 text-[11px] text-slate-600">Your conversations will appear here.</p>
                                    ) : null}
                                        {!userLoading && !historyLoading && user ? recentConversations.map((conversation, index) => (
                                            <div
                                                key={conversation._id || index}
                                                className={`group relative flex items-center rounded-lg transition ${conversation._id === activeConversationId ? 'bg-white/6' : 'hover:bg-white/5'}`}
                                            >
                                                {editingId === conversation._id ? (
                                                    <input
                                                        autoFocus
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onBlur={() => submitRename(conversation._id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') submitRename(conversation._id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        className="w-full rounded-lg bg-white/8 px-3 py-2 text-[11px] text-slate-200 outline-none"
                                                    />
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => loadConversation(conversation._id)}
                                                            className={`min-w-0 flex-1 px-3 py-2 text-left text-[11px] leading-5 ${conversation._id === activeConversationId ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`}
                                                        >
                                                            <div className="truncate">{conversation.title || `Conversation ${index + 1}`}</div>
                                                        </button>
                                                        <div className="relative shrink-0 pr-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conversation._id ? null : conversation._id); }}
                                                                className="flex h-6 w-6 items-center justify-center rounded opacity-0 text-slate-500 transition hover:bg-white/8 hover:text-slate-300 group-hover:opacity-100"
                                                            >
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </button>
                                                            {menuOpenId === conversation._id && (
                                                                <div className="absolute right-0 top-7 z-50 min-w-[120px] overflow-hidden rounded-lg border border-white/8 bg-[#1e2330] py-1 shadow-xl">
                                                                    <button type="button" onClick={() => startRename(conversation._id, conversation.title)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/8">
                                                                        <Pencil className="h-3 w-3" /> Rename
                                                                    </button>
                                                                    <button type="button" onClick={() => deleteConversation(conversation._id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-white/8">
                                                                        <Trash2 className="h-3 w-3" /> Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )) : !userLoading && anonConversations.map((conversation, index) => (
                                            <div
                                                key={conversation.id}
                                                className={`group relative flex items-center rounded-lg transition ${conversation.id === activeAnonConversationId ? 'bg-white/6' : 'hover:bg-white/5'}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => loadAnonConversation(conversation.id)}
                                                    className={`min-w-0 flex-1 px-3 py-2 text-left text-[11px] leading-5 ${conversation.id === activeAnonConversationId ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`}
                                                >
                                                    <div className="truncate">{conversation.title || `Chat ${index + 1}`}</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteAnonConversation(conversation.id)}
                                                    className="mr-1 flex h-6 w-6 items-center justify-center rounded opacity-0 text-slate-500 transition hover:bg-white/8 hover:text-red-400 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>


                        <div className="border-t border-white/8 px-1 pb-2 pt-2">
                            {user ? (
                                <UserProfileCard user={user} onLogout={handleLogout} collapsed={!isSidebarExpanded} />
                            ) : (
                                !userLoading && (
                                    <div className="px-3 pb-3 pt-2">
                                        <Link
                                            href="/login"
                                            className={`flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-slate-200 ${
                                                isSidebarExpanded ? 'gap-2 px-4 py-3' : 'px-0 py-3'
                                            }`}
                                            title={!isSidebarExpanded ? 'Sign In / Register' : undefined}
                                        >
                                            <LogIn className="h-4 w-4" />
                                            {isSidebarExpanded ? 'Sign In / Register' : null}
                                        </Link>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </aside>

                <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#171a21]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px,44px_44px]" />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-[linear-gradient(90deg,rgba(27,32,93,0.82)_0%,rgba(27,32,93,0.52)_34%,rgba(23,26,33,0)_100%)]" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[36%] bg-[linear-gradient(270deg,rgba(17,19,26,0.18)_0%,rgba(17,19,26,0)_56%)]" />

                    <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-white/8 px-3 py-2 sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-100 sm:text-[15px]">MUJinny Chat Assistant</div>
                                {!isEmptyState && <div className="hidden text-xs text-slate-500 sm:block">Premium workspace</div>}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <div className="relative">
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="h-8 max-w-[118px] appearance-none rounded-full border border-white/10 bg-white/5 px-2.5 py-1 pr-8 text-[11px] font-medium text-slate-100 outline-none sm:h-auto sm:max-w-none sm:px-4 sm:py-2 sm:pr-10 sm:text-sm"
                                >
                                    {MODEL_OPTIONS.map((option) => {
                                        const isDeepForAnon = option.value === 'gpt-5.2' && !user;
                                        return (
                                            <option key={option.value} value={option.value} disabled={isDeepForAnon}>
                                                {isMobileViewport ? option.mobileLabel || option.label : option.label}
                                                {isDeepForAnon ? ' (Login required)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:right-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                    </header>

                    <div className="relative flex min-h-0 flex-1 flex-col bg-transparent">
                        <div ref={messageViewportRef} onScroll={updateAutoScrollState} className="app-scrollbar min-h-0 flex-1 overflow-y-auto py-4 sm:py-5">
                            <div className="contentColumn pb-32 sm:pb-36">
                                {isEmptyState ? (
                                    <div className="flex min-h-full items-center justify-center py-12 sm:py-16">
                                        <div className="flex w-full max-w-[720px] flex-col items-center text-center">
                                            <h1
                                                className="max-w-[720px] text-[30px] font-semibold tracking-tight text-white sm:text-[40px] lg:text-[52px]"
                                                aria-label={currentHeroLine}
                                            >
                                                <span key={heroLineIndex} className="hero-rotating-line" aria-hidden="true">
                                                    {currentHeroLine}
                                                </span>
                                            </h1>
                                            <p className="mt-4 max-w-[620px] text-sm leading-6 text-slate-400 sm:text-[15px] sm:leading-7">
                                                Ask anything, upload files, and continue conversations in one workspace.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, index) => (
                                            <ChatMessage
                                                key={msg.messageId || index}
                                                message={msg}
                                                isUser={msg.role === 'user'}
                                                userAvatarText={userAvatarText}
                                                chatId={activeConversationId}
                                            />
                                        ))}

                                    </>
                                )}
                                <div ref={bottomSentinelRef} />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-transparent pb-[calc(var(--safe-bottom)+0.75rem)] pt-3">
                            <div className="contentColumn">
                                {!isEmptyState && !autoScrollEnabled && (
                                    <div className="mb-3 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleJumpToLatest}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(12,17,30,0.88)] px-3 py-2 text-xs font-medium text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-[rgba(22,29,48,0.96)]"
                                        >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                            Jump to latest
                                        </button>
                                    </div>
                                )}
                                {isEmptyState && (
                                    <div className="mb-3 flex flex-wrap justify-center gap-2">
                                        {EMPTY_PROMPTS.map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                className="max-w-full rounded-full border border-white/8 bg-black/25 px-3 py-2 text-[12px] text-slate-300 transition hover:bg-white/5 sm:text-[13px]"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <ChatInput
                                    input={input}
                                    loading={loading}
                                    inputRef={inputRef}
                                    fileInputRef={fileInputRef}
                                    selectedFiles={selectedFiles}
                                    onInputChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onSubmit={sendMessage}
                                    onFileChange={handleFileChange}
                                    onTriggerFileInput={triggerFileInput}
                                    onRemoveFile={removeFile}
                                    onAddFiles={(files) => setSelectedFiles((prev) => [...prev, ...files])}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
