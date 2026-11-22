import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/**
 * Utilidad accesible de lectura en voz alta para personas con baja alfabetización
 * o dificultades visuales, pronunciando en español con tono amigable.
 */
export async function leerEnVozAlta(texto: string): Promise<void> {
  try {
    if (!texto || texto.trim().length === 0) return;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-CO';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }

    Speech.speak(texto, {
      language: 'es-CO',
      pitch: 1.0,
      rate: 0.92,
    });
  } catch (err) {
    console.warn('No se pudo reproducir voz alta:', err);
  }
}

export async function detenerVozAlta(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      await Speech.stop();
    }
  } catch (err) {
    console.warn('Error al detener voz:', err);
  }
}
