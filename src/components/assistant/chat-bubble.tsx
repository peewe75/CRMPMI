'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
}

// Regex combinato: cattura **grassetto** (anche con spazi interni) oppure [proposta:ID]
const INLINE_RE = /\*\*\s*([^*]+?)\s*\*\*|\[proposta:([^\]]+)\]/g;

/**
 * Converte il testo dell'assistente in JSX con:
 * - **testo** → <strong> (es. numeri in grassetto)
 * - [proposta:ID] → link cliccabile verso /dashboard/proposals
 * - \n → <br />
 */
function renderText(text: string): React.ReactNode {
  // First, clean up common LLM formatting artifacts
  const cleaned = text
    .replace(/\*\*\s+/g, '**')  // "** 11" → "**11"
    .replace(/\s+\*\*/g, '**'); // "movimenti **" → "movimenti**"

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_RE.lastIndex = 0; // reset per uso sicuro con flag /g

  while ((match = INLINE_RE.exec(cleaned)) !== null) {
    // Testo normale prima del match
    if (match.index > lastIndex) {
      parts.push(...splitNewlines(cleaned.slice(lastIndex, match.index), key));
      key += 10;
    }

    if (match[1] !== undefined) {
      // **grassetto**
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[1].trim()}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      // [proposta:ID]
      parts.push(
        <Link
          key={key++}
          href="/dashboard/proposals"
          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 underline-offset-2 transition hover:bg-blue-100"
        >
          Vai alla proposta →
        </Link>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Testo rimanente dopo l'ultimo match
  if (lastIndex < cleaned.length) {
    parts.push(...splitNewlines(cleaned.slice(lastIndex), key));
  }

  return parts.length > 0 ? parts : text;
}

/** Split text by newlines, inserting <br /> elements */
function splitNewlines(text: string, startKey: number): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) nodes.push(<br key={`br-${startKey}-${i}`} />);
    if (line) nodes.push(line);
  });
  return nodes;
}

export function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === 'user';

  if (!text) return null;

  return (
    <div
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
      style={{ animation: 'fade-in-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-[24px] px-5 py-3.5 text-[14px] leading-[1.6] whitespace-pre-wrap transition-all',
          isUser
            ? 'rounded-br-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 selection:bg-blue-300/30'
            : 'glass rounded-bl-lg text-gray-800 dark:text-gray-200 shadow-sm border-white/40 dark:border-slate-700 ring-1 ring-black/[0.03] dark:ring-white/[0.05]',
        )}
      >
        {isUser ? (
          <span className="font-medium tracking-tight">{text}</span>
        ) : (
          <div className="assistant-content">{renderText(text)}</div>
        )}
      </div>
    </div>
  );
}
