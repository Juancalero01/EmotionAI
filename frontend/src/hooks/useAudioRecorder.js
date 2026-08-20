import { useRef, useCallback } from 'react';

/**
 * Custom React Hook managing client-side MediaRecorder audio capture lifecycle.
 * Collects microphone chunks into an in-memory Audio Blob for post-call playback and upload.
 * @returns {{ startRecording: Function, pauseRecording: Function, resumeRecording: Function, stopRecording: Function }}
 */
export const useAudioRecorder = () => {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);

  /**
   * Initializes microphone audio stream and MediaRecorder instance in deferred pause state.
   */
  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia is not supported by this browser.");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // collect 500ms chunks
      try {
        recorder.pause(); // start in paused state until a microphone becomes active
      } catch (e) {
        console.warn("Initial MediaRecorder pause deferred until active state:", e);
      }
      return true;
    } catch (err) {
      console.warn("Unable to access microphone for call audio recording:", err);
      return false;
    }
  }, []);

  /**
   * Resumes MediaRecorder audio capture when a microphone becomes active.
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
      } catch (e) {
        console.warn("Error resuming AudioRecorder:", e);
      }
    }
  }, []);

  /**
   * Pauses MediaRecorder audio capture when no microphone is active.
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
      } catch (e) {
        console.warn("Error pausing AudioRecorder:", e);
      }
    }
  }, []);

  /**
   * Stops MediaRecorder, releases microphone stream tracks, and resolves compiled Audio Blob.
   * @returns {Promise<Blob|null>}
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        mediaRecorderRef.current = null;

        if (audioBlob.size < 1000) {
          resolve(null);
        } else {
          resolve(audioBlob);
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        console.warn("Error stopping MediaRecorder:", e);
        resolve(null);
      }
    });
  }, []);

  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording
  };
};
