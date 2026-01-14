"use client";

/**
 * LoanOS Session Component with Anam + ElevenLabs Integration
 *
 * Client component that orchestrates the loan analysis session with AI advisor
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@anam-ai/js-sdk";
import type AnamClient from "@anam-ai/js-sdk/dist/module/AnamClient";
import { connectElevenLabs, stopElevenLabs } from "@/lib/elevenlabs";
import ProfileMenu from "./ProfileMenu";

interface Config {
  anamSessionToken: string;
  elevenLabsAgentId: string;
  queueSessionId?: string;
  error?: string;
}

interface Message {
  role: "user" | "agent" | "system";
  text: string;
}

interface LoanOSSessionClientProps {
  sessionId: string;
  autoStart?: boolean;
  duration?: number; // Duration in minutes
  user: any; // User object from WorkOS
}

export default function LoanOSSessionClient({
  sessionId,
  autoStart = false,
  duration = 3,
  user,
}: LoanOSSessionClientProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds
  const [isEnding, setIsEnding] = useState(false);
  const [endingMessage, setEndingMessage] = useState("");
  const isIntentionalDisconnectRef = useRef(false);

  const anamClientRef = useRef<AnamClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);
  const configRef = useRef<Config | null>(null);
  const agentAudioInputStreamRef = useRef<any>(null);
  const anamSessionIdRef = useRef<string | null>(null);
  const queueSessionIdRef = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  const initializationLock = useRef(false); // Lock to prevent double init in strict mode
  const userStreamRef = useRef<MediaStream | null>(null);

  // Initialize Anam session on mount
  useEffect(() => {
    const initializeSession = async () => {
      // Double-check: prevent initialization if already done OR in progress
      if (hasInitialized.current || initializationLock.current) {
        console.log(
          "[Session] Already initialized or initializing, skipping..."
        );
        return;
      }

      console.log("[Session] Initializing fresh session...");
      initializationLock.current = true; // Set lock immediately
      hasInitialized.current = true;

      try {
        // Clean up any existing sessions first
        if (anamClientRef.current) {
          try {
            console.log("[Session] Cleaning up existing session...");
            await anamClientRef.current.stopStreaming();
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for cleanup
            anamClientRef.current = null;
          } catch (err) {
            console.error("[Session] Error cleaning up:", err);
          }
        }

        // Release any existing queue session
        if (queueSessionIdRef.current) {
          await releaseQueueSession();
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for release
        }

        // Fetch fresh config
        console.log("[Session] Fetching config from /api/loanos...");
        const res = await fetch("/api/loanos");
        console.log("[Session] Received response:", res.status, res.ok);
        const config: Config = await res.json();
        console.log("[Session] Config parsed:", {
          hasToken: !!config.anamSessionToken,
          hasAgentId: !!config.elevenLabsAgentId,
          hasQueueId: !!config.queueSessionId,
          error: config.error,
        });

        if (!res.ok) {
          throw new Error(config.error || "Failed to initialize session");
        }

        // Store queue session ID for cleanup
        if (config.queueSessionId) {
          queueSessionIdRef.current = config.queueSessionId;
        }

        // Initialize Anam client
        const anamClient = createClient(config.anamSessionToken);

        // Store session info
        const sessionInfo =
          (anamClient as any).sessionId || config.queueSessionId;
        anamSessionIdRef.current = sessionInfo;
        console.log("[Session] Anam session initialized:", sessionInfo);

        // Start streaming to video element BEFORE creating audio input stream
        if (videoRef.current) {
          try {
            console.log("[Session] Starting video stream to element...");
            await anamClient.streamToVideoElement("anam-video");
            console.log("[Session] Video stream started successfully");
          } catch (err) {
            console.error("[Session] Could not stream to video element:", err);
            // If concurrency limit hit, show helpful error
            if (
              err instanceof Error &&
              err.message.includes("Concurrency limit")
            ) {
              throw new Error(
                "Anam concurrency limit reached. Please wait a moment or upgrade your plan."
              );
            }
            throw err;
          }
        }

        // Now create audio input stream AFTER streaming has started
        console.log("[Session] Creating agent audio input stream...");
        const agentAudioInputStream = anamClient.createAgentAudioInputStream({
          encoding: "pcm_s16le",
          sampleRate: 16000,
          channels: 1,
        });
        console.log("[Session] Audio input stream created successfully");

        anamClientRef.current = anamClient;
        agentAudioInputStreamRef.current = agentAudioInputStream;
        configRef.current = config;
        setShowVideo(true);

        console.log("[Session] Avatar initialized and ready");

        // Keep loader visible for a moment to let avatar settle
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error("[Session] Initialization error:", err);

        // Provide user-friendly error messages
        let errorMessage = "Failed to initialize session";
        if (err instanceof Error) {
          if (err.message.includes("Concurrency limit")) {
            errorMessage =
              "⏳ Session limit reached. Please wait a moment and try again.";
          } else if (err.message.includes("session is not started")) {
            errorMessage = "Session failed to start. Please refresh the page.";
          } else if (err.message.includes("Failed to initialize")) {
            errorMessage = err.message;
          } else {
            errorMessage = err.message;
          }
        }

        showError(errorMessage);
        hasInitialized.current = false;
        initializationLock.current = false; // Reset lock on error

        // If concurrency limit, suggest waiting
        if (errorMessage.includes("Session limit")) {
          setTimeout(() => {
            setError("You can try refreshing the page in a few seconds.");
          }, 3000);
        }
      } finally {
        setIsInitializing(false);
        initializationLock.current = false; // Ensure lock is released
      }
    };

    initializeSession();
  }, []);

  useEffect(() => {
    // Auto-start if enabled
    if (
      autoStart &&
      !hasAutoStarted.current &&
      !isConnected &&
      !isLoading &&
      !isInitializing &&
      hasInitialized.current
    ) {
      hasAutoStarted.current = true;
      setTimeout(() => {
        handleStart();
      }, 500);
    }
  }, [autoStart, isInitializing, isConnected]);

  useEffect(() => {
    // Auto-scroll transcript to bottom
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // Countdown timer effect
  useEffect(() => {
    if (!isConnected || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - end the session
          clearInterval(interval);
          handleStopWithReturn();
          addMessage("system", "Time's up. Session has ended!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, timeRemaining]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isIntentionalDisconnectRef.current = true;
      stopElevenLabs();
      if (anamClientRef.current) {
        anamClientRef.current.stopStreaming();
      }
      releaseQueueSession();
      hasInitialized.current = false;

      // Stop user camera stream
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Setup user camera stream
  useEffect(() => {
    const setupUserCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        userStreamRef.current = stream;

        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("[Camera] Error accessing camera:", err);
      }
    };

    setupUserCamera();

    return () => {
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const releaseQueueSession = async () => {
    const sessionIdToRelease = queueSessionIdRef.current;
    if (!sessionIdToRelease) {
      console.log("[Queue] No session ID to release");
      return;
    }

    try {
      console.log("[Queue] Releasing session slot:", sessionIdToRelease);
      const response = await fetch("/api/loanos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionIdToRelease }),
      });

      if (response.ok) {
        console.log("[Queue] Session released successfully");
        queueSessionIdRef.current = null;
      } else {
        console.error(
          "[Queue] Failed to release session:",
          await response.text()
        );
      }
    } catch (err) {
      console.error("[Queue] Error releasing session:", err);
    }
  };

  const addMessage = (role: "user" | "agent" | "system", text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleStart = async () => {
    setIsLoading(true);
    isIntentionalDisconnectRef.current = false;

    try {
      if (
        !configRef.current ||
        !anamClientRef.current ||
        !agentAudioInputStreamRef.current
      ) {
        throw new Error("Session not initialized. Please refresh the page.");
      }

      console.log("[ElevenLabs] Connecting with pre-initialized avatar...");

      await connectElevenLabs(configRef.current.elevenLabsAgentId, {
        onReady: () => {
          setIsConnected(true);
          addMessage("system", "Connected. Let's discuss your loan details.");
        },
        onAudio: (audio: string) => {
          agentAudioInputStreamRef.current?.sendAudioChunk(audio);
        },
        onUserTranscript: (text: string) => addMessage("user", text),
        onAgentTranscript: (text: string) => addMessage("agent", text),
        onError: (err: string) => {
          if (!isIntentionalDisconnectRef.current) {
            showError(err);
          }
        },
      });

      setIsLoading(false);
    } catch (err) {
      console.error("[Session] Error starting:", err);
      showError(err instanceof Error ? err.message : "Failed to start session");
      setIsLoading(false);
    }
  };

  const handleStopWithReturn = async () => {
    isIntentionalDisconnectRef.current = true;

    setIsEnding(true);
    setEndingMessage("Ending session.");

    stopElevenLabs();

    if (anamClientRef.current) {
      try {
        await anamClientRef.current.stopStreaming();
        console.log("[Session] Anam streaming stopped successfully");
      } catch (err) {
        console.error("[Session] Error stopping Anam streaming:", err);
      }
    }

    setShowVideo(false);
    setIsConnected(false);

    await releaseQueueSession();

    setEndingMessage("Saving your session.");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    anamClientRef.current = null;

    setEndingMessage("Returning to dashboard.");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("[Session] Navigating to dashboard");
    router.push("/dashboard");
  };

  const handleToggle = () => {
    if (isConnected) {
      handleStopWithReturn();
    } else {
      handleStart();
    }
  };

  const getMessageLabel = (role: string) => {
    switch (role) {
      case "user":
        return "You";
      case "agent":
        return "Advisor";
      default:
        return "•";
    }
  };

  const userName =
    user && user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user && user.email
      ? String(user.email).split("@")[0]
      : "there";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "#000" }}
    >
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-50 px-6 pt-4 lg:px-8">
        <nav className="flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between">
            <a href="/dashboard" className="-m-1.5 p-1.5">
              <img
                className="h-8 drop-shadow-lg"
                src="/logo.svg"
                alt="loanos"
              />
            </a>
            <ProfileMenu user={user} />
          </div>
          <h1 className="text-white text-3xl font-medium">
            LoanOS AI Conversation
          </h1>

          <div className="flex items-center gap-4 mt-1">
            <p className="text-white/80 text-sm">
              Hello, {userName}! Your session ends in
            </p>

            {isConnected && !isInitializing && (
              <div className="z-40">
                <div
                  className="bg-white/5 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-2 shadow-2xl"
                  style={{
                    boxShadow:
                      "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-white/80"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-white">
                      {formatTime(timeRemaining)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Ending Loader */}
      {isEnding && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-lg mt-6 font-medium">{endingMessage}</p>
          <p className="text-white/60 text-sm mt-2">Please wait...</p>
        </div>
      )}

      {/* Initialization Loader */}
      {isInitializing && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-lg mt-6 font-medium">
            Initializing Session
          </p>
          <p className="text-white/60 text-sm mt-2">
            Preparing your LoanOS conversation
            {!showVideo ? "..." : "Ready to start"}
          </p>
        </div>
      )}

      {/* Connecting Overlay */}
      {isLoading && !isInitializing && (
        <div className="absolute inset-0 bg-black/50 z-40 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-lg mt-4 font-medium">
            Starting Session...
          </p>
          <p className="text-white/60 text-sm mt-2">Get ready!</p>
        </div>
      )}

      {/* Video Container */}
      <div
        className="relative w-full max-w-5xl aspect-video bg-black"
        style={{ borderRadius: "20px", overflow: "hidden" }}
      >
        <video
          ref={videoRef}
          id="anam-video"
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
      </div>

      {/* Placeholder when not streaming */}
      {!showVideo && !isInitializing && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ backgroundColor: "#000" }}
        >
          <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700 transition-colors duration-300" />
            <div className="absolute inset-2 rounded-full bg-gray-800 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
          </div>
          <p className="text-white/60 text-lg">Ready to begin</p>
        </div>
      )}

      {/* Transcript - Bottom Left */}
      <div className="absolute bottom-6 left-6 max-w-md w-full max-h-64 overflow-hidden">
        <div
          ref={transcriptRef}
          className="bg-white/5 backdrop-blur-2xl border border-white/30 rounded-xl p-4 space-y-2 overflow-y-auto max-h-64 shadow-2xl"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.4) transparent",
            boxShadow:
              "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {messages.length === 0 ? (
            <p className="text-white/60 text-xs">
              Conversation will appear here.
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="animate-fade-in">
                <span
                  className={`font-semibold ${
                    msg.role === "user"
                      ? "text-blue-400"
                      : msg.role === "agent"
                      ? "text-green-400"
                      : "text-white/60"
                  }`}
                >
                  {getMessageLabel(msg.role)}:
                </span>{" "}
                <span className="text-white/90 text-sm">{msg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Video Preview - Bottom Right */}
      <div className="absolute bottom-6 right-6 w-64 h-40 overflow-hidden">
        <div
          className="relative w-full h-full bg-white/5 backdrop-blur-2xl border border-white/30 rounded-xl shadow-2xl"
          style={{
            boxShadow:
              "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          <video
            ref={userVideoRef}
            className="w-full h-full object-cover rounded-xl"
            style={{ transform: "scaleX(-1)" }}
            autoPlay
            playsInline
            muted
          />
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <span className="text-white/90 text-xs font-medium">You</span>
          </div>
        </div>
      </div>

      {/* Control Button - Center Bottom */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={handleToggle}
          disabled={isLoading || isInitializing}
          className="px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 flex items-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isConnected
              ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            boxShadow: isConnected
              ? "0 8px 32px rgba(239, 68, 68, 0.4)"
              : "0 8px 32px rgba(59, 130, 246, 0.4)",
          }}
        >
          {isLoading ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Connecting...</span>
            </>
          ) : isConnected ? (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
              <span>End Session</span>
            </>
          ) : (
            <>
              <span>Begin Session</span>
            </>
          )}
        </button>
      </div>

      {/* Speaking Indicator */}
      {isConnected && showVideo && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-green-400 rounded-full animate-pulse shadow-lg"
              style={{
                height: `${40 + i * 12}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Error Toast */}
      <div className="fixed top-6 right-6 z-50">
        {error && (
          <div className="max-w-xs">
            <div className="flex items-start gap-3 bg-red-600/95 backdrop-blur-md border border-red-400 rounded-lg px-4 py-3 shadow-xl animate-slide-in-right">
              <svg
                className="w-5 h-5 text-white/90 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 9v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Error</p>
                <p className="text-white/90 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
