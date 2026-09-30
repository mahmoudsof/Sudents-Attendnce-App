import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Info,
  Filter,
  CalendarCheck,
  CalendarX,
  X,
  Printer,
} from 'lucide-react';
import { StudentPhoto, AttendanceRecord } from '../lib/driveApi';
import { useI18n } from '../lib/i18n';

interface AttendanceCalendarProps {
  students: StudentPhoto[];
  attendanceRecords: AttendanceRecord[];
  onOpenPdfReport?: (month: number, year: number) => void;
}

// Convert Arabic digits to Western digits
const toEnglishDigits = (str: string): string => {
  return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
};

// Normalize any date string into YYYY-MM-DD
export const normalizeToYMD = (rawDate: string | undefined): string | null => {
  if (!rawDate) return null;
  const cleaned = toEnglishDigits(rawDate.trim());

  // Check if it's already YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check if it's DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback to Date parser
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

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

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ENGLISH_WEEKDAYS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  students,
  attendanceRecords,
  onOpenPdfReport,
}) => {
  const { t, language } = useI18n();
  const monthNames = language === 'ar' ? ARABIC_MONTH_NAMES : ENGLISH_MONTH_NAMES;
  const weekdays = language === 'ar' ? ARABIC_WEEKDAYS : ENGLISH_WEEKDAYS;
  // Current viewed month and year
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11

  // Filter by single student or all
  const [selectedStudentName, setSelectedStudentName] = useState<string>('all');

  // Selected date for day details popover/drawer
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Map of date (YYYY-MM-DD) -> array of records for that day
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();

    attendanceRecords.forEach((record) => {
      const ymd = normalizeToYMD(record.date) || normalizeToYMD(record.dateTime);
      if (!ymd) return;

      if (!map.has(ymd)) {
        map.set(ymd, []);
      }
      map.get(ymd)!.push(record);
    });

    return map;
  }, [attendanceRecords]);

  // List of all unique student names (from students roster and attendance records)
  const allStudentNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.studentName));
    attendanceRecords.forEach((r) => {
      if (r.studentName) set.add(r.studentName);
    });
    return Array.from(set).sort();
  }, [students, attendanceRecords]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Generate calendar grid for currentYear and currentMonth
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];

    // Empty cells before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNumber: 0, dateKey: '' });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${mStr}-${dStr}`;
      days.push({ dayNumber: d, dateKey });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Calculate day status depending on filter
  const getDayStatus = (dateKey: string) => {
    if (!dateKey) return null;

    const dayRecords = recordsByDate.get(dateKey) || [];
    const hasRecords = dayRecords.length > 0;

    if (selectedStudentName !== 'all') {
      // Single student mode: check if this student was present or absent on this date
      const studentRec = dayRecords.find(
        (r) =>
          r.studentName.trim().toLowerCase() ===
          selectedStudentName.trim().toLowerCase()
      );

      if (!studentRec) {
        // If other students have attendance records today, this student is considered absent
        if (hasRecords) {
          return {
            type: 'absent' as const,
            label: 'غائب',
            bgColor: 'bg-rose-950/50 border-rose-600/40 text-rose-300',
            badgeColor: 'bg-rose-500/20 text-rose-300',
            record: null,
          };
        }
        return {
          type: 'none' as const,
          label: 'لا توجد جلسة',
          bgColor: 'bg-slate-900/40 border-slate-800 text-slate-500',
          badgeColor: '',
          record: null,
        };
      }

      if (studentRec.status === 'حاضر') {
        return {
          type: 'present' as const,
          label: 'حاضر',
          bgColor: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-900/30',
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
          record: studentRec,
        };
      } else {
        return {
          type: 'absent' as const,
          label: 'غائب',
          bgColor: 'bg-rose-950/60 border-rose-500/50 text-rose-300',
          badgeColor: 'bg-rose-500/20 text-rose-300',
          record: studentRec,
        };
      }
    } else {
      // Overview mode for all students:
      if (!hasRecords) {
        return {
          type: 'none' as const,
          label: 'بدون تسجيل',
          bgColor: 'bg-slate-900/40 border-slate-800/80 text-slate-500 hover:border-slate-700',
          presentCount: 0,
          totalCount: 0,
          rate: 0,
        };
      }

      const totalExpected = Math.max(students.length, dayRecords.length);
      const presentCount = dayRecords.filter((r) => r.status === 'حاضر').length;
      const rate = totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0;

      if (rate >= 80) {
        return {
          type: 'high' as const,
          label: `حضور عالي (${rate}%)`,
          bgColor: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:border-emerald-400 shadow-md shadow-emerald-950/50',
          presentCount,
          totalCount: totalExpected,
          rate,
        };
      } else if (rate >= 50) {
        return {
          type: 'medium' as const,
          label: `حضور متوسط (${rate}%)`,
          bgColor: 'bg-amber-950/60 border-amber-500/60 text-amber-300 hover:border-amber-400',
          presentCount,
          totalCount: totalExpected,
          rate,
        };
      } else {
        return {
          type: 'low' as const,
          label: `حضور منخفض (${rate}%)`,
          bgColor: 'bg-rose-950/60 border-rose-500/60 text-rose-300 hover:border-rose-400',
          presentCount,
          totalCount: totalExpected,
          rate,
        };
      }
    }
  };

  // Month stats for current view
  const monthStats = useMemo(() => {
    let recordedDaysCount = 0;
    let totalPresentInMonth = 0;
    let totalAbsentInMonth = 0;

    calendarDays.forEach(({ dateKey }) => {
      if (!dateKey) return;
      const st = getDayStatus(dateKey);
      if (!st || st.type === 'none') return;

      recordedDaysCount++;
      if (selectedStudentName !== 'all') {
        if (st.type === 'present') totalPresentInMonth++;
        if (st.type === 'absent') totalAbsentInMonth++;
      } else {
        totalPresentInMonth += (st as any).presentCount || 0;
        const total = (st as any).totalCount || 0;
        totalAbsentInMonth += Math.max(0, total - ((st as any).presentCount || 0));
      }
    });

    const totalActions = totalPresentInMonth + totalAbsentInMonth;
    const rate = totalActions > 0 ? Math.round((totalPresentInMonth / totalActions) * 100) : 0;

    return {
      recordedDaysCount,
      totalPresentInMonth,
      totalAbsentInMonth,
      rate,
    };
  }, [calendarDays, selectedStudentName, recordsByDate]);

  // Selected Day Details
  const selectedDayDetails = useMemo(() => {
    if (!selectedDate) return null;

    const dayRecords = recordsByDate.get(selectedDate) || [];
    const totalExpected = Math.max(students.length, dayRecords.length);
    const presentCount = dayRecords.filter((r) => r.status === 'حاضر').length;
    const absentCount = Math.max(0, totalExpected - presentCount);

    // Build complete student roster state for this selected day
    const rosterList = students.map((std) => {
      const matchRec = dayRecords.find(
        (r) =>
          r.studentName.trim().toLowerCase() ===
            std.studentName.trim().toLowerCase() ||
          (std.studentId && r.studentId === std.studentId)
      );

      return {
        student: std,
        isPresent: matchRec ? matchRec.status === 'حاضر' : false,
        time: matchRec?.time || null,
        confidence: matchRec?.confidence || null,
        notes: matchRec?.notes || null,
      };
    });

    // Also include any records in dayRecords that weren't in students
    dayRecords.forEach((r) => {
      const exists = rosterList.some(
        (item) =>
          item.student.studentName.trim().toLowerCase() ===
          r.studentName.trim().toLowerCase()
      );
      if (!exists && r.studentName) {
        rosterList.push({
          student: {
            id: r.studentId || r.studentName,
            name: r.studentName,
            studentName: r.studentName,
            studentId: r.studentId || '',
            mimeType: 'image/jpeg',
            thumbnailLink: '',
          },
          isPresent: r.status === 'حاضر',
          time: r.time || null,
          confidence: r.confidence || null,
          notes: r.notes || null,
        });
      }
    });

    return {
      dateStr: selectedDate,
      dayRecords,
      totalExpected,
      presentCount,
      absentCount,
      rosterList,
    };
  }, [selectedDate, recordsByDate, students]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 w-full text-slate-100">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
              <span>{t('calendar.title')}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                {t('calendar.badge')}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('calendar.subtitle')}
            </p>
          </div>
        </div>

        {/* Student Selector Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 text-[11px] shrink-0">{t('calendar.filter_for')}</span>
            <select
              value={selectedStudentName}
              onChange={(e) => setSelectedStudentName(e.target.value)}
              className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[180px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">
                {t('calendar.all_students')}
              </option>
              {allStudentNames.map((name) => (
                <option key={name} value={name} className="bg-slate-900 text-white">
                  {t('calendar.student_prefix')} {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Month Navigation & Month KPI Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="font-bold text-sm sm:text-base text-white px-2 min-w-[130px] text-center font-mono">
            {monthNames[currentMonth]} {currentYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="الشهر القادم"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleJumpToToday}
            className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition font-medium mr-1"
          >
            {t('calendar.today')}
          </button>
        </div>

        {/* Quick Month Metrics & PDF Export */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-emerald-300">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('calendar.present_stat')}</span>
            <strong className="font-mono text-white">{monthStats.totalPresentInMonth}</strong>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-xl text-rose-300">
            <CalendarX className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('calendar.absent_stat')}</span>
            <strong className="font-mono text-white">{monthStats.totalAbsentInMonth}</strong>
          </div>

          <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-xl text-cyan-300 font-mono">
            <span>{t('calendar.month_rate')}</span>
            <strong className="text-white">{monthStats.rate}%</strong>
          </div>

          {onOpenPdfReport && (
            <button
              onClick={() => onOpenPdfReport(currentMonth, currentYear)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition mr-1"
              title="تصدير تقرير الحضور الشهري كملف PDF منظم"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('calendar.export_pdf')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="space-y-2">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-400">
          {weekdays.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-1.5 rounded-lg ${
                idx === 5 ? 'text-amber-400' : '' /* Friday Highlight */
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map(({ dayNumber, dateKey }, index) => {
            if (dayNumber === 0) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-16 sm:h-20 rounded-2xl bg-slate-950/20 border border-slate-900/50"
                />
              );
            }

            const status = getDayStatus(dateKey);
            const isToday =
              dateKey ===
              `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(today.getDate()).padStart(2, '0')}`;
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`h-16 sm:h-20 rounded-2xl p-1.5 sm:p-2 border text-right flex flex-col justify-between transition transform active:scale-95 group relative ${
                  status?.bgColor || 'bg-slate-900/50 border-slate-800 text-slate-400'
                } ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-[1.02] shadow-xl z-10'
                    : ''
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-bold font-mono ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow'
                        : ''
                    }`}
                  >
                    {dayNumber}
                  </span>

                  {/* Quick Status Icon or Badge */}
                  {selectedStudentName !== 'all' ? (
                    status?.type === 'present' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : status?.type === 'absent' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : null
                  ) : (
                    status?.type !== 'none' && (
                      <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-900/80 text-white">
                        {(status as any)?.presentCount}
                      </span>
                    )
                  )}
                </div>

                {/* Day Status Label at Bottom */}
                <div className="w-full text-center sm:text-right overflow-hidden">
                  {selectedStudentName !== 'all' ? (
                    <span className="text-[10px] font-bold block truncate">
                      {status?.label}
                    </span>
                  ) : status?.type !== 'none' ? (
                    <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                      <span className="text-[9px] text-slate-300 hidden sm:inline">نسبة</span>
                      <span
                        className={`font-bold ${
                          (status as any)?.rate >= 80
                            ? 'text-emerald-300'
                            : (status as any)?.rate >= 50
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {(status as any)?.rate}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-600 block sm:hidden">-</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Legend (دليل الألوان) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('calendar.legend_title')}</span>
        </div>

        {selectedStudentName === 'all' ? (
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/80 border border-emerald-400" />
              <span>{t('calendar.legend_high')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500/80 border border-amber-400" />
              <span>{t('calendar.legend_med')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500/80 border border-rose-400" />
              <span>{t('calendar.legend_low')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
              <span>{t('calendar.legend_nosession')}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/80 border border-emerald-400" />
              <span className="text-emerald-300 font-bold">{t('calendar.legend_student_present')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500/80 border border-rose-400" />
              <span className="text-rose-300 font-bold">{t('calendar.legend_student_absent')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
              <span>{t('calendar.legend_student_none')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Details Panel */}
      {selectedDayDetails && (
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs sm:text-sm text-white">
                {t('calendar.day_details_title')} <span className="text-emerald-300 font-mono">{selectedDayDetails.dateStr}</span>
              </h4>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-mono">
                {t('dashboard.present')}: {selectedDayDetails.presentCount}
              </span>
              <span className="bg-rose-950/60 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg font-mono">
                {t('dashboard.absent')}: {selectedDayDetails.absentCount}
              </span>
            </div>
          </div>

          {selectedDayDetails.rosterList.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">
              لا توجد سجلات حضور مسجلة لهذا اليوم. اضغط على أي يوم ملون لعرض الطلاب الحاضرين والغائبين.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {selectedDayDetails.rosterList
                .filter((item) =>
                  selectedStudentName === 'all'
                    ? true
                    : item.student.studentName.trim().toLowerCase() ===
                      selectedStudentName.trim().toLowerCase()
                )
                .map((item, idx) => (
                  <div
                    key={`${item.student.studentName}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      item.isPresent
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-slate-200'
                        : 'bg-rose-950/20 border-rose-500/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          item.isPresent
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {item.isPresent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.student.studentName}</span>
                          {item.student.studentId && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({item.student.studentId})
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-slate-400">{item.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      {item.isPresent ? (
                        <div>
                          <span className="text-emerald-400 font-bold">
                            {item.time || 'تم التسجيل'}
                          </span>
                          {item.confidence && (
                            <span className="text-[10px] text-slate-400 block">
                              AI: {item.confidence}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-rose-400 font-bold">غائب</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
