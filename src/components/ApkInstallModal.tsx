import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  Check,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  QrCode,
  ShieldCheck,
  HelpCircle,
  Laptop,
} from 'lucide-react';
import schoolLogo from '../assets/school_logo.jpg';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'apk' | 'qr'>('direct');

  // App live URL
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-55jqyyzlnnrzjtm5v65ztk-123944487906.europe-west3.run.app';

  // Listen for beforeinstallprompt event on Android
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setActiveTab('direct');
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  // PWABuilder direct link for creating signed Android APK package
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    appUrl
  )}`;

  // Google Chart API QR Code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    appUrl
  )}`;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 p-0.5 bg-slate-800 shrink-0 shadow-md">
              <img
                src={schoolLogo}
                alt="شعار المدرسة"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/school_logo.jpg';
                }}
              />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-1.5 text-white">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>تثبيت وتشغيل التطبيق على الهاتف (APK)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                المدرسة المصرية الفنية بجالكعيو - نظام الحضور الذكي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'direct'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تثبيت فوري للهاتف</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'apk'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل ملف الـ APK</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'qr'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>مسح QR Code</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Direct Android WebAPK Install */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>تثبيت التطبيق كتطبيق أندرويد رسمي (WebAPK)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يتميز التطبيق بأنه مجهز كـ <strong>تطبيق ويب تقدمي (PWA) معتمد</strong>، مما يعني أنه
                  يمكن تثبيته مباشرة كأيقونة تطبيق كاملة على هاتفك الأندرويد دون الحاجة لمتجر Google Play!
                </p>

                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تثبيت التطبيق على هذا الهاتف الآن</span>
                  </button>
                )}
              </div>

              {/* Instructions steps */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">خطوات التثبيت على هاتف أندرويد:</span>
                <ol className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      افتح رابط التطبيق عبر متصفح <strong>Google Chrome</strong> على هاتفك المحمول.
                    </span>
                  </li>

                  <li className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      اضغط على قائمة الخيارات (الثلاث نقاط <strong>⋮</strong>) في أعلى يمين المتصفح.
                    </span>
                  </li>

                  <li className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      اختر <strong>«تثبيت التطبيق» (Install App)</strong> أو <strong>«الإضافة إلى الشاشة الرئيسية»</strong>.
                    </span>
                  </li>

                  <li className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      سيتم تثبيت التطبيق بشعار المدرسة واسمها الرسمي، وسيعمل بشكل مستقل بكامل الشاشة وكاميرا الموبايل.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Copy App URL bar */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] text-slate-400">رابط التطبيق لفتحه على الهاتف:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Standalone APK via PWABuilder / Bubblewrap */}
          {activeTab === 'apk' && (
            <div className="space-y-4 text-xs">
              <div className="bg-blue-950/30 border border-blue-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs sm:text-sm">
                  <Download className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>توليد وتنزيل ملف APK حقيقي ومستقل (Android APK Package)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  نظراً لأن التطبيق مبني بتقنيات PWA الحديثة، يمكنك تحويله إلى ملف تثبيت <strong>APK / AAB</strong> رسمي
                  بضغطة واحدة باستخدام أداة <strong>PWABuilder</strong> المعتمدة من Google و Microsoft:
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-white text-xs">طريقة تنزيل ملف الـ APK في خطوتين:</h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">1.</span>
                    <span>
                      اضغط على الزر أدناه لفتح أداة <strong>PWABuilder</strong> الخاصة بهذا التطبيق.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">2.</span>
                    <span>
                      اضغط على <strong>«Package for Stores»</strong> ثم اختر <strong>Android</strong> لتحميل ملف الـ <strong>APK</strong> الموقّع مباشرة إلى جهازك!
                    </span>
                  </div>
                </div>

                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>فتح أداة تحميل ملف الـ APK (PWABuilder)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Developer attribution note */}
              <div className="bg-slate-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center gap-2.5">
                <Laptop className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-200/90">
                  تطوير: الأستاذ محمود عبدالعاطي حسن - معلم الكمبيوتر بالمدرسة المصرية الفنية بجالكعيو
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code Scanner */}
          {activeTab === 'qr' && (
            <div className="space-y-4 flex flex-col items-center text-center">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-white">امسح الكود بكاميرا الموبايل</h3>
                <p className="text-xs text-slate-400">
                  افتح كاميرا هاتفك وامسح رمز QR التالي لفتح وتثبيت التطبيق مباشرة
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500/60 inline-block">
                <img
                  src={qrCodeUrl}
                  alt="QR Code للتطبيق"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>

              <button
                onClick={handleCopyLink}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'تم نسخ الرابط!' : 'نسخ رابط التطبيق'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            جاهز للاستخدام الفوري على جميع هواتف Android و iOS
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
