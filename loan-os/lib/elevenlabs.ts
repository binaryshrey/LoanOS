/**
 * ElevenLabs Voice Agent Integration
 * Handles WebSocket connection to ElevenLabs Conversational AI
 */

let elevenLabsWs: WebSocket | null = null;
let isConnecting = false;

interface ElevenLabsCallbacks {
  onReady?: () => void;
  onAudio?: (audio: string) => void;
  onUserTranscript?: (text: string) => void;
  onAgentTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export async function connectElevenLabs(
  agentId: string,
  callbacks: ElevenLabsCallbacks = {}
): Promise<void> {
  if (elevenLabsWs?.readyState === WebSocket.OPEN) {
    console.log("[ElevenLabs] Already connected");
    callbacks.onReady?.();
    return;
  }

  if (isConnecting) {
    console.log("[ElevenLabs] Connection already in progress");
    return;
  }

  isConnecting = true;

  try {
    console.log("[ElevenLabs] Connecting to agent:", agentId);

    // Get user media stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("[ElevenLabs] Microphone access granted");

    const signedUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

    elevenLabsWs = new WebSocket(signedUrl);

    elevenLabsWs.onopen = () => {
      console.log("[ElevenLabs] WebSocket connected");
      isConnecting = false;
      callbacks.onReady?.();
    };

    elevenLabsWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle audio chunks from agent
        if (message.type === "audio" && message.audio) {
          callbacks.onAudio?.(message.audio);
        }

        // Handle user transcripts
        if (message.type === "user_transcript" && message.user_transcript) {
          callbacks.onUserTranscript?.(message.user_transcript);
        }

        // Handle agent transcripts
        if (message.type === "agent_transcript" && message.agent_transcript) {
          callbacks.onAgentTranscript?.(message.agent_transcript);
        }
      } catch (err) {
        console.error("[ElevenLabs] Error parsing message:", err);
      }
    };

    elevenLabsWs.onerror = (error) => {
      console.error("[ElevenLabs] WebSocket error:", error);
      isConnecting = false;
      callbacks.onError?.("WebSocket connection error");
    };

    elevenLabsWs.onclose = () => {
      console.log("[ElevenLabs] WebSocket closed");
      isConnecting = false;
      stream.getTracks().forEach((track) => track.stop());
      callbacks.onClose?.();
    };

    // Setup audio context for streaming user audio
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (elevenLabsWs?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        // Send audio chunk to ElevenLabs
        elevenLabsWs.send(
          JSON.stringify({
            type: "audio",
            audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer))),
          })
        );
      }
    };
  } catch (err) {
    console.error("[ElevenLabs] Connection failed:", err);
    isConnecting = false;
    callbacks.onError?.(
      err instanceof Error ? err.message : "Failed to connect"
    );
    throw err;
  }
}

export function stopElevenLabs(): void {
  console.log("[ElevenLabs] Stopping connection");

  if (elevenLabsWs) {
    elevenLabsWs.close();
    elevenLabsWs = null;
  }

  isConnecting = false;
}

export function setInitialAgentMessage(message: string): void {
  if (elevenLabsWs?.readyState === WebSocket.OPEN) {
    elevenLabsWs.send(
      JSON.stringify({
        type: "initial_message",
        message: message,
      })
    );
  }
}
