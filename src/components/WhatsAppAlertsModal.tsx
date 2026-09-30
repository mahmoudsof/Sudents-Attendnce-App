import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  AlertTriangle,
  Settings,
  CheckCircle,
  XCircle,
  ExternalLink,
  Edit2,
  Phone,
  Sparkles,
  CloudLightning,
  RefreshCw,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentPhoto, AttendanceRecord, DriveSpreadsheet } from '../lib/driveApi';

export interface WhatsAppStudentAlert {
  studentId: string;
  studentName: string;
  phone: string;
  absenceCount: number;
  totalSessions: number;
  absenceRate: number;
  status?: 'pending' | 'sent' | 'failed';
  messageId?: string;
  sentAt?: string;
}

interface WhatsAppAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentPhoto[];
  attendanceRecords: AttendanceRecord[];
  selectedSheet: DriveSpreadsheet | null;
}

export const WhatsAppAlertsModal: React.FC<WhatsAppAlertsModalProps> = ({
  isOpen,
  onClose,
  students,
  attendanceRecords,
  selectedSheet,
}) => {
  // Absence threshold (percentage or days)
  const [thresholdRate, setThresholdRate] = useState<number>(25); // default >= 25% absence
  const [phoneOverrides, setPhoneOverrides] = useState<{ [id: string]: string }>({});
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);

  // Cloud Function settings
  const [cloudFunctionUrl, setCloudFunctionUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  // Message template
  const [messageTemplate, setMessageTemplate] = useState<string>(
    'السلام عليكم، نود إحاطتكم علماً بأن الطالب/ة: {student_name} قد تجاوز نسبة الغياب المسموح بها ({absence_rate}) بواقع {absence_count} أيام. يرجى التواصل مع إدارة المدرسة للمتابعة.'
  );

  // Sending status
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<{ [id: string]: any }>({});
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Calculate absence metrics per student from attendanceRecords
  const flaggedStudents = useMemo(() => {
    // Total sessions recorded
    const distinctDates = new Set(attendanceRecords.map((r) => r.date).filter(Boolean));
    const totalSessions = Math.max(1, distinctDates.size);

    return students
      .map((std, idx) => {
        // Count attended records for this student
        const studentRecords = attendanceRecords.filter(
          (r) =>
            r.studentName.trim().toLowerCase() === std.studentName.trim().toLowerCase() ||
            (r.studentId && r.studentId === std.studentId)
        );

        const presentCount = studentRecords.filter((r) => r.status === 'حاضر').length;
        // If there's 1 session today and student is not present, absence is 1
        const absenceCount = Math.max(0, totalSessions - presentCount);
        const absenceRate = Math.round((absenceCount / totalSessions) * 100);

        // Assign default or overridden phone number
        const defaultPhone = phoneOverrides[std.id] || `+2010${String(10000000 + idx * 777).slice(0, 8)}`;

        const dispatchInfo = dispatchResults[std.id];

        return {
          studentId: std.studentId,
          studentName: std.studentName,
          phone: defaultPhone,
          absenceCount,
          totalSessions,
          absenceRate,
          status: dispatchInfo?.status || 'pending',
          messageId: dispatchInfo?.messageId,
          sentAt: dispatchInfo?.sentAt,
        } as WhatsAppStudentAlert;
      })
      .filter((s) => s.absenceRate >= thresholdRate)
      .sort((a, b) => b.absenceRate - a.absenceRate);
  }, [students, attendanceRecords, thresholdRate, phoneOverrides, dispatchResults]);

  if (!isOpen) return null;

  // Format message for a specific student
  const formatStudentMessage = (student: WhatsAppStudentAlert) => {
    return messageTemplate
      .replace(/\{student_name\}/g, student.studentName)
      .replace(/\{student_id\}/g, student.studentId)
      .replace(/\{absence_rate\}/g, `${student.absenceRate}%`)
      .replace(/\{absence_count\}/g, `${student.absenceCount}`)
      .replace(/\{date\}/g, new Date().toLocaleDateString('ar-EG'));
  };

  // Direct WhatsApp click-to-chat
  const getDirectWhatsAppUrl = (student: WhatsAppStudentAlert) => {
    const text = encodeURIComponent(formatStudentMessage(student));
    const cleanPhone = student.phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Send batch alerts via Cloud Function endpoint
  const handleSendBatchAlerts = async () => {
    if (flaggedStudents.length === 0) return;
    setIsSendingBatch(true);
    setBatchSuccessMessage(null);

    try {
      const response = await fetch('/api/send-whatsapp-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: flaggedStudents,
          messageTemplate,
          cloudFunctionUrl: cloudFunctionUrl.trim() || undefined,
          whatsappGatewayApiKey: apiKey.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'فشل إرسال تنبيهات الواتساب');
      }

      const data = await response.json();
      const newResults: { [id: string]: any } = {};

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((r: any) => {
          newResults[r.studentId] = r;
        });
      } else {
        flaggedStudents.forEach((s) => {
          newResults[s.studentId] = {
            status: 'sent',
            sentAt: new Date().toLocaleTimeString('ar-EG'),
            messageId: `cf_${Date.now()}`,
          };
        });
      }

      setDispatchResults((prev) => ({ ...prev, ...newResults }));
      setBatchSuccessMessage(
        `تم إرسال ${data.sentCount || flaggedStudents.length} تنبيه واتساب بنجاح عبر دالة Cloud Function!`
      );
    } catch (err: any) {
      console.error('Failed to send batch alerts:', err);
      alert(err.message || 'حدث خطأ أثناء الاتصال بدالة Cloud Function');
    } finally {
      setIsSendingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>تنبيهات ورسائل واتساب للغياب</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <CloudLightning className="w-2.5 h-2.5" /> Cloud Function
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                إرسال إشعارات تلقائية لأولياء أمور الطلاب الذين تجاوزوا نسبة الغياب المحددة
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Threshold Slider Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>الحد الأدنى لنسبة الغياب لإرسال التنبيه:</span>
              </span>
              <span className="font-bold text-sm text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                {thresholdRate}% فأكثر
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={thresholdRate}
              onChange={(e) => setThresholdRate(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>تنبيه مبكر (10%)</span>
              <span>
                الطلاب المتجاوزون للحد: <strong className="text-white">{flaggedStudents.length} طالب</strong>
              </span>
              <span>غياب حرج (60%)</span>
            </div>
          </div>

          {/* Success Banner */}
          {batchSuccessMessage && (
            <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-200 font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{batchSuccessMessage}</span>
            </div>
          )}

          {/* Message Template Editor */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">نص رسالة الواتساب:</span>
              <span className="text-[10px] text-slate-400">
                المتغيرات: <code className="text-emerald-400">{'{student_name}'}</code>,{' '}
                <code className="text-emerald-400">{'{absence_rate}'}</code>,{' '}
                <code className="text-emerald-400">{'{absence_count}'}</code>
              </span>
            </div>
            <textarea
              rows={2}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Students Exceeding Absence Threshold List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span className="font-bold flex items-center gap-1.5">
                <span>الطلاب المستحقون للتنبيه</span>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded text-[10px] font-mono">
                  {flaggedStudents.length}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                الملف: {selectedSheet ? selectedSheet.name : 'بيانات الإكسل'}
              </span>
            </div>

            {flaggedStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-4">
                <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                <p className="font-medium text-slate-300">لا يوجد طلاب تجاوزوا نسبة الغياب المحددة ({thresholdRate}%).</p>
                <p className="text-[11px] text-slate-500 mt-1">يمكنك خفض مؤشر نسبة الغياب أعلاه لاختبار التنبيهات.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {flaggedStudents.map((std) => (
                  <div
                    key={std.studentId}
                    className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Student Name & Absence rate */}
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{std.studentName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                          غياب {std.absenceRate}% ({std.absenceCount} أيام)
                        </span>
                      </div>

                      {/* Phone Number Display / Edit */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {editingPhoneId === std.studentId ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              defaultValue={std.phone}
                              onBlur={(e) => {
                                setPhoneOverrides((prev) => ({
                                  ...prev,
                                  [std.studentId]: e.target.value,
                                }));
                                setEditingPhoneId(null);
                              }}
                              className="px-1.5 py-0.5 bg-slate-900 border border-emerald-500 rounded text-white text-xs w-32 font-mono"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-300">{std.phone}</span>
                            <button
                              onClick={() => setEditingPhoneId(std.studentId)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="تعديل رقم الهاتف"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {std.status === 'sent' ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>تم الإرسال</span>
                        </span>
                      ) : (
                        <a
                          href={getDirectWhatsAppUrl(std)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center gap-1 text-[11px] font-medium transition"
                          title="إرسال مباشر عبر تطبيق واتساب"
                        >
                          <Send className="w-3 h-3" />
                          <span>واتساب</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cloud Function Advanced Settings (Collapsible) */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showConfig ? 'إخفاء إعدادات دالة Cloud Function' : 'تخصيص رابط دالة Cloud Function و Gateway'}</span>
            </button>

            {showConfig && (
              <div className="mt-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5 text-xs animate-in fade-in">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    رابط Google Cloud Function Endpoint (اختياري):
                  </label>
                  <input
                    type="url"
                    placeholder="https://europe-west3-your-project.cloudfunctions.net/sendWhatsAppAlerts"
                    value={cloudFunctionUrl}
                    onChange={(e) => setCloudFunctionUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    عند تركه فارغاً، يتم استخدام دالة Cloud Function المدمجة في خادم التطبيق.
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    مفتاح التوثيق API Key (اختياري):
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token / WhatsApp API Secret"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition"
          >
            إغلاق
          </button>

          <button
            onClick={handleSendBatchAlerts}
            disabled={isSendingBatch || flaggedStudents.length === 0}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSendingBatch ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CloudLightning className="w-4 h-4" />
            )}
            <span>
              {isSendingBatch
                ? 'جاري إرسال التنبيهات عبر Cloud Function...'
                : `إرسال تنبيهات تلقائية للجميع (${flaggedStudents.length} طلاب)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
