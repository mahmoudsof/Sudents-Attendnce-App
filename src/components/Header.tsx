import React from 'react';
import {
  Camera,
  FolderOpen,
  FileSpreadsheet,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Smartphone,
  Download,
  Globe,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DriveFolder, DriveSpreadsheet } from '../lib/driveApi';
import { useI18n } from '../lib/i18n';
import schoolLogo from '../assets/school_logo.jpg';

interface HeaderProps {
  user: User | null;
  selectedFolder: DriveFolder | null;
  selectedSheet: DriveSpreadsheet | null;
  photosCount: number;
  onOpenSettings: () => void;
  onOpenSplash?: () => void;
  onOpenApk?: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeTab: 'camera' | 'roster' | 'settings';
  setActiveTab: (tab: 'camera' | 'roster' | 'settings') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedFolder,
  selectedSheet,
  photosCount,
  onOpenSettings,
  onOpenSplash,
  onOpenApk,
  onLogin,
  onLogout,
  isLoggingIn,
  activeTab,
  setActiveTab,
}) => {
  const { t, language, toggleLanguage } = useI18n();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & School Branding */}
          <div
            onClick={onOpenSplash}
            className="flex items-center gap-2.5 cursor-pointer group"
            title={language === 'ar' ? 'عرض الشاشة الافتتاحية للمدرسة' : 'View school splash screen'}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shadow-md group-hover:scale-105 transition shrink-0 bg-slate-800">
              <img
                src={schoolLogo}
                alt={t('school.name')}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/school_logo.jpg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-300 block leading-none">
                  {t('school.name')}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-medium hidden sm:inline-flex items-center gap-0.5">
                  <Sparkles className="w-2 h-2" /> AI
                </span>
              </div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white group-hover:text-emerald-300 transition">
                {t('app.title')}
              </h1>
            </div>
          </div>

          {/* User Account & Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Toggle */}
            <button
              onClick={toggleLanguage}
              title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold transition shadow-sm active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('lang.switch')}</span>
            </button>

            {onOpenApk && (
              <button
                onClick={onOpenApk}
                title={t('nav.apk_title')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold transition shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{t('nav.apk')}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettings}
                  title={t('nav.select_folder')}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedFolder ? selectedFolder.name : t('nav.select_folder')}</span>
                </button>

                <div className="flex items-center gap-2 bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-6 h-6 rounded-full border border-slate-600"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-xs text-slate-300 font-medium max-w-[90px] truncate hidden md:inline">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={onLogout}
                    title={t('nav.logout')}
                    className="p-1 hover:text-rose-400 text-slate-400 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs py-1.5 px-3 bg-white text-slate-800 font-medium rounded-lg flex items-center gap-2 shadow hover:bg-slate-100 transition disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span>{t('nav.login')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Drive Status Bar for Mobile */}
        {user && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Folder indicator */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 hover:text-emerald-300 transition"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                  {selectedFolder
                    ? `${selectedFolder.name} (${photosCount} ${t('nav.photos_count')})`
                    : t('nav.no_folder')}
                </span>
                {selectedFolder ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </button>

              <span className="text-slate-600">|</span>

              {/* Sheet indicator */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 hover:text-emerald-300 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                  {selectedSheet ? selectedSheet.name : t('nav.no_sheet')}
                </span>
                {selectedSheet ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </button>
            </div>

            <button
              onClick={onOpenSettings}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 ml-auto text-[11px]"
            >
              {t('nav.change_files')}
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        {user && (
          <nav className="flex items-center gap-1 mt-3 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                activeTab === 'camera'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('nav.camera')}</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                activeTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('nav.roster')}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('nav.dashboard')}</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
