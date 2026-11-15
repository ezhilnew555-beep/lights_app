// Safe wrapper around expo-speech to prevent runtime crashes when the native module is missing
let SpeechModule = null;
let isNativeModuleAvailable = false;

try {
  SpeechModule = require("expo-speech");
  isNativeModuleAvailable = !!SpeechModule;
} catch (error) {
  console.warn("SafeSpeech: expo-speech native module not linked or unavailable:", error?.message);
}

export const SafeSpeech = {
  isAvailable: () => isNativeModuleAvailable,

  speak: (text, options = {}) => {
    if (!isNativeModuleAvailable || !SpeechModule?.speak) {
      return;
    }
    try {
      SpeechModule.speak(text, options);
    } catch (err) {
      console.warn("SafeSpeech.speak failed:", err?.message);
    }
  },

  stop: () => {
    if (!isNativeModuleAvailable || !SpeechModule?.stop) {
      return;
    }
    try {
      SpeechModule.stop();
    } catch (err) {
      console.warn("SafeSpeech.stop failed:", err?.message);
    }
  },

  isSpeakingAsync: async () => {
    if (!isNativeModuleAvailable || !SpeechModule?.isSpeakingAsync) {
      return false;
    }
    try {
      return await SpeechModule.isSpeakingAsync();
    } catch (err) {
      console.warn("SafeSpeech.isSpeakingAsync failed:", err?.message);
      return false;
    }
  },
};

export default SafeSpeech;
