"use client";

/**
 * Microphone Test Component
 * Allows users to test their microphone before starting a session
 */

import { useEffect, useRef, useState } from "react";

interface MicrophoneTestProps {
  onTestComplete?: (working: boolean) => void;
}

export default function MicrophoneTest({
  onTestComplete,
}: MicrophoneTestProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<"untested" | "working" | "failed">(
    "untested"
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startTest = async () => {
    setIsTesting(true);
    setError(null);
    setMicStatus("untested");

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context and analyser
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current || !isTesting) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);

        setMicLevel(normalizedLevel);

        // If we detect sound, mark as working
        if (normalizedLevel > 5) {
          setMicStatus("working");
          onTestComplete?.(true);
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();

      console.log("[MicTest] Microphone test started successfully");
    } catch (err) {
      console.error("[MicTest] Error accessing microphone:", err);

      let errorMessage = "Failed to access microphone";
      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Microphone access denied. Please allow microphone access in your browser settings.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No microphone found. Please connect a microphone.";
        } else if (err.name === "NotReadableError") {
          errorMessage = "Microphone is already in use by another application.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setMicStatus("failed");
      setIsTesting(false);
      onTestComplete?.(false);
    }
  };

  const stopTest = () => {
    setIsTesting(false);

    // Clean up
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl p-6 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <svg
          className="w-6 h-6 text-blue-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <h3 className="text-white font-semibold text-lg">Microphone Test</h3>
      </div>

      <p className="text-white/70 text-sm mb-4">
        Test your microphone to ensure it's working properly before starting the
        session.
      </p>

      {/* Status Indicator */}
      {micStatus !== "untested" && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            micStatus === "working"
              ? "bg-green-500/20 border border-green-500/50"
              : "bg-red-500/20 border border-red-500/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {micStatus === "working" ? (
              <>
                <svg
                  className="w-5 h-5 text-green-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-green-400 text-sm font-medium">
                  Microphone is working!
                </span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 text-red-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="15"
                    y1="9"
                    x2="9"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="9"
                    y1="9"
                    x2="15"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-red-400 text-sm font-medium">
                  Microphone test failed
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Volume Indicator */}
      {isTesting && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Volume Level</span>
            <span className="text-white/90 text-sm font-medium">
              {Math.round(micLevel)}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-100"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <p className="text-white/50 text-xs mt-2 italic">
            Speak into your microphone to test...
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isTesting ? (
          <button
            onClick={startTest}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Start Test
          </button>
        ) : (
          <button
            onClick={stopTest}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Stop Test
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-white/50 text-xs">
          <strong className="text-white/70">Tip:</strong> If the microphone
          doesn't work, check your browser settings and ensure microphone access
          is allowed for this site.
        </p>
      </div>
    </div>
  );
}
