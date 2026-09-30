/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Camera,
  FolderOpen,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  BarChart3,
  Send,
  MessageSquare,
  Smartphone,
  Clock,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessTokenInMemory,
} from './lib/auth';
import {
  DriveFolder,
  DriveSpreadsheet,
  StudentPhoto,
  AttendanceRecord,
  listFolderImages,
  fetchDriveImageBase64,
  readAttendanceRecords,
  recordStudentAttendance,
} from './lib/driveApi';
import { Header } from './components/Header';
import { CameraScanner } from './components/CameraScanner';
import { AttendanceList } from './components/AttendanceList';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { WhatsAppAlertsModal } from './components/WhatsAppAlertsModal';
import { DrivePickerModal } from './components/DrivePickerModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SplashScreen } from './components/SplashScreen';
import { ApkInstallModal } from './components/ApkInstallModal';
import { sound } from './lib/sound';
import { useI18n } from './lib/i18n';
import schoolLogo from './assets/school_logo.jpg';

export default function App() {
  const { t, language, dir, toggleLanguage } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Tabs: 'camera' | 'roster' | 'settings'
  const [activeTab, setActiveTab] = useState<'camera' | 'roster' | 'settings'>('camera');
  const [settingsSubTab, setSettingsSubTab] = useState<'dashboard' | 'files'>('dashboard');

  // Google Drive state
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<DriveSpreadsheet | null>(null);
  const [studentPhotos, setStudentPhotos] = useState<StudentPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // AI Matching state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    liveImage: string;
    matchedStudent: StudentPhoto | null;
    confidence: number;
    reasoning: string;
  }>({
    isOpen: false,
    liveImage: '',
    matchedStudent: null,
    confidence: 0,
    reasoning: '',
  });
  const [isRecording, setIsRecording] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setAccessTokenInMemory(res.accessToken);
        showToast('تم تسجيل الدخول بحساب جوجل بنجاح!', 'success');
        // Open Drive picker automatically on first login if nothing is selected
        if (!selectedFolder || !selectedSheet) {
          setIsPickerOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSelectedFolder(null);
      setSelectedSheet(null);
      setStudentPhotos([]);
      setAttendanceRecords([]);
      showToast('تم تسجيل الخروج بنجاح', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Load photos when folder is selected
  const loadFolderStudents = useCallback(async (folder: DriveFolder, token: string) => {
    setIsLoadingPhotos(true);
    try {
      const photos = await listFolderImages(token, folder.id);
      setStudentPhotos(photos);
      showToast(`تم العثور على ${photos.length} صورة طالب في مجلد "${folder.name}"`, 'success');
    } catch (err: any) {
      console.error('Failed to load student photos:', err);
      showToast('تعذر جلب صور مجلد الطلاب', 'error');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [showToast]);

  // Load attendance records when sheet is selected
  const loadSheetRecords = useCallback(async (sheet: DriveSpreadsheet, token: string) => {
    setIsLoadingRecords(true);
    try {
      const records = await readAttendanceRecords(token, sheet);
      setAttendanceRecords(records);
    } catch (err: any) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  // When selectedFolder changes
  useEffect(() => {
    if (selectedFolder && accessToken) {
      loadFolderStudents(selectedFolder, accessToken);
    }
  }, [selectedFolder, accessToken, loadFolderStudents]);

  // When selectedSheet changes
  useEffect(() => {
    if (selectedSheet && accessToken) {
      loadSheetRecords(selectedSheet, accessToken);
    }
  }, [selectedSheet, accessToken, loadSheetRecords]);

  // Capture & Match face using Gemini 3.8 Flash
  const handleCaptureAndMatch = async (liveImageBase64: string) => {
    if (!accessToken) {
      showToast('يرجى تسجيل الدخول بحساب Google أولاً', 'error');
      return;
    }

    if (!selectedFolder || studentPhotos.length === 0) {
      showToast('يرجى اختيار مجلد صور الطلاب من جوجل درايف أولاً', 'error');
      setIsPickerOpen(true);
      return;
    }

    if (!selectedSheet) {
      showToast('يرجى اختيار أو إنشاء ملف الإكسل لتسجيل الحضور أولاً', 'error');
      setIsPickerOpen(true);
      return;
    }

    setIsAnalyzing(true);

    try {
      // Ensure candidate images have base64 data loaded
      // To keep payload light and fast, prepare candidate array with thumbnails or base64
      const candidatesToProcess = studentPhotos.slice(0, 15);
      const candidatesWithImages = await Promise.all(
        candidatesToProcess.map(async (std) => {
          if (std.imageBase64) {
            return {
              id: std.id,
              name: std.studentName,
              imageBase64: std.imageBase64,
              mimeType: std.mimeType,
            };
          }
          try {
            const base64 = await fetchDriveImageBase64(accessToken, std.id);
            std.imageBase64 = base64; // cache locally
            return {
              id: std.id,
              name: std.studentName,
              imageBase64: base64,
              mimeType: std.mimeType,
            };
          } catch {
            return null;
          }
        })
      );

      const validCandidates = candidatesWithImages.filter(Boolean);

      if (validCandidates.length === 0) {
        throw new Error('تعذر تحميل صور الطلاب المرجعية من Google Drive');
      }

      // Call full-stack server endpoint /api/compare-face
      const response = await fetch('/api/compare-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liveImage: liveImageBase64,
          candidates: validCandidates,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'فشلت عملية مقارنة الوجه بالذكاء الاصطناعي');
      }

      const result = await response.json();

      if (!result.hasFace) {
        sound.playError();
        showToast('لم يتم اكتشاف وجه واضح في الصورة. يرجى الوقوف في إضاءة جيدة وأمام الكاميرا مباشرة.', 'error');
        return;
      }

      if (result.matchedCandidateId) {
        const matched = studentPhotos.find((s) => s.id === result.matchedCandidateId);
        if (matched) {
          sound.playSuccess();
          // Open Explicit Confirmation Modal (MANDATORY per Workspace Skill)
          setConfirmationState({
            isOpen: true,
            liveImage: liveImageBase64,
            matchedStudent: matched,
            confidence: Number(result.confidence) || 90,
            reasoning: result.reasoning || 'تمت مطابقة ملامح الوجه بنجاح مع صورة الطالب المرجعية.',
          });
          return;
        }
      }

      // If no confident match found
      sound.playError();
      showToast(
        result.reasoning ||
          'لم يتم العثور على تطابق كافٍ (>65%) مع طلاب هذا المجلد. يرجى إعادة المحاولة أو التسجيل يدوياً.',
        'info'
      );
    } catch (error: any) {
      console.error('Match error:', error);
      sound.playError();
      showToast(error.message || 'حدث خطأ أثناء فحص الصورة', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm attendance record (MANDATORY User Confirmation Dialog handler)
  const handleConfirmAttendance = async () => {
    if (!accessToken || !selectedSheet || !confirmationState.matchedStudent) return;

    setIsRecording(true);
    const student = confirmationState.matchedStudent;
    const confidence = confirmationState.confidence;

    try {
      const res = await recordStudentAttendance(accessToken, selectedSheet, {
        studentName: student.studentName,
        studentId: student.studentId,
        confidence,
        status: 'حاضر',
        notes: `تم التحقق عبر الكاميرا بنسبة ${confidence}%`,
        autoAddDateTimeColumn: true,
      });

      sound.playSuccess();
      showToast(res.message, 'success');

      // Close modal
      setConfirmationState((prev) => ({ ...prev, isOpen: false }));

      // Reload attendance records
      loadSheetRecords(selectedSheet, accessToken);
    } catch (err: any) {
      console.error('Record attendance error:', err);
      showToast(err.message || 'فشل في تحديث ملف الحضور في جوجل درايف', 'error');
    } finally {
      setIsRecording(false);
    }
  };

  // Manual mark attendance
  const handleManualMark = async (student: StudentPhoto, status: 'حاضر' | 'غائب') => {
    if (!accessToken || !selectedSheet) {
      showToast('يرجى تحديد ملف الحضور في جوجل درايف أولاً', 'error');
      return;
    }

    try {
      const res = await recordStudentAttendance(accessToken, selectedSheet, {
        studentName: student.studentName,
        studentId: student.studentId,
        confidence: 100,
        status,
        notes: `تسجيل يدوي بواسطة المعلم (${status})`,
        autoAddDateTimeColumn: true,
      });
      showToast(res.message, 'success');
      loadSheetRecords(selectedSheet, accessToken);
    } catch (err: any) {
      console.error('Manual mark error:', err);
      showToast(err.message || 'فشل تسجيل الحضور يدوياً', 'error');
    }
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        user={user}
        selectedFolder={selectedFolder}
        selectedSheet={selectedSheet}
        photosCount={studentPhotos.length}
        onOpenSettings={() => setIsPickerOpen(true)}
        onOpenSplash={() => setShowSplashScreen(true)}
        onOpenApk={() => setIsApkModalOpen(true)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 flex flex-col items-center">
        {!user ? (
          /* Welcome & Sign-In Screen */
          <div className="flex-1 w-full flex flex-col items-center justify-center py-6 text-center max-w-md mx-auto space-y-5">
            {/* School Logo */}
            <div
              onClick={() => setShowSplashScreen(true)}
              className="relative cursor-pointer group"
              title="انقر لعرض الشاشة الافتتاحية"
            >
              <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-300" />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-slate-900 border-4 border-amber-400/90 shadow-2xl p-1">
                <img
                  src={schoolLogo}
                  alt="شعار المدرسة المصرية الفنية بجالكعيو"
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/school_logo.jpg';
                  }}
                />
              </div>
            </div>

            {/* School Name & Program Name */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-300 tracking-wide block">
                {t('school.name')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('app.title')}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed px-4">
                {t('login.desc')}
              </p>
            </div>

            {/* Attribution Card */}
            <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-amber-500/30 px-4 py-2.5 rounded-2xl shadow-lg w-full text-center">
              <p className="text-xs sm:text-sm font-bold text-amber-300 leading-snug">
                {language === 'ar'
                  ? 'هذا البرنامج طور عن طريق الاستاذ محمود عبدالعاطي حسن'
                  : 'Developed by Mr. Mahmoud Abdelaty Hassan'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'ar' ? 'معلم الكمبيوتر بالمدرسة' : 'Computer Science Teacher'}
              </p>
            </div>

            {/* Feature cards */}
            <div className="w-full grid grid-cols-1 gap-2.5 text-right">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <h4 className="font-semibold text-xs text-white">
                    {language === 'ar' ? 'مجلد صور الطلاب في درايف' : 'Google Drive Photos Folder'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'قراءة صور الطلاب وأسمائهم مباشرة من مجلد درايف'
                      : 'Load student photos and rosters seamlessly from Drive'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <h4 className="font-semibold text-xs text-white">
                    {language === 'ar' ? 'مطابقة بيومترية دقيقة بالذكاء الاصطناعي' : 'Biometric AI Facial Recognition'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'كاميرا الموبايل تقارن الوجه الحي بملامح الطالب فورياً'
                      : 'Camera live stream compares student face instantly with Gemini AI'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <h4 className="font-semibold text-xs text-white">
                    {language === 'ar' ? 'تحديث ملف الإكسل في جوجل درايف' : 'Google Sheets & Excel Sync'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'تسجيل وتأكيد الحضور مع الوقت والتاريخ ونسبة التطابق'
                      : 'Logs attendance with date, timestamp, and AI confidence'}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Google Sign-In Button */}
            <div className="pt-2 w-full flex flex-col items-center">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button w-full py-3 h-12 shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-bold text-sm">
                    {isLoggingIn ? t('login.connecting') : t('login.btn')}
                  </span>
                </div>
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                {t('login.permission_notice')}
              </p>

              <button
                onClick={() => setIsApkModalOpen(true)}
                className="w-full mt-2 py-2.5 px-4 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
              >
                <Smartphone className="w-4 h-4" />
                <span>{t('login.install_apk_btn')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated App Body */
          <div className="w-full flex-1 flex flex-col items-center">
            {/* Folder / Sheet Missing Warning Banner */}
            {(!selectedFolder || !selectedSheet) && (
              <div className="w-full mb-3 bg-amber-950/40 border border-amber-500/50 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {!selectedFolder && !selectedSheet
                      ? t('alert.missing_files')
                      : !selectedFolder
                      ? t('alert.missing_folder')
                      : t('alert.missing_sheet')}
                  </span>
                </div>
                <button
                  onClick={() => setIsPickerOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shrink-0"
                >
                  {t('alert.select_files_btn')}
                </button>
              </div>
            )}

            {/* TAB 1: Camera Scanner */}
            {activeTab === 'camera' && (
              <div className="w-full flex flex-col items-center gap-3">
                <CameraScanner
                  onCaptureAndMatch={handleCaptureAndMatch}
                  isAnalyzing={isAnalyzing}
                  studentPhotos={studentPhotos}
                  selectedFolderName={selectedFolder?.name || ''}
                  selectedSheetName={selectedSheet?.name || ''}
                />
              </div>
            )}

            {/* TAB 2: Attendance Roster */}
            {activeTab === 'roster' && (
              <AttendanceList
                students={studentPhotos}
                attendanceRecords={attendanceRecords}
                selectedSheet={selectedSheet}
                onRefreshRecords={() => {
                  if (selectedSheet && accessToken) {
                    loadSheetRecords(selectedSheet, accessToken);
                    showToast('تم تحديث كشف الحضور من درايف', 'success');
                  }
                }}
                isLoadingRecords={isLoadingRecords}
                onManualMark={handleManualMark}
                onOpenWhatsAppAlerts={() => setIsWhatsAppModalOpen(true)}
              />
            )}

            {/* TAB 3: Dashboard & Settings Overview */}
            {activeTab === 'settings' && (
              <div className="w-full max-w-2xl space-y-4">
                {/* Subtabs switcher */}
                <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md">
                  <button
                    onClick={() => setSettingsSubTab('dashboard')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      settingsSubTab === 'dashboard'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{t('dashboard.subtab_charts')}</span>
                  </button>

                  <button
                    onClick={() => setSettingsSubTab('files')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      settingsSubTab === 'files'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{t('dashboard.subtab_files')}</span>
                  </button>
                </div>

                {/* Subtab 1: Recharts Dashboard */}
                {settingsSubTab === 'dashboard' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-emerald-400" />
                          <span>تحليلات الحضور والغياب</span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          بيانات مستخرجة ومحدثة مباشرة من ملف الإكسل وجدول البيانات
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsWhatsAppModalOpen(true)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>تنبيهات واتساب</span>
                        </button>

                        <button
                          onClick={() => {
                            if (selectedSheet && accessToken) {
                              loadSheetRecords(selectedSheet, accessToken);
                              showToast('تم تحديث الرسوم البيانية من ملف الإكسل', 'success');
                            }
                          }}
                          disabled={isLoadingRecords || !selectedSheet}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                          <span>تحديث الرسوم</span>
                        </button>
                      </div>
                    </div>

                    <AttendanceDashboard
                      students={studentPhotos}
                      attendanceRecords={attendanceRecords}
                      selectedSheet={selectedSheet}
                      onOpenWhatsAppAlerts={() => setIsWhatsAppModalOpen(true)}
                    />
                  </div>
                )}

                {/* Subtab 2: Drive & Files Settings */}
                {settingsSubTab === 'files' && (
                  <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                        <span>إعدادات ملفات Google Drive</span>
                      </h2>
                      <button
                        onClick={() => setIsPickerOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        تغيير الملفات
                      </button>
                    </div>

                    {/* Folder card */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">1. مجلد صور الطلاب:</span>
                      <p className="font-bold text-sm text-white">
                        {selectedFolder ? selectedFolder.name : 'لم يتم اختيار مجلد بعد'}
                      </p>
                      <p className="text-xs text-emerald-400">
                        {studentPhotos.length} صورة طالب جاهزة للمطابقة
                      </p>
                    </div>

                    {/* Sheet card */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">2. ملف تسجيل الحضور:</span>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-white truncate max-w-[200px]">
                          {selectedSheet ? selectedSheet.name : 'لم يتم اختيار ملف بعد'}
                        </p>
                        {selectedSheet?.webViewLink && (
                          <a
                            href={selectedSheet.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>عرض في درايف</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedSheet?.isGoogleSheet ? 'Google Sheets' : 'Microsoft Excel (.xlsx)'}
                      </p>
                    </div>

                    {/* Automatic Date & Time Column Feature Card */}
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span>ميزة إضافة عمود التاريخ والوقت التلقائي في ملف الإكسل</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                          مفعل تلقائياً
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        عند تسجيل حضور أي طالب بالكاميرا أو يدوياً، يتم تلقائياً إنشاء عمود جديد في ملف الإكسل يحتوي على التاريخ والوقت الحالي بالثواني:
                      </p>
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 flex items-center justify-between">
                        <span className="text-slate-400">عنوان العمود الجديد:</span>
                        <span className="font-bold">
                          {`تاريخ ووقت الحضور (${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})`}
                        </span>
                      </div>
                    </div>

                    {/* School & Developer Card */}
                    <div className="bg-gradient-to-r from-slate-950/80 via-slate-900/80 to-slate-950/80 p-4 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-900">
                          <img
                            src={schoolLogo}
                            alt="شعار المدرسة"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/school_logo.jpg';
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-amber-300">
                            المدرسة المصرية الفنية بجالكعيو
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-0.5 font-medium leading-relaxed">
                            هذا البرنامج طور عن طريق الاستاذ محمود عبدالعاطي حسن - معلم الكمبيوتر بالمدرسة
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowSplashScreen(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shrink-0 transition"
                      >
                        عرض الشاشة الافتتاحية
                      </button>
                    </div>

                    {/* How it works info */}
                    <div className="bg-blue-950/30 border border-blue-900/40 p-3.5 rounded-xl text-xs text-blue-200/90 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-300">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>كيف يعمل التطبيق؟</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                        <li>ضع صور الطلاب في مجلد على Google Drive (مثال: "أحمد علي.jpg").</li>
                        <li>حدد المجلد وملف الإكسل من نافذة الإعدادات.</li>
                        <li>افتح الكاميرا وسيقوم الذكاء الاصطناعي بمطابقة الوجه الحي مع صور درايف.</li>
                        <li>ستظهر نافذة تأكيد لتسجيل وتحديث حضور الطالب فورياً في ملف الإكسل.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Google Drive Selection Modal */}
      {accessToken && (
        <DrivePickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          accessToken={accessToken}
          selectedFolder={selectedFolder}
          onSelectFolder={(folder) => setSelectedFolder(folder)}
          selectedSheet={selectedSheet}
          onSelectSheet={(sheet) => setSelectedSheet(sheet)}
          onFolderImagesLoaded={(imgs) => setStudentPhotos(imgs)}
        />
      )}

      {/* Destructive Operation Confirmation Modal (MANDATORY per Workspace Skill) */}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        liveImage={confirmationState.liveImage}
        matchedStudent={confirmationState.matchedStudent}
        confidence={confirmationState.confidence}
        reasoning={confirmationState.reasoning}
        targetSheet={selectedSheet}
        onConfirm={handleConfirmAttendance}
        onCancel={() =>
          setConfirmationState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        isRecording={isRecording}
      />

      {/* WhatsApp Absence Alerts Modal (Cloud Function) */}
      <WhatsAppAlertsModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        students={studentPhotos}
        attendanceRecords={attendanceRecords}
        selectedSheet={selectedSheet}
      />

      {/* Official Opening Splash Screen */}
      {showSplashScreen && (
        <SplashScreen onEnter={() => setShowSplashScreen(false)} />
      )}

      {/* APK & Mobile Installation Modal */}
      <ApkInstallModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}
