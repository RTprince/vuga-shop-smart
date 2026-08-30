# DukaSmart multilingual VoiceSheet

VoiceSheet now supports explicit speech-language selection for Kinyarwanda, English, French and Kiswahili.

## Architecture
- Browser Web Speech API handles microphone speech-to-text when supported.
- The selected BCP-47 language code is passed to the recognition engine and to the server interpreter.
- The server interpreter understands the four languages and has deterministic Kinyarwanda/English/French/Kiswahili command fallbacks for common shop phrases.
- Voice input NEVER writes stock directly. Confirmed transactions continue through the protected Supabase stock transaction paths.
- Browser speech synthesis can read the transcript/confirmation back to the user using the selected language.

## Important production note
Web Speech `SpeechRecognition` support is browser-dependent, and a browser may not support every requested language. The UI therefore keeps text input available and reports `language-not-supported` instead of silently pretending recognition worked.

For production-grade, consistent Kinyarwanda recognition across browsers/devices, a dedicated STT provider can later be added behind `src/lib/speech.ts` without changing the VoiceSheet transaction flow.
