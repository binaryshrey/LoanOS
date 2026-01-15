"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  X,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  Info,
  Camera,
  Mic,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadMultipleFilesToGCS } from "@/lib/gcsUpload";
import { initializeBackendContext } from "@/lib/loanosBackend";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface OnboardFormProps {
  user: User;
}

export default function OnboardForm({ user }: OnboardFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "permissions">("form");
  const [duration, setDuration] = useState("180"); // Duration in seconds (3 minutes default)
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    loanName: "",
    userRole: "",
    institution: "",
    aiFocus: "",
    language: "en",
    region: "EMEA",
  });

  // File upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    uploading: boolean;
    completed: number;
    total: number;
    uploadedFiles: Array<{
      gcs_bucket: string;
      gcs_object_path: string;
      public_url: string;
      filename: string;
    }>;
  }>({
    uploading: false,
    completed: 0,
    total: 0,
    uploadedFiles: [],
  });

  // Permission states
  const [micPermission, setMicPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, []);

  // Connect camera stream to video element when it becomes available
  useEffect(() => {
    if (cameraStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  }, [cameraStream]);

  const cleanupStreams = () => {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    // Accept PDF, CSV, and XLSX files
    const validFiles = fileArray.filter((file) => {
      const name = file.name.toLowerCase();
      const isPDF = file.type === "application/pdf" || name.endsWith(".pdf");
      const isCSV = file.type === "text/csv" || name.endsWith(".csv");
      const isXLSX =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        name.endsWith(".xlsx");
      const isXLS =
        file.type === "application/vnd.ms-excel" || name.endsWith(".xls");

      return isPDF || isCSV || isXLSX || isXLS;
    });

    if (validFiles.length !== fileArray.length) {
      alert(
        "Only PDF, CSV, and Excel files are allowed. Unsupported files were ignored."
      );
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadProgress({
      uploading: true,
      completed: 0,
      total: selectedFiles.length,
      uploadedFiles: [],
    });

    try {
      const results = await uploadMultipleFilesToGCS(
        selectedFiles,
        "loan_documents",
        (completed, total) => {
          setUploadProgress((prev) => ({
            ...prev,
            completed,
            total,
          }));
        }
      );

      const successfulUploads = results.filter((r: any) => r.success);

      if (successfulUploads.length === 0) {
        throw new Error("File upload failed. Please try again.");
      }

      setUploadProgress((prev) => ({
        ...prev,
        uploading: false,
        uploadedFiles: successfulUploads.map((r: any) => ({
          gcs_bucket: r.gcs_bucket,
          gcs_object_path: r.gcs_object_path,
          public_url: r.public_url,
          filename: r.filename,
        })),
      }));

      // Clear selected files after successful upload
      setSelectedFiles([]);

      return successfulUploads;
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress((prev) => ({
        ...prev,
        uploading: false,
      }));
      throw error;
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setMicPermission("granted");

      // Setup audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setMicPermission("denied");
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraPermission("granted");

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        // Explicitly play the video to ensure it starts
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.error("Error playing video:", playError);
        }
      }
    } catch (err) {
      console.error("Camera permission denied:", err);
      setCameraPermission("denied");
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1️⃣ VALIDATION PHASE (No toasts during validation)
      if (!formData.loanName.trim()) {
        throw new Error("Loan / Deal Name is required");
      }

      if (!formData.userRole) {
        throw new Error("User Role is required");
      }

      if (selectedFiles.length === 0) {
        throw new Error("Please upload at least one loan document");
      }

      // 2️⃣ UI TRANSITION TO PERMISSIONS (No toasts during transition)
      setStep("permissions");

      // Auto-request permissions after transition
      setTimeout(() => {
        requestMicrophonePermission();
        requestCameraPermission();
      }, 300);
    } catch (error) {
      console.error("Error during validation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);

    try {
      // 3️⃣ FILE UPLOAD PHASE
      toast.loading("Uploading documents to cloud storage.", {
        id: "upload",
      });
      console.log("Uploading files to GCS...");

      const successfulUploads = await uploadFiles();

      if (!successfulUploads || successfulUploads.length === 0) {
        throw new Error("File upload failed. Please try again.");
      }

      toast.success(`${successfulUploads.length} document(s) uploaded!`, {
        id: "upload",
      });
      console.log("Files uploaded successfully:", successfulUploads);

      // Prepare file metadata
      const allBuckets = successfulUploads.map((f: any) => f.gcs_bucket);
      const allObjectPaths = successfulUploads.map(
        (f: any) => f.gcs_object_path
      );
      const allFileUrls = successfulUploads.map((f: any) => f.public_url);

      // Prepare base session data
      const baseSessionData = {
        user_id: user.id,
        user_email: user.email,
        loan_name: formData.loanName,
        user_role: formData.userRole,
        institution: formData.institution || "",
        ai_focus: formData.aiFocus || "",
        duration_seconds: parseInt(duration),
        language: formData.language,
        region: formData.region,
        gcp_buckets: allBuckets,
        gcp_object_paths: allObjectPaths,
        gcp_file_urls: allFileUrls,
        gcp_bucket: allBuckets[0] || "",
        gcp_object_path: allObjectPaths[0] || "",
        gcp_file_url: allFileUrls[0] || "",
        documents: successfulUploads.map((f: any) => ({
          filename: f.filename,
          gcs_bucket: f.gcs_bucket,
          gcs_object_path: f.gcs_object_path,
          public_url: f.public_url,
          size: f.size,
          contentType: f.contentType,
        })),
        conversations: [],
      };

      // 4️⃣ AI DOCUMENT PROCESSING PHASE (using Backend API)
      toast.loading("Processing documents (this may take 5-10 seconds)!", {
        id: "ai",
      });

      // Call backend directly to process documents and generate analysis
      const backendUrl =
        process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL || "http://localhost:8080";
      const httpUrl = backendUrl
        .replace("ws://", "http://")
        .replace("wss://", "https://");

      const aiResponse = await fetch(`${httpUrl}/api/process-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          documents: successfulUploads.map((f: any) => ({
            filename: f.filename,
            gcs_bucket: f.gcs_bucket,
            gcs_object_path: f.gcs_object_path,
            public_url: f.public_url,
            contentType: f.contentType,
          })),
          loan_context: {
            loan_name: formData.loanName,
            user_role: formData.userRole,
            region: formData.region,
            language: formData.language,
          },
        }),
      });

      if (!aiResponse.ok) {
        console.warn(
          "Documents processing failed, continuing with empty analysis"
        );
        toast.warning("Documents processing failed, saving without analysis.", {
          id: "ai",
        });
      }

      const aiResult = await aiResponse.json();
      const analysis = aiResult.analysis || {};
      const documentSummaries = aiResult.document_summaries || [];
      const documentsProcessed = aiResult.documents_processed || 0;

      toast.success(`${documentsProcessed} document(s) analyzed!`, {
        id: "ai",
      });
      console.log("Documents processing complete:", { documentsProcessed });

      // 5️⃣ CREATE SESSION WITH ANALYSIS (Single Database Operation)
      toast.loading("Creating loan session with analysis.", {
        id: "save",
      });

      const loanSessionData = {
        ...baseSessionData,
        analysis: analysis,
        status: "Pending",
      };

      const sessionResponse = await fetch("/api/loan-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loanSessionData),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to save loan session: ${sessionResponse.statusText}`
        );
      }

      const sessionResult = await sessionResponse.json();
      const newSessionId = sessionResult.data.id;
      setSessionId(newSessionId);

      toast.success("Loan session created with analysis!", { id: "save" });
      console.log("Loan session saved with analysis:", newSessionId);

      // Initialize backend context for real-time conversations
      try {
        await initializeBackendContext(newSessionId, user.id);
        console.log("✅ Backend context initialized for conversations");
      } catch (contextError) {
        console.warn(
          "Backend context initialization failed, will retry on session start"
        );
      }

      // 6️⃣ NAVIGATE TO SESSION
      toast.success("All set! Redirecting to your LoanOS session.", {
        duration: 2000,
      });

      setTimeout(() => {
        router.push(
          `/loanos-session/${newSessionId}?autoStart=true&duration=${duration}`
        );
      }, 1500);
    } catch (error) {
      console.error("Error starting session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(`${errorMessage}`);
      setIsLoading(false);
    }
  };

  const allPermissionsGranted =
    micPermission === "granted" && cameraPermission === "granted";

  // Permissions Step UI
  if (step === "permissions") {
    return (
      <div className="mt-8 space-y-6">
        {/* Permission Setup Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Setup Your Devices
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              We need access to your microphone and camera for AI conversations
            </p>
          </div>

          <div className="space-y-6">
            {/* Microphone Check */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      micPermission === "granted"
                        ? "bg-green-100"
                        : micPermission === "denied"
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Mic
                      className={`w-6 h-6 ${
                        micPermission === "granted"
                          ? "text-green-600"
                          : micPermission === "denied"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Microphone</h3>
                    <p className="text-sm text-gray-600">
                      {micPermission === "granted" && "Working perfectly!"}
                      {micPermission === "denied" && "Permission denied"}
                      {micPermission === "pending" && "Requesting access..."}
                    </p>
                  </div>
                </div>
                {micPermission === "granted" && (
                  <Check className="w-6 h-6 text-green-600" />
                )}
                {micPermission === "denied" && (
                  <X className="w-6 h-6 text-red-600" />
                )}
              </div>

              {micPermission === "granted" && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Audio Level</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{
                        width: `${Math.min((audioLevel / 128) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Speak to test your microphone
                  </p>
                </div>
              )}

              {micPermission === "denied" && (
                <Button
                  onClick={requestMicrophonePermission}
                  variant="outline"
                  size="sm"
                  className="mt-4 py-3 sm:py-2"
                >
                  Try Again
                </Button>
              )}
            </div>

            {/* Camera Check */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      cameraPermission === "granted"
                        ? "bg-green-100"
                        : cameraPermission === "denied"
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Camera
                      className={`w-6 h-6 ${
                        cameraPermission === "granted"
                          ? "text-green-600"
                          : cameraPermission === "denied"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Camera</h3>
                    <p className="text-sm text-gray-600">
                      {cameraPermission === "granted" && "Working perfectly!"}
                      {cameraPermission === "denied" && "Permission denied"}
                      {cameraPermission === "pending" && "Requesting access..."}
                    </p>
                  </div>
                </div>
                {cameraPermission === "granted" && (
                  <Check className="w-6 h-6 text-green-600" />
                )}
                {cameraPermission === "denied" && (
                  <X className="w-6 h-6 text-red-600" />
                )}
              </div>

              {cameraPermission === "granted" && (
                <div className="mt-4">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video bg-gray-900 rounded-lg max-h-144 object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <p className="text-xs text-gray-500 mt-2">Camera preview</p>
                </div>
              )}

              {cameraPermission === "denied" && (
                <Button
                  onClick={requestCameraPermission}
                  variant="outline"
                  size="sm"
                  className="mt-4 py-3 sm:py-2"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => {
                cleanupStreams();
                setStep("form");
                setMicPermission("pending");
                setCameraPermission("pending");
              }}
              variant="outline"
              size="lg"
              className="flex-1 cursor-pointer py-2 sm:py-3"
            >
              Back to Form
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={!allPermissionsGranted || isLoading}
              size="lg"
              className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold cursor-pointer py-2 sm:py-3"
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              {isLoading ? "Starting..." : "Start LoanOS Intelligence Session"}
            </Button>
          </div>

          {!allPermissionsGranted && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Please grant both microphone and camera permissions to continue
            </p>
          )}
        </div>
      </div>
    );
  }

  // Form Step UI
  return (
    <div className="mt-8 space-y-3">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Session Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              AI Session Configuration
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure how LoanOS explains and prioritizes loan insights
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Interaction Length
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How long / detailed AI responses are</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full sm:w-44 cursor-pointer">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="180">3 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Language
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Language for AI responses</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={formData.language}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger className="w-full sm:w-44 cursor-pointer">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                  <SelectItem value="fr">🇫🇷 French</SelectItem>
                  <SelectItem value="de">🇩🇪 German</SelectItem>
                  <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Loan Market Region
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>LMA-style assumptions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={formData.region}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, region: value }))
                }
              >
                <SelectTrigger className="w-full sm:w-44 cursor-pointer">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMEA">EMEA</SelectItem>
                  <SelectItem value="AMERS">AMERS</SelectItem>
                  <SelectItem value="APAC">APAC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Context Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="loanName"
                className="text-sm font-medium text-gray-700"
              >
                Loan / Deal Name <span className="text-red-500">*</span>
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Used to identify this loan session</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="loanName"
              type="text"
              placeholder="e.g. Acme Term Loan B"
              className="w-full"
              value={formData.loanName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({
                  ...prev,
                  loanName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="userRole"
                  className="text-sm font-medium text-gray-700"
                >
                  User Role <span className="text-red-500">*</span>
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Adjusts how the AI explains and prioritizes information
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={formData.userRole}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, userRole: value }))
                }
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="institution"
                  className="text-sm font-medium text-gray-700"
                >
                  Institution (Optional)
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Used only for personalization</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="institution"
                type="text"
                placeholder="e.g. ABC Bank / Acme Holdings"
                className="w-full"
                value={formData.institution}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    institution: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="aiFocus"
                className="text-sm font-medium text-gray-700"
              >
                What should the AI focus on? (Optional)
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Helps LoanOS prioritize insights during the conversation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="aiFocus"
              placeholder="e.g. covenant compliance, risk monitoring, or summarizing key loan terms…"
              rows={2}
              className="w-full resize-none min-h-20"
              value={formData.aiFocus}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, aiFocus: e.target.value }))
              }
            />
          </div>

          {/* Document Upload Section */}
          <div className="space-y-2">
            <label
              htmlFor="attachments"
              className="text-sm font-medium text-gray-700"
            >
              Upload Loan Document Pack <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="attachments"
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadProgress.uploading}
              />
              <div className="w-full h-24 sm:h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                {uploadProgress.uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        Uploading {uploadProgress.completed} of{" "}
                        {uploadProgress.total}...
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, CSV, XLSX</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Upload one or more loan documents. LoanOS will automatically
              extract and understand the contents.
            </p>
            <div className="text-xs text-gray-500 space-y-1 mt-2">
              <p>• Loan agreement (PDF)</p>
              <p>• Amendments (PDF)</p>
              <p>• Financials (CSV / Excel)</p>
              <p>• ESG data (CSV / Excel)</p>
            </div>

            {/* Display selected files */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  Selected Files ({selectedFiles.length})
                </p>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        type="button"
                        disabled={uploadProgress.uploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display uploaded files */}
            {uploadProgress.uploadedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">
                    {uploadProgress.uploadedFiles.length} file(s) uploaded
                    successfully
                  </p>
                </div>
                <div className="space-y-2">
                  {uploadProgress.uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 bg-white p-2 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-3 h-3 text-green-600 shrink-0" />
                        <span className="text-xs text-green-700 truncate">
                          {file.filename}
                        </span>
                      </div>
                      <span className="text-xs text-green-600 shrink-0">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        size="lg"
        className="w-full px-6 py-4 sm:px-8 sm:py-6 text-base text-white font-semibold cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          "Continue to Device Setup"
        )}
      </Button>
    </div>
  );
}
