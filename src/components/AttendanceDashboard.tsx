import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Sparkles,
  Clock,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
  CloudLightning,
  FileText,
  Printer,
} from 'lucide-react';
import { StudentPhoto, AttendanceRecord, DriveSpreadsheet } from '../lib/driveApi';
import { AttendanceCalendar } from './AttendanceCalendar';
import { MonthlyPdfReportModal } from './MonthlyPdfReportModal';
import { useI18n } from '../lib/i18n';

interface AttendanceDashboardProps {
  students: StudentPhoto[];
  attendanceRecords: AttendanceRecord[];
  selectedSheet: DriveSpreadsheet | null;
  onOpenWhatsAppAlerts?: () => void;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  students,
  attendanceRecords,
  selectedSheet,
  onOpenWhatsAppAlerts,
}) => {
  const { t, language } = useI18n();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfMonthYear, setPdfMonthYear] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  // Merge student roster and attendance records from Excel
  const analyticsData = useMemo(() => {
    const totalStudentsCount = Math.max(students.length, attendanceRecords.length);
    
    // Find unique students present
    const presentRecords = attendanceRecords.filter((r) => r.status === 'حاضر');
    const presentCount = presentRecords.length;
    const absentCount = Math.max(0, totalStudentsCount - presentCount);
    const attendanceRate = totalStudentsCount > 0
      ? Math.round((presentCount / totalStudentsCount) * 100)
      : 0;

    // 1. Donut Pie Data (حاضر vs غائب)
    const pieData = [
      { name: t('dashboard.present'), value: presentCount, color: '#10b981' },
      { name: t('dashboard.absent'), value: absentCount, color: '#f43f5e' },
    ];

    // 2. Hourly Timeline Data (توزيع تسجيل الحضور على مدار الوقت)
    const timeBuckets: { [bucket: string]: number } = {};
    // Default sample buckets if needed
    ['07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', 'بعد 12:00'].forEach((b) => {
      timeBuckets[b] = 0;
    });

    presentRecords.forEach((rec) => {
      if (!rec.time) return;
      // Extract hour from strings like "08:15:30 ص" or "08:15" or "14:20"
      const match = rec.time.match(/(\d{1,2}):/);
      if (match) {
        let hour = parseInt(match[1], 10);
        // Normalize Arabic time AM/PM if present
        if (rec.time.includes('م') && hour < 12) hour += 12;
        if (rec.time.includes('ص') && hour === 12) hour = 0;

        if (hour < 8) timeBuckets['07:00-08:00'] = (timeBuckets['07:00-08:00'] || 0) + 1;
        else if (hour < 9) timeBuckets['08:00-09:00'] = (timeBuckets['08:00-09:00'] || 0) + 1;
        else if (hour < 10) timeBuckets['09:00-10:00'] = (timeBuckets['09:00-10:00'] || 0) + 1;
        else if (hour < 11) timeBuckets['10:00-11:00'] = (timeBuckets['10:00-11:00'] || 0) + 1;
        else if (hour < 12) timeBuckets['11:00-12:00'] = (timeBuckets['11:00-12:00'] || 0) + 1;
        else timeBuckets['بعد 12:00'] = (timeBuckets['بعد 12:00'] || 0) + 1;
      }
    });

    const timelineData = Object.entries(timeBuckets).map(([time, count]) => ({
      time,
      'عدد الحضور': count,
    }));

    // 3. AI Face Match Confidence Breakdown (توزيع دقة التعرف)
    const confidenceBuckets = [
      { range: '90% - 100% (ممتاز)', count: 0, fill: '#10b981' },
      { range: '80% - 89% (جيد جداً)', count: 0, fill: '#06b6d4' },
      { range: '70% - 79% (جيد)', count: 0, fill: '#f59e0b' },
      { range: 'أقل من 70%', count: 0, fill: '#8b5cf6' },
    ];

    let totalConfidence = 0;
    let confidenceCount = 0;

    presentRecords.forEach((rec) => {
      const conf = rec.confidence || 0;
      if (conf > 0) {
        totalConfidence += conf;
        confidenceCount += 1;
        if (conf >= 90) confidenceBuckets[0].count += 1;
        else if (conf >= 80) confidenceBuckets[1].count += 1;
        else if (conf >= 70) confidenceBuckets[2].count += 1;
        else confidenceBuckets[3].count += 1;
      }
    });

    const avgConfidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;

    return {
      totalStudentsCount,
      presentCount,
      absentCount,
      attendanceRate,
      pieData,
      timelineData,
      confidenceBuckets,
      avgConfidence,
    };
  }, [students, attendanceRecords]);

  // Custom Dark Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs text-right">
          {label && <p className="font-bold text-slate-200 mb-1">{label}</p>}
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.fill || '#10b981' }}>
              {entry.name}: <span className="font-bold font-mono">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">{t('dashboard.attendance_rate')}</span>
            <span className="text-xl font-bold text-purple-300 font-mono">
              {analyticsData.attendanceRate}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">{t('dashboard.students_present')}</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {analyticsData.presentCount}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">{t('dashboard.students_absent')}</span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {analyticsData.absentCount}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">{t('dashboard.ai_avg_confidence')}</span>
            <span className="text-xl font-bold text-cyan-300 font-mono">
              {analyticsData.avgConfidence > 0 ? `${analyticsData.avgConfidence}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Cards: WhatsApp Absence Alerts & Monthly PDF Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Monthly PDF Report Export Banner */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/80 border border-blue-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-white">{t('pdf.banner_title')}</h4>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                  {t('pdf.banner_badge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('pdf.banner_desc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPdfMonthYear({ month: new Date().getMonth(), year: new Date().getFullYear() });
              setIsPdfModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('pdf.export_btn')}</span>
          </button>
        </div>

        {/* WhatsApp Absence Alerts Banner */}
        {onOpenWhatsAppAlerts && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs sm:text-sm text-white">{t('whatsapp.banner_title')}</h4>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                    {t('whatsapp.banner_badge')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('whatsapp.banner_desc')}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenWhatsAppAlerts}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition shrink-0"
            >
              <CloudLightning className="w-3.5 h-3.5" />
              <span>{t('whatsapp.send_btn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Attendance & Absence Calendar Component */}
      <AttendanceCalendar
        students={students}
        attendanceRecords={attendanceRecords}
        onOpenPdfReport={(m, y) => {
          setPdfMonthYear({ month: m, year: y });
          setIsPdfModalOpen(true);
        }}
      />

      {/* Chart 1: Donut Chart - الحضور مقابل الغياب */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs sm:text-sm text-white">
              {t('dashboard.chart_donut')}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {t('dashboard.total_students')} {analyticsData.totalStudentsCount} {t('dashboard.student_count')}
          </span>
        </div>

        <div className="h-64 w-full flex items-center justify-center">
          {analyticsData.totalStudentsCount === 0 ? (
            <div className="text-xs text-slate-500 text-center">
              لا توجد بيانات حضور في ملف الإكسل حتى الآن.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: any) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {analyticsData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-300 mx-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Timeline Distribution (توزيع أوقات الحضور) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs sm:text-sm text-white">
              توزيع وقت تسجيل حضور الطلاب بالكاميرا
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">الفترات الزمنية</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={analyticsData.timelineData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="عدد الحضور"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: AI Confidence Distribution (توزيع نسب تطابق الذكاء الاصطناعي) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-xs sm:text-sm text-white">
              توزيع دقة المطابقة البيومترية (Gemini Vision AI)
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            متوسط: {analyticsData.avgConfidence}%
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.confidenceBuckets}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 9 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="عدد الطلاب" radius={[6, 6, 0, 0]}>
                {analyticsData.confidenceBuckets.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Attendance PDF Report Modal */}
      <MonthlyPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        students={students}
        attendanceRecords={attendanceRecords}
        initialMonth={pdfMonthYear.month}
        initialYear={pdfMonthYear.year}
      />
    </div>
  );
};
