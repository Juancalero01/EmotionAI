import { useState, useEffect, useRef } from 'react';

/**
 * Custom React Hook providing browser-native Web Speech API SpeechRecognition integration.
 * Forces Spanish speech recognition engine and automatically reconnects on voice pause.
 * @param {Function} onTranscript Callback fired with final transcript strings
 * @returns {{ isListening: boolean, startListening: Function, stopListening: Function, error: string|null }}
 */
export const useSpeechToText = (onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Ref tracking whether the user intends the microphone to remain active
  const shouldListenRef = useRef(false);

  const cleanupRecognition = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      // Detach callbacks to prevent residual execution when destroying stale instance
      recognitionRef.current.onstart = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping stale instance
      }
      recognitionRef.current = null;
    }
  };

  const startListeningInstance = () => {
    cleanupRecognition();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Este navegador no soporta Speech Recognition (Reconocimiento de Voz). Te recomendamos usar Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continuous listening
      recognition.interimResults = false;

      // Force Spanish speech recognition engine (es-ES / es-AR) regardless of browser locale
      let systemLang = navigator.language || 'es-ES';
      if (!systemLang.startsWith('es')) {
        systemLang = 'es-ES';
      } else if (systemLang === 'es-419' || systemLang.toLowerCase() === 'es') {
        systemLang = 'es-AR';
      }
      recognition.lang = systemLang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        // Collect final transcript turns
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcriptText = event.results[i][0].transcript.trim();
            if (transcriptText && onTranscript) {
              onTranscript(transcriptText);
            }
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition instance error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied by browser.');
          setIsListening(false);
          shouldListenRef.current = false;
        } else if (event.error === 'network') {
          setError('Network connection error with speech recognition service.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Instant seamless restart if user intended microphone to remain active
        if (shouldListenRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              startListeningInstance();
            }
          }, 50); // Ultra-fast 50ms buffer to keep audio pipeline open
        } else {
          setIsListening(false);
          cleanupRecognition();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error al crear e iniciar SpeechRecognition:", err);
      setError("No se pudo iniciar el servicio de reconocimiento de voz.");
      setIsListening(false);
      shouldListenRef.current = false;
    }
  };

  const startListening = () => {
    shouldListenRef.current = true;
    startListeningInstance();
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        cleanupRecognition();
      }
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      cleanupRecognition();
    };
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    error
  };
};
