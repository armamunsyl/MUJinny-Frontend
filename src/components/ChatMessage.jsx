import { useState, useEffect } from 'react';
import ImageGrid from '@/components/ImageGrid';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MessageActions from '@/components/MessageActions';

const THINKING_WORDS = ['Thinking', 'Analysing', 'Processing', 'Generating'];

function ThinkingIndicator() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % THINKING_WORDS.length), 1800);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <span className="transition-all duration-300">{THINKING_WORDS[index]}</span>
            <span className="animate-bounce" style={{ animationDelay: '-0.3s' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '-0.15s' }}>.</span>
            <span className="animate-bounce">.</span>
        </div>
    );
}

export default function ChatMessage({ message, isUser, userAvatarText, chatId }) {
    return (
        <div className="py-2.5 sm:py-3">
            {isUser ? (
                <div className="flex items-end justify-end gap-2 sm:gap-3">
                    <div className="max-w-[85%] space-y-2 sm:max-w-[78%] lg:max-w-[70%]">
                        <ImageGrid files={message.attachedFiles || []} align="right" />
                        {message.content ? (
                            <div className="ml-auto w-fit max-w-full rounded-2xl rounded-br-md bg-[#2563EB] px-3.5 py-2.5 text-[14px] leading-6 text-white sm:px-4 sm:text-[15px] sm:leading-7">
                                <MarkdownRenderer
                                    content={message.content}
                                    className="chat-markdown-inverse text-white"
                                    chatId={chatId}
                                    messageId={message.messageId}
                                />
                            </div>
                        ) : null}
                    </div>
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-[11px] font-semibold text-white sm:flex">
                        {userAvatarText}
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="mt-1 hidden h-8 w-8 shrink-0 overflow-hidden rounded-full sm:flex">
                        <img src="/MUJinny-Logo.png" alt="MUJinny" className="h-full w-full object-cover" />
                    </div>
                    <div className="group min-w-0 max-w-full flex-1 text-[14px] leading-6 text-slate-200 sm:text-[15px] sm:leading-7">
                        {!message.content ? (
                            <div className="py-1">
                                <ThinkingIndicator />
                            </div>
                        ) : (
                            <>
                                <MarkdownRenderer content={message.content} className="chat-markdown-justify" chatId={chatId} messageId={message.messageId} />
                                <div className="mt-1.5">
                                    <MessageActions content={message.content} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
