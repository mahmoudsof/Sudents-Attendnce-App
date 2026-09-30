import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  SwitchCamera,
  Zap,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Upload,
  UserCheck,
  Eye,
} from 'lucide-react';
import { sound } from '../lib/sound';
import { StudentPhoto } from '../lib/driveApi';

interface CameraScannerProps {
  onCaptureAndMatch: (liveImageBase64: string) => Promise<void>;
  isAnalyzing: boolean;
  studentPhotos: StudentPhoto[];
  selectedFolderName: string;
  selectedSheetName: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCaptureAndMatch,
  isAnalyzing,
  studentPhotos,
  selectedFolderName,
  selectedSheetName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [frozenPreview, setFrozenPreview] = useState<string | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasCameraPermission(true);

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() || {}) as any;
        setHasTorchSupport(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا من إعدادات المتصفح.'
          : 'تعذر تشغيل الكاميرا على هذا الجهاز. يمكنك رفع صورة كبديل.'
      );
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Switch front/back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorchSupport) {
      try {
        const next = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setIsTorchOn(next);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  // Capture frame from video stream
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If front camera, flip horizontally for natural mirror feel
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [facingMode]);

  // Trigger capture & match
  const handleSnap = async () => {
    if (isAnalyzing) return;
    const imgData = captureFrame();
    if (!imgData) return;

    sound.playShutter();
    setFrozenPreview(imgData);

    try {
      await onCaptureAndMatch(imgData);
    } finally {
      // Clear frozen preview after a short delay
      setTimeout(() => setFrozenPreview(null), 800);
    }
  };

  // Auto scan interval
  useEffect(() => {
    if (!autoScan || isAnalyzing || hasCameraPermission !== true) return;

    const interval = setInterval(() => {
      if (!isAnalyzing && studentPhotos.length > 0) {
        handleSnap();
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [autoScan, isAnalyzing, studentPhotos.length, hasCameraPermission, handleSnap]);

  // Handle manual photo upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFrozenPreview(base64);
        sound.playShutter();
        await onCaptureAndMatch(base64);
        setTimeout(() => setFrozenPreview(null), 800);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder Container */}
      <div className="relative w-full max-w-md aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex flex-col justify-between">
        {/* Video or Frozen preview */}
        {frozenPreview ? (
          <img
            src={frozenPreview}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
        )}

        {/* Fallback Camera Error / Permission Denied */}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">الكاميرا غير متاحة</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{cameraError}</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة محاولة فتح الكاميرا</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-4 h-4" />
                <span>رفع صورة من الاستوديو / الملفات</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Controls Overlay */}
        <div className="relative z-20 p-4 flex items-center justify-between pointer-events-none">
          {/* Target File & Folder Pills */}
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-full flex items-center gap-2 text-[11px] text-white shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium truncate max-w-[130px]">
              {selectedFolderName || 'مجلد الصور'}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-emerald-300 font-mono text-[10px]">
              {studentPhotos.length} طالب
            </span>
          </div>

          {/* Quick Camera Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            {hasTorchSupport && (
              <button
                onClick={toggleTorch}
                title="الفلاش"
                className={`p-2.5 rounded-full backdrop-blur-md border transition ${
                  isTorchOn
                    ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/30'
                    : 'bg-slate-900/70 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={toggleFacingMode}
              title="تبديل الكاميرا (أمامية / خلفية)"
              className="p-2.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:bg-slate-800 transition"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Face Reticle & Scanning Animation */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none">
          {/* Face Oval Reticle */}
          <div className="relative w-52 sm:w-60 aspect-[3/4] rounded-[45%] border-2 border-dashed border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col items-center justify-center overflow-hidden">
            {/* Corner Target Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

            {/* Scanning Laser Line */}
            {isAnalyzing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce" />
            )}

            {!isAnalyzing && (
              <span className="text-[11px] text-white/80 bg-slate-950/60 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                ضع وجه الطالب داخل الإطار
              </span>
            )}
          </div>
        </div>

        {/* Bottom Bar: Status & Capture Trigger */}
        <div className="relative z-20 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center gap-3">
          {/* Analyzing / Status Banner */}
          {isAnalyzing ? (
            <div className="w-full bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-300 font-medium animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              <span>جاري مقارنة الوجه مع صور الطلاب في جوجل درايف...</span>
            </div>
          ) : studentPhotos.length === 0 ? (
            <div className="w-full bg-amber-950/80 border border-amber-500/50 backdrop-blur-md py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>يرجى اختيار مجلد يحتوي على صور الطلاب من درايف أولاً</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <button
                onClick={() => setAutoScan(!autoScan)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] transition ${
                  autoScan
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{autoScan ? 'المسح التلقائي مفعل' : 'تفعيل المسح التلقائي'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>صورة من الجهاز</span>
              </button>
            </div>
          )}

          {/* Capture Trigger Button */}
          <div className="flex items-center justify-center w-full gap-6">
            <button
              onClick={handleSnap}
              disabled={isAnalyzing || studentPhotos.length === 0}
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
                isAnalyzing || studentPhotos.length === 0
                  ? 'border-slate-700 bg-slate-800/60 opacity-50 cursor-not-allowed'
                  : 'border-emerald-400 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/40 text-white cursor-pointer'
              }`}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/80 flex items-center justify-center">
                {isAnalyzing ? (
                  <RefreshCw className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for device photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
