"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createLoanOSWebSocket,
  LoanOSWebSocketClient,
  LoanOSMessage,
} from "@/lib/loanosWebSocket";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface LoanOSChatProps {
  sessionId: string;
  userId: string;
  loanName?: string;
  backendUrl?: string;
}

export default function LoanOSChat({
  sessionId,
  userId,
  loanName,
  backendUrl,
}: LoanOSChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");

  const wsClient = useRef<LoanOSWebSocketClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    let mounted = true;

    const initializeWebSocket = async () => {
      try {
        setConnectionStatus("connecting");
        setError(null);

        const client = await createLoanOSWebSocket(
          sessionId,
          userId,
          {
            onConnected: () => {
              if (mounted) {
                setIsConnected(true);
                setConnectionStatus("connected");
                console.log("✅ Connected to LoanOS AI");
              }
            },
            onMessage: (message: LoanOSMessage) => {
              if (!mounted) return;

              if (message.type === "system" && message.message) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: "system",
                    content: message.message || "",
                    timestamp: new Date(),
                  },
                ]);
              } else if (message.type === "processing") {
                setIsProcessing(true);
              }
            },
            onAnswer: (question: string, answer: string, timestamp: string) => {
              if (!mounted) return;

              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-assistant`,
                  role: "assistant",
                  content: answer,
                  timestamp: new Date(timestamp),
                },
              ]);
              setIsProcessing(false);
            },
            onError: (errorMsg: string) => {
              if (mounted) {
                setError(errorMsg);
                setIsProcessing(false);
                setConnectionStatus("error");
              }
            },
            onDisconnected: () => {
              if (mounted) {
                setIsConnected(false);
                setConnectionStatus("disconnected");
              }
            },
          },
          backendUrl
        );

        if (mounted) {
          wsClient.current = client;
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to initialize WebSocket:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect to AI service"
          );
          setConnectionStatus("error");
        }
      }
    };

    initializeWebSocket();

    return () => {
      mounted = false;
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, [sessionId, userId, backendUrl]);

  const handleSendMessage = () => {
    const trimmedInput = inputValue.trim();

    if (!trimmedInput || !wsClient.current || !isConnected) {
      return;
    }

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);
    setError(null);

    // Send question via WebSocket
    wsClient.current.askQuestion(trimmedInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Connection Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">
            {loanName ? `AI Assistant - ${loanName}` : "LoanOS AI Assistant"}
          </h3>
          <p className="text-xs text-gray-500">
            Ask questions about your loan documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
          />
          <span className="text-xs text-gray-600">
            {getConnectionStatusText()}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && connectionStatus === "connected" && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">
              Start by asking a question about your loan documents
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.role === "system"
                  ? "bg-gray-100 text-gray-700 border border-gray-200"
                  : "bg-gray-50 text-gray-900 border border-gray-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === "user" ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected
                ? "Ask a question about your loan..."
                : "Connecting to AI service..."
            }
            disabled={!isConnected || isProcessing}
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim() || isProcessing}
            className="self-end"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
