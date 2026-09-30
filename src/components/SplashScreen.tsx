import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import schoolLogo from '../assets/school_logo.jpg';

interface SplashScreenProps {
  onEnter: () => void;
  autoCloseDelay?: number; // optional auto-close in ms (e.g. 5000)
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onEnter,
  autoCloseDelay = 0,
}) => {
  const [countdown, setCountdown] = useState<number | null>(
    autoCloseDelay > 0 ? Math.ceil(autoCloseDelay / 1000) : null
  );

  useEffect(() => {
    if (autoCloseDelay <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          onEnter();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoCloseDelay, onEnter]);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-between p-6 overflow-y-auto text-slate-100 select-none animate-in fade-in duration-300"
    >
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Section: Badges */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between text-xs text-slate-400 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-300">التعليم الفني والتقني</span>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300 font-mono text-[11px]">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>AI Vision 2026</span>
        </div>
      </div>

      {/* Center Main Identity Section */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center my-auto py-6 space-y-6">
        {/* 1. Official School Logo at top of screen */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 rounded-full blur-lg opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse" />
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-slate-900 border-4 border-amber-400/80 shadow-2xl p-1">
            <img
              src={schoolLogo}
              alt="شعار المدرسة المصرية الفنية بجالكعيو"
              className="w-full h-full object-contain rounded-full bg-white/5"
              onError={(e) => {
                // Fallback to public path if module import fails
                (e.target as HTMLImageElement).src = '/school_logo.jpg';
              }}
            />
          </div>
        </div>

        {/* 2. School Name */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-200 tracking-tight leading-snug drop-shadow">
            المدرسة المصرية الفنية بجالكعيو
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium flex items-center justify-center gap-2">
            <span>جمهورية مصر العربية</span>
            <span className="text-slate-600">•</span>
            <span>دولة الصومال</span>
          </p>
        </div>

        {/* 3. Program Name */}
        <div className="bg-slate-900/90 border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-xl space-y-1 w-full max-w-sm">
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام الحضور الذكي</span>
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
            برنامج تسجيل حضور الطلاب بالتعرف على الوجه
          </h2>
          <p className="text-[11px] text-slate-400">
            تكامل مباشر مع كاميرا الموبايل ومجلدات جوجل درايف وملفات الإكسل
          </p>
        </div>

        {/* 4. Exact Attribution statement requested by user */}
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-amber-500/30 px-4 py-3 rounded-2xl shadow-lg w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs sm:text-sm leading-relaxed">
            <Laptop className="w-4 h-4 shrink-0 text-amber-400" />
            <span>هذا البرنامج طور عن طريق الاستاذ محمود عبدالعاطي حسن</span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            معلم الكمبيوتر بالمدرسة
          </p>
        </div>
      </div>

      {/* Bottom Section: Enter Button & Controls */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-3 pb-4">
        <button
          onClick={onEnter}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition"
        >
          <span>الدخول إلى النظام</span>
          <ArrowLeft className="w-5 h-5" />
        </button>

        {countdown !== null && (
          <span className="text-[11px] text-slate-500 font-mono">
            سيتم الدخول تلقائياً خلال {countdown} ثوانٍ...
          </span>
        )}

        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>النسخة المعتمدة</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Code2 className="w-3 h-3 text-cyan-500" />
            <span>قسم الحاسب الآلي وتكنولوجيا المعلومات</span>
          </span>
        </div>
      </div>
    </div>
  );
};
