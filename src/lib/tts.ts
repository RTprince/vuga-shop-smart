/**
 * Text-to-speech using the browser's real SpeechSynthesis API.
 * There is no fake fallback: when the browser has no voice engine,
 * `isSupported()` returns false and the UI hides the listen button.
 */
import type { Lang } from "@/lib/i18n";

export const tts = {
  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },
  speak(text: string, lang: Lang) {
    if (!tts.isSupported()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Kinyarwanda voices are rare; fall back to a generic locale rather than
    // pretending we have one.
    u.lang = lang === "rw" ? "rw-RW" : "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  },
  stop() {
    if (tts.isSupported()) window.speechSynthesis.cancel();
  },
};
