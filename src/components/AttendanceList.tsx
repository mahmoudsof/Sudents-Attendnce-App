import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  ExternalLink,
  Users,
  Percent,
  Sparkles,
  RefreshCw,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StudentPhoto, DriveSpreadsheet, AttendanceRecord } from '../lib/driveApi';
import { useI18n } from '../lib/i18n';

interface AttendanceListProps {
  students: StudentPhoto[];
  attendanceRecords: AttendanceRecord[];
  selectedSheet: DriveSpreadsheet | null;
  onRefreshRecords: () => void;
  isLoadingRecords: boolean;
  onManualMark: (student: StudentPhoto, status: 'حاضر' | 'غائب') => void;
  onOpenWhatsAppAlerts?: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  students,
  attendanceRecords,
  selectedSheet,
  onRefreshRecords,
  isLoadingRecords,
  onManualMark,
  onOpenWhatsAppAlerts,
}) => {
  const { t, language } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');

  // Compute merged list of students with attendance status
  const mergedList = useMemo(() => {
    return students.map((std) => {
      // Find matching record by studentName or studentId
      const record = attendanceRecords.find(
        (r) =>
          r.studentName.trim().toLowerCase() === std.studentName.trim().toLowerCase() ||
          (r.studentId && r.studentId === std.studentId)
      );

      const isPresent = Boolean(record && record.status === 'حاضر');

      return {
        ...std,
        isPresent,
        attendanceDate: record?.date || '',
        attendanceTime: record?.time || '',
        confidence: record?.confidence || 0,
        notes: record?.notes || '',
      };
    });
  }, [students, attendanceRecords]);

  // Statistics
  const totalCount = students.length;
  const presentCount = mergedList.filter((s) => s.isPresent).length;
  const absentCount = totalCount - presentCount;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Filtered view
  const filteredStudents = useMemo(() => {
    return mergedList.filter((std) => {
      const matchesSearch =
        std.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterStatus === 'present') return std.isPresent;
      if (filterStatus === 'absent') return !std.isPresent;
      return true;
    });
  }, [mergedList, searchQuery, filterStatus]);

  // Export current attendance to local Excel file
  const handleExportLocalExcel = () => {
    const exportData = mergedList.map((std, idx) => ({
      '#': idx + 1,
      'اسم الطالب': std.studentName,
      'رقم القيد / الكود': std.studentId,
      'الحالة': std.isPresent ? 'حاضر' : 'غائب',
      'تاريخ ووقت الحضور الحالي (عمود جديد)': std.isPresent && std.attendanceDate ? `${std.attendanceDate} - ${std.attendanceTime || ''}` : '-',
      'تاريخ الحضور': std.attendanceDate || '-',
      'وقت الحضور': std.attendanceTime || '-',
      'نسبة التطابق AI': std.confidence ? `${std.confidence}%` : '-',
      'ملاحظات': std.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الحضور');
    XLSX.writeFile(wb, `كشف_حضور_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">إجمالي الطلاب</span>
            <span className="text-lg font-bold text-white font-mono">{totalCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">الحاضرون</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{presentCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">الغائبون</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{absentCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">نسبة الحضور</span>
            <span className="text-lg font-bold text-purple-300 font-mono">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Main Roster Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Controls Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm text-white">
                {selectedSheet ? selectedSheet.name : 'سجل الحضور'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {selectedSheet?.webViewLink && (
                <a
                  href={selectedSheet.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700 transition"
                  title="فتح في جوجل درايف"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">فتح في درايف</span>
                </a>
              )}

              {onOpenWhatsAppAlerts && (
                <button
                  onClick={onOpenWhatsAppAlerts}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs flex items-center gap-1 border border-emerald-500/30 transition"
                  title="تنبيهات ورسائل واتساب للغياب"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">تنبيهات واتساب</span>
                </button>
              )}

              <button
                onClick={handleExportLocalExcel}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-xs flex items-center gap-1 border border-emerald-500/30 transition"
                title="تصدير كملف إكسل"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تصدير إكسل</span>
              </button>

              <button
                onClick={onRefreshRecords}
                disabled={isLoadingRecords}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 text-slate-400 absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-2.5`} />
              <input
                type="text"
                placeholder={t('roster.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${language === 'ar' ? 'pl-3 pr-9' : 'pr-3 pl-9'} py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500`}
              />
            </div>

            {/* Filter buttons */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'} ({totalCount})
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === 'present'
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                {t('dashboard.present')} ({presentCount})
              </button>
              <button
                onClick={() => setFilterStatus('absent')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === 'absent'
                    ? 'bg-rose-600 text-white font-medium'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                {t('dashboard.absent')} ({absentCount})
              </button>
            </div>
          </div>

          {/* Auto Date & Time Column Banner */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('roster.auto_col_banner')}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono text-emerald-200 border border-emerald-500/30">
              {language === 'ar' ? 'تلقائي' : 'Auto'}
            </span>
          </div>
        </div>

        {/* Student Cards List */}
        <div className="p-3 max-h-[550px] overflow-y-auto space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Users className="w-8 h-8 text-slate-600" />
              <span>لا يوجد طلاب مطابقين للبحث أو الفلتر المختار.</span>
            </div>
          ) : (
            filteredStudents.map((std) => (
              <div
                key={std.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                  std.isPresent
                    ? 'bg-emerald-950/20 border-emerald-800/40 hover:bg-emerald-950/30'
                    : 'bg-slate-800/30 border-slate-700/60 hover:bg-slate-800/50'
                }`}
              >
                {/* Photo & Info */}
                <div className="flex items-center gap-3 truncate">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 overflow-hidden relative border border-slate-700 shrink-0">
                    {std.thumbnailLink || std.imageBase64 ? (
                      <img
                        src={std.imageBase64 || std.thumbnailLink}
                        alt={std.studentName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                        {std.studentName.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">
                        {std.studentName}
                      </span>
                      {std.isPresent && std.confidence > 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono hidden sm:inline-flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> {std.confidence}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">كود: {std.studentId}</span>
                      {std.attendanceTime && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {std.attendanceTime}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge & Manual Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {std.isPresent ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>حاضر</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onManualMark(std, 'حاضر')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 text-xs font-medium transition flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>تسجيل يدوي</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
