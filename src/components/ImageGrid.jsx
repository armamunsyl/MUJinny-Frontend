'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MAX_VISIBLE = 4;

export default function ImageGrid({ files = [], align = 'left' }) {
    const [previewIndex, setPreviewIndex] = useState(null);

    const { images, documents } = useMemo(() => {
        const grouped = { images: [], documents: [] };
        files.forEach((file) => {
            if (file.type?.startsWith('image/')) {
                grouped.images.push(file);
            } else {
                grouped.documents.push(file);
            }
        });
        return grouped;
    }, [files]);

    if (files.length === 0) return null;

    const visibleImages = images.slice(0, MAX_VISIBLE);
    const overflow = images.length - MAX_VISIBLE;

    const goNext = (e) => { e.stopPropagation(); setPreviewIndex((i) => (i + 1) % images.length); };
    const goPrev = (e) => { e.stopPropagation(); setPreviewIndex((i) => (i - 1 + images.length) % images.length); };

    return (
        <>
            {images.length > 0 && (
                <div
                    className={`${
                        images.length === 1
                            ? 'max-w-[140px] sm:max-w-[260px]'
                            : 'max-w-[148px] sm:max-w-[272px]'
                    } ${align === 'right' ? 'ml-auto' : ''}`}
                >
                    <div className={`grid gap-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {visibleImages.map((file, index) => {
                            const isLast = index === MAX_VISIBLE - 1 && overflow > 0;
                            return (
                                <button
                                    key={`${file.name}-${index}`}
                                    type="button"
                                    onClick={() => setPreviewIndex(index)}
                                    className="relative overflow-hidden rounded-lg bg-[#0f172a] text-left"
                                >
                                    <Image
                                        src={file.url}
                                        alt={file.name}
                                        width={160}
                                        height={160}
                                        unoptimized
                                        className="h-16 w-full object-cover sm:h-32"
                                    />
                                    {isLast && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                                            <span className="text-base font-bold text-white sm:text-xl">+{overflow + 1}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {documents.length > 0 && (
                <div className={`mt-1.5 space-y-1.5 ${align === 'right' ? 'ml-auto max-w-[220px] sm:max-w-[340px]' : 'max-w-[220px] sm:max-w-[340px]'}`}>
                    {documents.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-xl bg-[#0f172a]/80 px-2.5 py-2 text-slate-100">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8">
                                <FileText className="h-4 w-4 text-slate-300" />
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-xs font-medium">{file.name}</div>
                                <div className="mt-0.5 text-[10px] text-slate-400">{file.sizeLabel}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {previewIndex !== null && images[previewIndex] && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 p-4"
                    onClick={() => setPreviewIndex(null)}
                >
                    <button
                        type="button"
                        onClick={() => setPreviewIndex(null)}
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-slate-100 transition hover:bg-white/20"
                        aria-label="Close preview"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {images.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={goPrev}
                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    <div
                        className="relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={images[previewIndex].url}
                            alt={images[previewIndex].name}
                            width={1400}
                            height={1000}
                            unoptimized
                            className="h-auto max-h-[88vh] w-full object-contain"
                        />
                        {images.length > 1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                                {previewIndex + 1} / {images.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
