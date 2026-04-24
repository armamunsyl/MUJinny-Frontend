'use client';

import Image from 'next/image';
import { ArrowUp, FileText, Paperclip } from 'lucide-react';
import { useState } from 'react';

const formatSize = (file) => {
    if (file.sizeLabel) return file.sizeLabel;
    if (!file?.size) return 'Attachment';
    if (file.size < 1024 * 1024) {
        return `${Math.max(1, Math.round(file.size / 1024))} KB`;
    }
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ChatInput({
    input,
    loading,
    inputRef,
    fileInputRef,
    selectedFiles,
    onInputChange,
    onKeyDown,
    onSubmit,
    onFileChange,
    onTriggerFileInput,
    onRemoveFile,
    onAddFiles,
}) {
    const [isDragging, setIsDragging] = useState(false);

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imageFiles = items
            .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter(Boolean);
        if (imageFiles.length > 0) {
            e.preventDefault();
            onAddFiles(imageFiles);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(
            (f) => f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.match(/\.(txt|doc|docx)$/i)
        );
        if (files.length > 0) onAddFiles(files);
    };

    return (
        <div
            className="w-full bg-transparent"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {selectedFiles.length > 0 && (
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                    {selectedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                            <div key={`${file.name}-${index}`} className="group relative shrink-0">
                                <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-[#1e2330]">
                                    {isImage ? (
                                        <Image
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            width={48}
                                            height={48}
                                            unoptimized
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <FileText className="h-5 w-5 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile(index)}
                                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-white transition hover:bg-slate-400"
                                    aria-label="Remove"
                                >
                                    <span className="text-[9px] font-bold leading-none">✕</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <form
                onSubmit={onSubmit}
                className={`relative flex min-h-[56px] w-full items-end gap-2 rounded-[20px] border bg-[rgba(10,15,30,0.55)] px-3 py-3 backdrop-blur-[14px] transition-colors sm:gap-3 sm:px-4 sm:py-[14px] ${isDragging ? 'border-[#2f6fed] bg-[rgba(47,111,237,0.08)]' : 'border-white/8'}`}
            >
                {isDragging && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[20px]">
                        <span className="text-sm font-medium text-[#2f6fed]">Drop to attach</span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onTriggerFileInput}
                    disabled={loading}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/5 text-slate-300 transition hover:bg-white/8 sm:h-10 sm:w-10"
                    aria-label="Attach file"
                >
                    <Paperclip className="h-4 w-4" />
                </button>

                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={onKeyDown}
                    onPaste={handlePaste}
                    placeholder="Message AI chat..."
                    className="max-h-[140px] min-h-[28px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-[15px] leading-[1.45] text-slate-100 outline-none placeholder:text-slate-500 sm:text-sm"
                    rows={1}
                    disabled={loading}
                />
                <input
                    type="file"
                    multiple
                    hidden
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept="image/*,.pdf,.txt,.doc,.docx"
                />
                <button
                    type="submit"
                    disabled={loading || (!input.trim() && selectedFiles.length === 0)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f6fed] text-white transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                    aria-label="Send message"
                >
                    <ArrowUp className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
