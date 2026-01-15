/**
 * WebSocket client for LoanOS AI conversations
 */

export interface LoanOSMessage {
  type:
    | "system"
    | "question"
    | "answer"
    | "error"
    | "processing"
    | "ping"
    | "pong";
  message?: string;
  question?: string;
  answer?: string;
  timestamp?: string;
  context?: any;
}

export interface LoanOSWebSocketCallbacks {
  onConnected?: () => void;
  onMessage?: (message: LoanOSMessage) => void;
  onAnswer?: (question: string, answer: string, timestamp: string) => void;
  onError?: (error: string) => void;
  onDisconnected?: () => void;
}

export class LoanOSWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private backendUrl: string;
  private callbacks: LoanOSWebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    sessionId: string,
    callbacks: LoanOSWebSocketCallbacks,
    backendUrl: string = "ws://localhost:8080"
  ) {
    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.backendUrl = backendUrl;
  }

  /**
   * Initialize session context before connecting WebSocket
   */
  async initializeContext(userId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.backendUrl
          .replace("ws://", "http://")
          .replace("wss://", "https://")}/api/session/context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: this.sessionId,
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || "Failed to initialize session context"
        );
      }

      const result = await response.json();
      console.log("✅ Session context initialized:", result);
      return true;
    } catch (error) {
      console.error("Error initializing session context:", error);
      this.callbacks.onError?.(
        error instanceof Error ? error.message : "Failed to initialize context"
      );
      return false;
    }
  }

  /**
   * Connect to the WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.backendUrl}/ws/session/${this.sessionId}`;
        console.log("🔌 Connecting to WebSocket:", wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("✅ WebSocket connected");
          this.reconnectAttempts = 0;
          this.callbacks.onConnected?.();
          this.startPingInterval();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: LoanOSMessage = JSON.parse(event.data);
            console.log("📨 Received message:", message);

            this.callbacks.onMessage?.(message);

            if (
              message.type === "answer" &&
              message.question &&
              message.answer
            ) {
              this.callbacks.onAnswer?.(
                message.question,
                message.answer,
                message.timestamp || new Date().toISOString()
              );
            } else if (message.type === "error" && message.message) {
              this.callbacks.onError?.(message.message);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          this.callbacks.onError?.("WebSocket connection error");
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log("🔌 WebSocket closed:", event.code, event.reason);
          this.stopPingInterval();
          this.callbacks.onDisconnected?.();

          // Attempt to reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
              `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
            );
            setTimeout(() => {
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        reject(error);
      }
    });
  }

  /**
   * Send a question to the AI
   */
  askQuestion(question: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      this.callbacks.onError?.("Not connected to the server");
      return;
    }

    const message = {
      type: "question",
      question: question,
    };

    console.log("📤 Sending question:", question);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a ping to keep connection alive
   */
  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "ping" }));
    }
  }

  /**
   * Start sending periodic pings
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop sending pings
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * End the session on the backend
   */
  async endSession(): Promise<void> {
    try {
      const response = await fetch(
        `${this.backendUrl
          .replace("ws://", "http://")
          .replace("wss://", "https://")}/api/session/${this.sessionId}/end`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to end session");
      }

      console.log("✅ Session ended successfully");
    } catch (error) {
      console.error("Error ending session:", error);
    } finally {
      this.disconnect();
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Helper function to create and initialize a LoanOS WebSocket client
 */
export async function createLoanOSWebSocket(
  sessionId: string,
  userId: string,
  callbacks: LoanOSWebSocketCallbacks,
  backendUrl?: string
): Promise<LoanOSWebSocketClient> {
  const client = new LoanOSWebSocketClient(
    sessionId,
    callbacks,
    backendUrl ||
      process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL ||
      "ws://localhost:8080"
  );

  // Initialize context first
  const contextInitialized = await client.initializeContext(userId);

  if (!contextInitialized) {
    throw new Error("Failed to initialize session context");
  }

  // Connect to WebSocket
  await client.connect();

  return client;
}
