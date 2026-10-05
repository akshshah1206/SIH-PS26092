// Voice Assistant Module for Beneficiary Accessibility
class VoiceAssistant {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentLang = 'en-IN';
    this.isSpeaking = false;
  }

  setLanguage(langCode) {
    if (langCode === 'hi') {
      this.currentLang = 'hi-IN';
    } else {
      this.currentLang = 'en-IN';
    }
  }

  speak(text, onEndCallback = null) {
    if (!this.synth) {
      console.warn("Speech synthesis not supported on this browser.");
      return;
    }

    // Cancel ongoing speech
    this.synth.cancel();

    if (!text || text.trim() === '') return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.currentLang;
    utterance.rate = 0.95; // Slightly slower for better clarity
    utterance.pitch = 1.0;

    // Pick best available matching voice
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(this.currentLang.slice(0, 2)));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      const btn = document.getElementById('globalVoiceBtn');
      if (btn) btn.classList.add('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      const btn = document.getElementById('globalVoiceBtn');
      if (btn) btn.classList.remove('speaking');
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      this.isSpeaking = false;
      const btn = document.getElementById('globalVoiceBtn');
      if (btn) btn.classList.remove('speaking');
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

window.voiceAssistant = new VoiceAssistant();
