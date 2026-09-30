import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { StudentPhoto, DriveSpreadsheet } from '../lib/driveApi';

interface ConfirmationModalProps {
  isOpen: boolean;
  liveImage: string;
  matchedStudent: StudentPhoto | null;
  confidence: number;
  reasoning: string;
  targetSheet: DriveSpreadsheet | null;
  onConfirm: () => void;
  onCancel: () => void;
  isRecording: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  liveImage,
  matchedStudent,
  confidence,
  reasoning,
  targetSheet,
  onConfirm,
  onCancel,
  isRecording,
}) => {
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !matchedStudent) {
      setCountdown(null);
      return;
    }

    if (autoConfirmEnabled && confidence >= 85) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onConfirm();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [isOpen, autoConfirmEnabled, matchedStudent, confidence, onConfirm]);

  if (!isOpen || !matchedStudent) return null;

  const isHighConfidence = confidence >= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>تأكيد تسجيل حضور الطالب</span>
          </div>
          <button
            onClick={onCancel}
            disabled={isRecording}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Comparison Photos */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            {/* Live Camera Capture */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                الصورة الحية (الكاميرا)
              </span>
              <div className="w-full aspect-square rounded-lg overflow-hidden border border-emerald-500/40 relative shadow-inner bg-slate-900">
                <img
                  src={liveImage}
                  alt="Live Capture"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                  LIVE
                </span>
              </div>
            </div>

            {/* Reference Student Photo from Drive */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                صورة درايف المرجعية
              </span>
              <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-700 relative shadow-inner bg-slate-900">
                {matchedStudent.thumbnailLink || matchedStudent.imageBase64 ? (
                  <img
                    src={matchedStudent.imageBase64 || matchedStudent.thumbnailLink}
                    alt={matchedStudent.studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    {matchedStudent.studentName}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                  DRIVE
                </span>
              </div>
            </div>
          </div>

          {/* Student Info Card */}
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-white">
                  {matchedStudent.studentName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  رقم الطالب: {matchedStudent.studentId}
                </p>
              </div>

              {/* Confidence Badge */}
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                  isHighConfidence
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>مطابقة {confidence}%</span>
              </div>
            </div>

            {/* AI Reasoning */}
            {reasoning && (
              <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 leading-relaxed">
                <span className="text-emerald-400 font-medium">تحليل الذكاء الاصطناعي: </span>
                {reasoning}
              </p>
            )}
          </div>

          {/* Destructive Operation Notice (MANDATORY per Workspace Skill) */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-3 text-xs text-blue-200/90 space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-blue-300">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>الملف المستهدف في Google Drive:</span>
            </div>
            <p className="font-semibold text-white pl-5 truncate">
              {targetSheet ? targetSheet.name : 'كشف حضور الطلاب في جوجل درايف'}
            </p>
            
            {/* Auto New Date & Time Column Notice */}
            <div className="bg-emerald-950/50 border border-emerald-500/40 p-2.5 rounded-lg text-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>ميزة إضافة عمود التاريخ والوقت التلقائي:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                سيتم تلقائياً إنشاء عمود جديد في ملف الإكسل يحمل التاريخ والوقت الحالي:
                <strong className="text-white block mt-0.5 font-mono text-[10px] bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {`تاريخ ووقت الحضور (${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`}
                </strong>
              </p>
            </div>
          </div>

          {/* Optional Auto-Confirm Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoConfirmEnabled}
                onChange={(e) => setAutoConfirmEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-800"
              />
              <span>تأكيد تلقائي سريع بعد 3 ثوانٍ للمطابقة العالية</span>
            </label>

            {countdown !== null && (
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                {countdown}s
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={isRecording}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs md:text-sm font-medium transition disabled:opacity-50"
          >
            إلغاء / طالب آخر
          </button>

          <button
            onClick={onConfirm}
            disabled={isRecording}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs md:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            {isRecording ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{isRecording ? 'جاري التسجيل في درايف...' : 'تأكيد وتسجيل الحضور'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
