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
  const [duration, setDuration] = useState("180"); // Duration in seconds (3 minutes default)
  const [error, setError] = useState<string | null>(null);

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
      filename: string;
      size: number;
      url: string;
    }>;
  }>({
    uploading: false,
    completed: 0,
    total: 0,
    uploadedFiles: [],
  });

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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.loanName.trim()) {
        throw new Error("Loan / Deal Name is required");
      }

      if (!formData.userRole) {
        throw new Error("User Role is required");
      }

      if (selectedFiles.length === 0) {
        throw new Error("Please upload at least one loan document");
      }

      // TODO: Implement file upload logic here
      // For now, simulate upload
      setUploadProgress({
        uploading: true,
        completed: 0,
        total: selectedFiles.length,
        uploadedFiles: [],
      });

      // Simulate file upload
      const uploadedFiles = selectedFiles.map((file, index) => {
        setTimeout(() => {
          setUploadProgress((prev) => ({
            ...prev,
            completed: index + 1,
          }));
        }, index * 500);

        return {
          filename: file.name,
          size: file.size,
          url: `#`, // Replace with actual URL after upload
        };
      });

      // Wait for all uploads to complete
      await new Promise((resolve) =>
        setTimeout(resolve, selectedFiles.length * 500 + 500)
      );

      setUploadProgress((prev) => ({
        ...prev,
        uploading: false,
        uploadedFiles,
      }));

      // TODO: Save loan session data to backend
      const loanSessionData = {
        user_id: user.id,
        user_email: user.email,
        loan_name: formData.loanName,
        user_role: formData.userRole,
        institution: formData.institution || "",
        ai_focus: formData.aiFocus || "",
        duration_seconds: parseInt(duration),
        language: formData.language,
        region: formData.region,
        documents: uploadedFiles,
      };

      console.log("Loan session data:", loanSessionData);

      // Navigate to dashboard or loan interaction page
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error during setup:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);

      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  };

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
          "Start LoanOS Intelligence Session"
        )}
      </Button>
    </div>
  );
}
