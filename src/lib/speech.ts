/**
 * Speech service abstraction. The browser Web Speech API is the default
 * provider; swap this implementation for a server STT provider later without
 * touching the UI.
 */
export type SpeechProvider = {
  isSupported: () => boolean;
  start: (opts: {
    lang: string;
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (code: string) => void;
    onEnd: () => void;
  }) => () => void;
};

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const browserSpeech: SpeechProvider = {
  isSupported: () => getCtor() !== null,
  start: ({ lang, onResult, onError, onEnd }) => {
    const Ctor = getCtor();
    if (!Ctor) {
      onError("unsupported");
      return () => {};
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (!last) return;
      onResult(last[0]?.transcript ?? "", last.isFinal);
    };
    rec.onerror = (e) => onError(e.error);
    rec.onend = onEnd;
    rec.start();
    return () => rec.stop();
  },
};