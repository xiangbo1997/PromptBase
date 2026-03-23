"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@promptbase/ui";

interface MarkdownResultProps {
  content: string;
  isStreaming: boolean;
  emptyText: string;
  className?: string;
}

export function MarkdownResult({ content, isStreaming, emptyText, className }: MarkdownResultProps) {
  if (!content && !isStreaming) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-center text-muted-foreground italic text-sm", className)}>
        {emptyText}
      </div>
    );
  }

  if (isStreaming) {
    return (
      <pre className={cn("whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground", className)}>
        {content}
        <span className="ml-1 inline-block h-4 w-1.5 animate-pulse align-middle bg-primary" />
      </pre>
    );
  }

  return (
    <div className={cn("text-sm leading-7 text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ className, ...props }) => <h1 className={cn("mt-6 text-2xl font-bold first:mt-0", className)} {...props} />,
          h2: ({ className, ...props }) => <h2 className={cn("mt-6 text-xl font-bold first:mt-0", className)} {...props} />,
          h3: ({ className, ...props }) => <h3 className={cn("mt-5 text-lg font-semibold first:mt-0", className)} {...props} />,
          p: ({ className, ...props }) => <p className={cn("mt-4 first:mt-0", className)} {...props} />,
          ul: ({ className, ...props }) => <ul className={cn("mt-4 list-disc space-y-2 pl-6", className)} {...props} />,
          ol: ({ className, ...props }) => <ol className={cn("mt-4 list-decimal space-y-2 pl-6", className)} {...props} />,
          li: ({ className, ...props }) => <li className={cn("marker:text-muted-foreground", className)} {...props} />,
          blockquote: ({ className, ...props }) => (
            <blockquote className={cn("mt-4 border-l-2 border-border pl-4 italic text-muted-foreground", className)} {...props} />
          ),
          a: ({ className, ...props }) => (
            <a
              className={cn("font-medium text-primary underline underline-offset-4 hover:opacity-80", className)}
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          table: ({ className, ...props }) => (
            <div className="mt-4 overflow-x-auto">
              <table className={cn("min-w-full border-collapse text-left text-sm", className)} {...props} />
            </div>
          ),
          thead: ({ className, ...props }) => <thead className={cn("border-b border-border bg-muted/40", className)} {...props} />,
          th: ({ className, ...props }) => <th className={cn("px-3 py-2 font-semibold", className)} {...props} />,
          td: ({ className, ...props }) => <td className={cn("border-b border-border px-3 py-2 align-top", className)} {...props} />,
          code: ({ className, children, ...props }) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code
                  className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]", className)}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={cn("block overflow-x-auto rounded-xl bg-muted/70 p-4 font-mono text-xs leading-6", className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ className, ...props }) => <pre className={cn("mt-4 whitespace-pre-wrap", className)} {...props} />,
          hr: ({ className, ...props }) => <hr className={cn("my-6 border-border", className)} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
