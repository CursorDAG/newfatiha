"use client";

import React, { useState, useRef } from "react";
import { X, Upload, Video, XCircle } from "lucide-react";

interface RecordingUploadModalProps {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordingUploadModal({
  lessonId,
  lessonTitle,
  onClose,
  onSuccess,
}: RecordingUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Неподдерживаемый формат видео. Разрешены: MP4, WebM, QuickTime";
    }

    if (file.size > MAX_FILE_SIZE) {
      return `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB)`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned upload URL
      const initRes = await fetch(
        `/api/teacher/lessons/${lessonId}/recordings/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            contentType: selectedFile.type,
          }),
        }
      );

      if (!initRes.ok) {
        const errorData = await initRes.json();
        throw new Error(errorData.error || "Не удалось получить URL для загрузки");
      }

      const { recordingId, uploadUrl } = await initRes.json();

      // Step 2: Upload file to S3 using presigned URL
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Ошибка загрузки: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Ошибка сети при загрузке файла"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      // Step 3: Mark upload as complete
      const completeRes = await fetch(
        `/api/teacher/recordings/${recordingId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration: null, // Will be extracted on server or client can send it
          }),
        }
      );

      if (!completeRes.ok) {
        const errorData = await completeRes.json();
        throw new Error(errorData.error || "Не удалось завершить загрузку");
      }

      // Success!
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Загрузить запись урока
            </h2>
            <p className="text-sm text-slate-600 mt-1">{lessonTitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Drag & Drop Area */}
          {!selectedFile && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-700 font-medium mb-2">
                Перетащите видео сюда или
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                выберите файл
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <p className="text-sm text-slate-500 mt-4">
                Поддерживаемые форматы: MP4, WebM, QuickTime
                <br />
                Максимальный размер: 2GB
              </p>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && !uploading && (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Video className="w-10 h-10 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-slate-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 font-medium">Загрузка...</span>
                <span className="text-slate-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 text-center">
                Пожалуйста, не закрывайте это окно
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Загрузка..." : "Загрузить"}
          </button>
        </div>
      </div>
    </div>
  );
}
