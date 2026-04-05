'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeOff, Package, BarChart2, Upload, ShoppingBag } from 'lucide-react';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { AssistantAvatar } from '@/components/assistant/assistant-avatar';
import { ChatBubble } from '@/components/assistant/chat-bubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_KEY = 'silhouette_messages';

const SUGGESTION_CHIPS = [
  { text: 'Quante scarpe ho?', icon: Package },
  { text: "Com'è andata oggi?", icon: BarChart2 },
  { text: 'Carica merce', icon: Upload },
  { text: 'Quante borse ho?', icon: ShoppingBag },
];

const QUICK_ACTIONS = [
  'Mostra dettagli',
  'Carica merce',
  'Scarica merce',
];

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

export default function AssistantPage() {
  const { isListening, transcript, error: voiceError, isSupported, startListening, stopListening, resetTranscript } =
    useVoiceInput();

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTranscriptRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    if (mounted) saveMessages(messages);
  }, [messages, mounted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, statusText]);

  useEffect(() => {
    if (!isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      handleSend(transcript);
      resetTranscript();
    }
  }, [isListening, transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = useCallback(
    (text: string) => {
      if (!speechEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.05;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [speechEnabled],
  );

  async function handleSend(text?: string) {
    const message = (text ?? inputText).trim();
    if (!message || isProcessing) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: message };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInputText('');
    setIsProcessing(true);
    setStatusText('');
    setAvatarStatus('idle');

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.error ?? `Errore ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming non supportato');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const data = JSON.parse(payload);

            switch (currentEvent) {
              case 'status':
                setStatusText(data.text ?? 'Elaboro...');
                break;
              case 'delta':
                fullText += data.text ?? '';
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: fullText } : m)),
                );
                break;
              case 'done':
                fullText = data.reply || fullText || 'Non ho una risposta.';
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: fullText } : m)),
                );
                setAvatarStatus('success');
                setTimeout(() => setAvatarStatus('idle'), 2000);
                break;
              case 'error':
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: data.text ?? 'Errore' } : m)),
                );
                setAvatarStatus('error');
                setTimeout(() => setAvatarStatus('idle'), 3000);
                break;
            }

            currentEvent = '';
          } catch {
            // skip malformed JSON
          }
        }
      }

      if (fullText) {
        speak(fullText);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const errorText = err instanceof Error ? err.message : 'Errore di comunicazione con il server';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: errorText } : m)),
      );
      setAvatarStatus('error');
      setTimeout(() => setAvatarStatus('idle'), 3000);
    } finally {
      setIsProcessing(false);
      setStatusText('');
      abortRef.current = null;
    }
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function toggleSpeech() {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSpeechEnabled((prev) => !prev);
  }

  return (
    <div className="mesh-bg relative flex h-[calc(100dvh-4rem-5rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <div className="noise-overlay" />
      
      {/* Header */}
        <div className="glass sticky top-0 z-10 flex items-center justify-between px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h1 className="text-xs font-bold tracking-tight text-gray-900 md:text-sm uppercase">Assistente Silhouette</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="rounded-full bg-gray-100/50 px-3 py-1 text-[10px] font-medium text-gray-600 transition hover:bg-gray-200/80 hover:text-gray-900"
              title="Cancella cronologia"
            >
              Clear
            </button>
          )}
          <button
            onClick={toggleSpeech}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100/50 text-gray-600 transition hover:bg-gray-200/80 hover:text-gray-900"
            title={speechEnabled ? 'Disattiva voce' : 'Attiva voce'}
          >
            {speechEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress bar — visible during processing */}
      {isProcessing && (
        <div className="z-20 h-[1px] w-full overflow-hidden bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400"
            style={{ 
              animation: 'progress-indeterminate 1.8s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
              boxShadow: '0 0 8px rgba(59,130,246,0.4)'
            }}
          />
        </div>
      )}

      {/* Avatar + Chat area */}
      <div ref={scrollRef} className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto">
        {/* Avatar section */}
        <div className="flex flex-col items-center pb-6 pt-8 md:pb-10 md:pt-12">
          <div className="relative">
            <div className={`absolute inset-0 -m-4 animate-pulse rounded-full bg-blue-500/10 blur-2xl transition-opacity duration-1000 ${isSpeaking || isListening ? 'opacity-100' : 'opacity-0'}`} />
            <AssistantAvatar
              isSpeaking={isSpeaking}
              isListening={isListening}
              status={avatarStatus}
              className="relative h-32 w-24 md:h-44 md:w-32"
            />
          </div>
          <div className="mt-5 flex flex-col items-center gap-1">
            <p className="text-[11px] font-semibold tracking-widest text-blue-500 uppercase">
              {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isProcessing ? 'Thinking' : 'Online'}
            </p>
            <p className="max-w-[80%] text-center text-xs font-medium text-gray-500 md:text-sm">
              {statusText || (isListening ? 'Ti ascolto...' : isSpeaking ? 'Sto rispondendo...' : 'Come posso aiutarti oggi?')}
            </p>
          </div>
        </div>

        {/* Onboarding welcome message */}
        {messages.length === 0 && !isProcessing && (
          <div
            className="mx-auto w-full max-w-md px-6 pb-6"
            style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both' }}
          >
            <div className="glass rounded-2xl p-5 text-sm leading-relaxed text-gray-700 shadow-xl shadow-blue-500/5">
              <span className="mb-2 block font-bold text-gray-900">Ciao, sono Silhouette.</span>
              Bentornato! Posso analizzare le tue giacenze, aiutarti con il carico merce o darti un riepilogo della giornata. Cosa desideri fare?
            </div>
          </div>
        )}

        {/* Suggestion chips — shown when chat is empty */}
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-wrap justify-center gap-2.5 px-6 pb-8">
            {SUGGESTION_CHIPS.map((chip, i) => (
              <button
                key={chip.text}
                onClick={() => handleSend(chip.text)}
                style={{ animation: `fade-in-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${0.4 + i * 0.1}s both` }}
                className="group flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
              >
                <chip.icon className="h-3.5 w-3.5 text-blue-500 transition-transform group-hover:scale-110" />
                {chip.text}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-5 px-4 pb-10 md:px-8">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
          ))}

          {/* Quick action buttons after last assistant message */}
          {!isProcessing && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-wrap gap-2 duration-500">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className="rounded-full border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input bar section */}
      <div className="glass safe-bottom border-t border-white/20 p-4">
        {/* Interim transcript preview */}
        {isListening && transcript && (
          <div className="mb-4 flex animate-in fade-in slide-in-from-bottom-1 items-center gap-2 rounded-xl bg-blue-50/50 p-3 text-xs italic text-blue-600 backdrop-blur-md">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            &ldquo;{transcript}&rdquo;
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mb-4 rounded-xl bg-red-50/50 p-3 text-xs text-red-600 backdrop-blur-md">
            {voiceError}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Mic button */}
          {mounted && isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                isListening
                  ? 'animate-pulse bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:scale-105 hover:bg-blue-500 hover:shadow-[0_6px_16px_rgba(37,99,235,0.3)]'
              } disabled:opacity-40`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Text input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={isProcessing}
                className="h-12 rounded-2xl border-white/40 bg-white/60 pl-4 pr-12 focus-visible:ring-blue-500/30"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
