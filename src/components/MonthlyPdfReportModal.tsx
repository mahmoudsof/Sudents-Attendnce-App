import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Award,
  Building2,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { StudentPhoto, AttendanceRecord } from '../lib/driveApi';
import { normalizeToYMD } from './AttendanceCalendar';
import { useI18n } from '../lib/i18n';
import schoolLogo from '../assets/school_logo.jpg';

interface MonthlyPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentPhoto[];
  attendanceRecords: AttendanceRecord[];
  initialMonth?: number;
  initialYear?: number;
}

const ARABIC_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ENGLISH_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MonthlyPdfReportModal: React.FC<MonthlyPdfReportModalProps> = ({
  isOpen,
  onClose,
  students,
  attendanceRecords,
  initialMonth,
  initialYear,
}) => {
  const { t, language, dir } = useI18n();
  const monthNames = language === 'ar' ? ARABIC_MONTH_NAMES : ENGLISH_MONTH_NAMES;
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(
    initialYear || today.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialMonth !== undefined ? initialMonth : today.getMonth()
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'present_only' | 'frequent_absent'>('all');

  const reportRef = useRef<HTMLDivElement>(null);

  // Group records by YYYY-MM-DD
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    attendanceRecords.forEach((record) => {
      const ymd = normalizeToYMD(record.date) || normalizeToYMD(record.dateTime);
      if (!ymd) return;
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(record);
    });
    return map;
  }, [attendanceRecords]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of day numbers [1, 2, ..., daysInMonth]
  const monthDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Active recorded session days in this month
  const activeSessionDays = useMemo(() => {
    const sessionDays = new Set<number>();
    monthDays.forEach((dayNum) => {
      const mStr = String(selectedMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateKey = `${selectedYear}-${mStr}-${dStr}`;
      if (recordsByDate.has(dateKey) && recordsByDate.get(dateKey)!.length > 0) {
        sessionDays.add(dayNum);
      }
    });
    return sessionDays;
  }, [selectedYear, selectedMonth, monthDays, recordsByDate]);

  // Build matrix for each student
  const studentRows = useMemo(() => {
    // Unique list of all students
    const studentMap = new Map<string, { studentName: string; studentId: string }>();

    students.forEach((s) => {
      studentMap.set(s.studentName.trim().toLowerCase(), {
        studentName: s.studentName,
        studentId: s.studentId,
      });
    });

    attendanceRecords.forEach((r) => {
      if (r.studentName) {
        const key = r.studentName.trim().toLowerCase();
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            studentName: r.studentName,
            studentId: r.studentId || '',
          });
        }
      }
    });

    const list = Array.from(studentMap.values()).map((std) => {
      let presentDaysCount = 0;
      let absentDaysCount = 0;
      const dailyStatus: { [day: number]: { isPresent: boolean; time?: string; isSession: boolean } } = {};

      monthDays.forEach((dayNum) => {
        const mStr = String(selectedMonth + 1).padStart(2, '0');
        const dStr = String(dayNum).padStart(2, '0');
        const dateKey = `${selectedYear}-${mStr}-${dStr}`;
        const dayRecords = recordsByDate.get(dateKey) || [];
        const isSession = dayRecords.length > 0;

        if (!isSession) {
          dailyStatus[dayNum] = { isPresent: false, isSession: false };
        } else {
          const match = dayRecords.find(
            (r) =>
              r.studentName.trim().toLowerCase() === std.studentName.trim().toLowerCase() ||
              (std.studentId && r.studentId === std.studentId)
          );

          if (match && match.status === 'حاضر') {
            presentDaysCount++;
            dailyStatus[dayNum] = { isPresent: true, time: match.time, isSession: true };
          } else {
            absentDaysCount++;
            dailyStatus[dayNum] = { isPresent: false, isSession: true };
          }
        }
      });

      const totalRecordedSessions = activeSessionDays.size;
      const attendanceRate = totalRecordedSessions > 0
        ? Math.round((presentDaysCount / totalRecordedSessions) * 100)
        : 0;

      return {
        ...std,
        presentDaysCount,
        absentDaysCount,
        totalRecordedSessions,
        attendanceRate,
        dailyStatus,
      };
    });

    // Apply filter
    return list.filter((item) => {
      if (filterStatus === 'present_only') return item.presentDaysCount > 0;
      if (filterStatus === 'frequent_absent') return item.absentDaysCount >= 3;
      return true;
    });
  }, [students, attendanceRecords, monthDays, selectedYear, selectedMonth, recordsByDate, activeSessionDays, filterStatus]);

  // Overall Month Statistics
  const monthSummary = useMemo(() => {
    const totalStudents = studentRows.length;
    const totalRecordedDays = activeSessionDays.size;
    let totalPresentMarks = 0;
    let totalPossibleMarks = 0;

    studentRows.forEach((s) => {
      totalPresentMarks += s.presentDaysCount;
      totalPossibleMarks += s.totalRecordedSessions;
    });

    const averageRate = totalPossibleMarks > 0
      ? Math.round((totalPresentMarks / totalPossibleMarks) * 100)
      : 0;

    return {
      totalStudents,
      totalRecordedDays,
      totalPresentMarks,
      averageRate,
    };
  }, [studentRows, activeSessionDays]);

  // Trigger print dialog for the report
  const handlePrint = () => {
    window.print();
  };

  // Export report as self-contained standalone HTML / PDF printable file
  const handleDownloadHtml = () => {
    if (!reportRef.current) return;
    const content = reportRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير حضور الطلاب - ${ARABIC_MONTH_NAMES[selectedMonth]} ${selectedYear}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background: #fff; color: #111; margin: 0; padding: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: center; }
    th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
    .present { color: #15803d; font-weight: bold; background-color: #f0fdf4; }
    .absent { color: #b91c1c; font-weight: bold; background-color: #fef2f2; }
    .no-session { color: #94a3b8; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  ${content}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_حضور_الطلاب_${ARABIC_MONTH_NAMES[selectedMonth]}_${selectedYear}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-6xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[95vh] text-slate-100">
        {/* Modal Top Bar (Controls) */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>{t('pdf.modal_title')}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  {t('pdf.modal_badge')}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('pdf.modal_subtitle')}
              </p>
            </div>
          </div>

          {/* Month / Year / Status Selectors & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>
                  {t('pdf.month')} {name}
                </option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer font-mono"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {t('pdf.year')} {y}
                </option>
              ))}
            </select>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('pdf.print_btn')}</span>
            </button>

            {/* Download Standalone File Button */}
            <button
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="تنزيل نسخة تقرير قابلة للطباعة أوفلاين"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('pdf.download_html_btn')}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - Document Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40">
          <div
            id="pdf-report-content"
            ref={reportRef}
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-5xl mx-auto border border-slate-200 font-sans print:p-0 print:border-none print:shadow-none"
          >
            {/* Report Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                {/* Right Header Side (Ministry & School) */}
                <div className="text-right space-y-0.5">
                  <h4 className="font-bold text-xs text-slate-700">جمهورية مصر العربية</h4>
                  <h4 className="font-bold text-xs text-slate-700">وزارة التربية والتعليم والتعليم الفني</h4>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    المدرسة المصرية الفنية بجالكعيو
                  </h3>
                  <span className="text-[11px] text-slate-600 block">
                    نظام تسجيل الحضور الذكي بالتعرف على الوجه
                  </span>
                </div>

                {/* Center: School Logo */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-500 p-0.5 overflow-hidden shadow-sm">
                    <img
                      src={schoolLogo}
                      alt="شعار المدرسة المصرية الفنية"
                      className="w-full h-full object-contain rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/school_logo.jpg';
                      }}
                    />
                  </div>
                </div>

                {/* Left Header Side (Metadata & Month) */}
                <div className="text-left space-y-0.5 text-xs text-slate-700">
                  <p>
                    <strong>الشهر:</strong> {ARABIC_MONTH_NAMES[selectedMonth]} {selectedYear}
                  </p>
                  <p>
                    <strong>تاريخ إصدار التقرير:</strong> {today.toLocaleDateString('ar-EG')}
                  </p>
                  <p>
                    <strong>وقت الاستخراج:</strong> {today.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    إشراف: أ/ محمود عبدالعاطي حسن
                  </p>
                </div>
              </div>

              {/* Title Banner */}
              <div className="mt-4 text-center py-2 px-4 bg-slate-100 rounded-xl border border-slate-300">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  كشف الحضور والغياب الشهري للطلاب ({ARABIC_MONTH_NAMES[selectedMonth]} {selectedYear})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  سجل تفصيلي يوضح حالة الحضور والغياب اليومية لكل طالب مسجل في النظام
                </p>
              </div>
            </div>

            {/* Quick KPI Cards (Printed in Document) */}
            <div className="grid grid-cols-4 gap-3 mb-5 text-center text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block text-[11px]">إجمالي الطلاب</span>
                <strong className="text-sm font-bold text-slate-900 font-mono">
                  {monthSummary.totalStudents} طالب
                </strong>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-emerald-50">
                <span className="text-emerald-700 block text-[11px]">جلسات الحضور المسجلة</span>
                <strong className="text-sm font-bold text-emerald-800 font-mono">
                  {monthSummary.totalRecordedDays} أيام
                </strong>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-blue-50">
                <span className="text-blue-700 block text-[11px]">إجمالي مرات الحضور</span>
                <strong className="text-sm font-bold text-blue-800 font-mono">
                  {monthSummary.totalPresentMarks} تسجيل
                </strong>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-purple-50">
                <span className="text-purple-700 block text-[11px]">متوسط نسبة الحضور العامة</span>
                <strong className="text-sm font-bold text-purple-900 font-mono">
                  {monthSummary.averageRate}%
                </strong>
              </div>
            </div>

            {/* Student Monthly Attendance Matrix Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full border-collapse text-[10px] sm:text-[11px] text-right">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="p-2 border border-slate-600 w-8 text-center">#</th>
                    <th className="p-2 border border-slate-600 min-w-[140px] text-right">اسم الطالب</th>
                    <th className="p-2 border border-slate-600 w-20 text-center">الكود</th>
                    {monthDays.map((d) => {
                      const isSession = activeSessionDays.has(d);
                      return (
                        <th
                          key={d}
                          className={`p-1 border border-slate-600 w-6 text-center font-mono ${
                            isSession ? 'bg-slate-700 text-amber-300 font-bold' : 'text-slate-400'
                          }`}
                          title={`يوم ${d}`}
                        >
                          {d}
                        </th>
                      );
                    })}
                    <th className="p-2 border border-slate-600 w-12 text-center bg-emerald-800 text-white">حضور</th>
                    <th className="p-2 border border-slate-600 w-12 text-center bg-rose-800 text-white">غياب</th>
                    <th className="p-2 border border-slate-600 w-14 text-center bg-indigo-900 text-white">النسبة</th>
                  </tr>
                </thead>

                <tbody>
                  {studentRows.length === 0 ? (
                    <tr>
                      <td colSpan={monthDays.length + 6} className="text-center py-6 text-slate-500">
                        لا توجد بيانات حضور مسجلة لهذا الشهر.
                      </td>
                    </tr>
                  ) : (
                    studentRows.map((std, idx) => (
                      <tr
                        key={`${std.studentName}-${idx}`}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } hover:bg-slate-100/80 transition`}
                      >
                        <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border border-slate-300 font-bold text-slate-900 truncate">
                          {std.studentName}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-600">
                          {std.studentId || '-'}
                        </td>

                        {/* Daily status cells */}
                        {monthDays.map((d) => {
                          const dayInfo = std.dailyStatus[d];
                          if (!dayInfo || !dayInfo.isSession) {
                            return (
                              <td
                                key={d}
                                className="p-0.5 border border-slate-200 text-center text-slate-300 font-mono text-[9px]"
                              >
                                -
                              </td>
                            );
                          }
                          return (
                            <td
                              key={d}
                              className={`p-0.5 border border-slate-300 text-center font-bold text-[10px] ${
                                dayInfo.isPresent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                              title={
                                dayInfo.isPresent
                                  ? `حاضر (يوم ${d}) - ${dayInfo.time || ''}`
                                  : `غائب (يوم ${d})`
                              }
                            >
                              {dayInfo.isPresent ? '✔' : '✖'}
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="p-1.5 border border-slate-300 text-center font-bold text-emerald-700 bg-emerald-50/50 font-mono">
                          {std.presentDaysCount}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center font-bold text-rose-700 bg-rose-50/50 font-mono">
                          {std.absentDaysCount}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center font-bold font-mono text-slate-900 bg-indigo-50/50">
                          {std.attendanceRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Symbols Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <strong className="text-emerald-700 font-bold">✔</strong> حاضر
                </span>
                <span className="flex items-center gap-1">
                  <strong className="text-rose-700 font-bold">✖</strong> غائب
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">-</span> يوم عطلة / بدون جلسة
                </span>
              </div>
              <span className="text-slate-500">
                تم إنشاء هذا التقرير تلقائياً عبر نظام الحضور الذكي بالذكاء الاصطناعي
              </span>
            </div>

            {/* Official Signature Footer */}
            <div className="mt-8 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-900">
              <div className="space-y-6">
                <p>مسؤول الحضور ومعلم الكمبيوتر</p>
                <p className="font-serif text-slate-700">الأستاذ / محمود عبدالعاطي حسن</p>
                <div className="h-0.5 w-28 mx-auto bg-slate-400 border-dashed" />
              </div>

              <div className="space-y-6">
                <p>شؤون الطلاب والتسجيل</p>
                <p className="font-serif text-slate-400">التوقيع: ............................</p>
                <div className="h-0.5 w-28 mx-auto bg-slate-400 border-dashed" />
              </div>

              <div className="space-y-6">
                <p>خاتم واعتماد إدارة المدرسة</p>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 mx-auto flex items-center justify-center text-[10px] text-slate-400">
                  خاتم المدرسة
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            يمكنك طباعة التقرير أو حفظه كملف <strong>PDF</strong> عالي الدقة عبر خيار "حفظ بتنسيق PDF" في متصفحك.
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
