import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/CodeBlock';

export default function MarkdownRenderer({ content, className = '', chatId = null, messageId = null }) {
    return (
        <div className={`chat-markdown min-w-0 ${className}`.trim()}>
            <ReactMarkdown
                skipHtml
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    a({ href, children, ...props }) {
                        return (
                            <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
                                {children}
                            </a>
                        );
                    },
                    pre({ children }) {
                        return (
                            <CodeBlock
                                chatId={chatId}
                                messageId={messageId}
                            >
                                {children}
                            </CodeBlock>
                        );
                    },
                    code({ className: codeClassName, children, ...props }) {
                        return (
                            <code className={codeClassName} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
