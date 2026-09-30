import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'rtl' | 'ltr';
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // School branding
    'school.name': 'المدرسة المصرية الفنية بجالكعيو',
    'app.title': 'نظام الحضور الذكي',
    'app.subtitle': 'التعرف على الوجه بالذكاء الاصطناعي مع مزامنة جوجل درايف وإكسل',
    'school.ministry': 'جمهورية مصر العربية - وزارة التربية والتعليم والتعليم الفني',
    'teacher.title': 'إشراف: أ/ محمود عبدالعاطي حسن (معلم الكمبيوتر)',

    // Header & Navigation
    'nav.camera': 'الكاميرا والتحقق',
    'nav.roster': 'سجل الحضور والطلاب',
    'nav.dashboard': 'لوحة البيانات والإعدادات',
    'nav.apk': 'تحميل APK',
    'nav.apk_title': 'تثبيت التطبيق على الهاتف (APK)',
    'nav.login': 'تسجيل الدخول بجوجل',
    'nav.logout': 'تسجيل الخروج',
    'nav.select_folder': 'اختر مجلد الصور',
    'nav.select_sheet': 'اختر ملف الإكسل',
    'nav.change_files': 'تغيير الملفات',
    'nav.no_folder': 'لم يحدد مجلد الصور',
    'nav.no_sheet': 'لم يحدد ملف إكسل',
    'nav.photos_count': 'صورة',

    // Language Toggle
    'lang.switch': 'English',
    'lang.current': 'العربية',
    'lang.label': 'اللغة',

    // Login screen
    'login.welcome': 'مرحباً بكم في نظام الحضور الذكي',
    'login.desc': 'نظام متكامل لتسجيل حضور وانصراف الطلاب بالذكاء الاصطناعي وربطه تلقائياً مع Google Drive وملفات الإكسل.',
    'login.btn': 'تسجيل الدخول عبر Google للبدء',
    'login.connecting': 'جاري الاتصال بجوجل...',
    'login.permission_notice': 'يتطلب التطبيق الإذن للوصول إلى مجلد صور الطلاب وملف الإكسل في Google Drive.',
    'login.install_apk_btn': 'تثبيت التطبيق على الموبايل (APK / WebAPK)',

    // Alerts & Banners
    'alert.missing_files': 'يرجى تحديد مجلد صور الطلاب وملف الإكسل لبدء التحقق بالكاميرا',
    'alert.missing_folder': 'يرجى تحديد مجلد صور الطلاب في درايف',
    'alert.missing_sheet': 'يرجى تحديد أو إنشاء ملف إكسل لتسجيل الحضور',
    'alert.select_files_btn': 'اختيار الملفات',

    // Camera tab
    'camera.title': 'التعرف على الوجه بالكاميرا الحية',
    'camera.status_ready': 'الكاميرا جاهزة للالتقاط',
    'camera.scan_btn': 'التقاط والتحقق بالذكاء الاصطناعي',
    'camera.analyzing': 'جاري تحليل الوجه ومطابقته...',
    'camera.switch_cam': 'تبديل الكاميرا',
    'camera.folder_active': 'مجلد الصور النشط:',
    'camera.sheet_active': 'ملف الإكسل النشط:',

    // Dashboard
    'dashboard.title': 'تحليلات الحضور والغياب',
    'dashboard.subtitle': 'بيانات مستخرجة ومحدثة مباشرة من ملف الإكسل وجدول البيانات',
    'dashboard.subtab_charts': 'لوحة الرسوم البيانية (Dashboard)',
    'dashboard.subtab_files': 'إعدادات ملفات درايف',
    'dashboard.attendance_rate': 'نسبة الحضور',
    'dashboard.students_present': 'الطلاب الحاضرون',
    'dashboard.students_absent': 'الطلاب الغائبون',
    'dashboard.ai_avg_confidence': 'متوسط دقة AI',
    'dashboard.chart_donut': 'نسبة حضور وغياب الطلاب (ملف الإكسل)',
    'dashboard.chart_timeline': 'توزيع وقت تسجيل حضور الطلاب بالكاميرا',
    'dashboard.chart_confidence': 'توزيع دقة المطابقة البيومترية (Gemini Vision AI)',
    'dashboard.time_slots': 'الفترات الزمنية',
    'dashboard.total_students': 'إجمالي الطلاب:',
    'dashboard.student_count': 'طالب',
    'dashboard.present': 'حاضر',
    'dashboard.absent': 'غائب',

    // PDF Export Banner
    'pdf.banner_title': 'تصدير تقرير الحضور الشهري (PDF)',
    'pdf.banner_badge': 'معتمد',
    'pdf.banner_desc': 'كشف رسمي يتضمن أسماء الطلاب وحالات الحضور والغياب اليومية مع التوقيعات',
    'pdf.export_btn': 'تصدير PDF',

    // WhatsApp Alerts Banner
    'whatsapp.banner_title': 'تنبيهات ورسائل واتساب للغياب',
    'whatsapp.banner_badge': 'Cloud Function',
    'whatsapp.banner_desc': 'إرسال رسائل تلقائية لأولياء أمور الطلاب المتجاوزين لنسبة الغياب المحددة',
    'whatsapp.send_btn': 'إرسال التنبيهات',

    // Interactive Calendar
    'calendar.title': 'تقويم الحضور والغياب التفاعلي',
    'calendar.badge': 'مباشر',
    'calendar.subtitle': 'تلوين ومتابعة أيام الحضور والغياب للطلاب بشكل مرئي متزامن مع الإكسل',
    'calendar.filter_for': 'عرض لـ:',
    'calendar.all_students': 'جميع الطلاب (الفصل بالكامل)',
    'calendar.student_prefix': 'طالب:',
    'calendar.today': 'اليوم',
    'calendar.present_stat': 'حاضر:',
    'calendar.absent_stat': 'غائب:',
    'calendar.month_rate': 'نسبة الشهر:',
    'calendar.export_pdf': 'تصدير تقرير PDF',
    'calendar.legend_title': 'دليل ألوان التقويم:',
    'calendar.legend_high': 'حضور مرتفع (≥ 80%)',
    'calendar.legend_med': 'حضور متوسط (50% - 79%)',
    'calendar.legend_low': 'حضور منخفض (< 50%)',
    'calendar.legend_nosession': 'بدون جلسات',
    'calendar.legend_student_present': 'الطالب حاضر',
    'calendar.legend_student_absent': 'الطالب غائب',
    'calendar.legend_student_none': 'لا توجد جلسة',
    'calendar.day_details_title': 'تفاصيل سجل الحضور ليوم:',
    'calendar.no_records_day': 'لا توجد سجلات حضور مسجلة لهذا اليوم.',

    // Attendance Roster Tab
    'roster.title': 'كشف حضور وغياب الطلاب',
    'roster.search_placeholder': 'بحث باسم الطالب أو رقم القيد...',
    'roster.refresh': 'تحديث البيانات',
    'roster.export_excel': 'تصدير إكسل',
    'roster.mark_present': 'تسجيل حاضر',
    'roster.mark_absent': 'تسجيل غائب',
    'roster.column_index': '#',
    'roster.column_name': 'اسم الطالب',
    'roster.column_id': 'الكود / رقم القيد',
    'roster.column_status': 'الحالة',
    'roster.column_time': 'وقت الحضور',
    'roster.column_confidence': 'نسبة التطابق',
    'roster.column_notes': 'ملاحظات',
    'roster.auto_col_banner': 'ميزة نشطة: يتم إنشاء عمود جديد في ملف الإكسل بالتاريخ والوقت الحالي لكل تسجيل',

    // Confirmation Modal
    'confirm.title': 'تأكيد تسجيل حضور الطالب',
    'confirm.matched_badge': 'تم التعرف بنجاح',
    'confirm.confidence': 'نسبة التطابق:',
    'confirm.save_btn': 'تأكيد وحفظ في الإكسل',
    'confirm.cancel_btn': 'إلغاء',
    'confirm.reasoning': 'تحليل الذكاء الاصطناعي:',

    // PDF Modal
    'pdf.modal_title': 'تصدير تقرير الحضور الشهري (PDF)',
    'pdf.modal_badge': 'رسمي',
    'pdf.modal_subtitle': 'المدرسة المصرية الفنية بجالكعيو - كشف الحضور والغياب الشهري المعتمد',
    'pdf.month': 'شهر',
    'pdf.year': 'عام',
    'pdf.print_btn': 'طباعة / حفظ كـ PDF',
    'pdf.download_html_btn': 'تحميل ملف الطباعة',
    'pdf.close': 'إغلاق',
    'pdf.letterhead_country': 'جمهورية مصر العربية',
    'pdf.letterhead_ministry': 'وزارة التربية والتعليم والتعليم الفني',
    'pdf.letterhead_school': 'المدرسة المصرية الفنية بجالكعيو',
    'pdf.letterhead_system': 'نظام تسجيل الحضور الذكي بالتعرف على الوجه',
    'pdf.meta_date': 'تاريخ إصدار التقرير:',
    'pdf.meta_time': 'وقت الاستخراج:',
    'pdf.meta_supervisor': 'إشراف: أ/ محمود عبدالعاطي حسن',
    'pdf.banner_heading': 'كشف الحضور والغياب الشهري للطلاب',
    'pdf.kpi_students': 'إجمالي الطلاب',
    'pdf.kpi_sessions': 'جلسات الحضور المسجلة',
    'pdf.kpi_presents': 'إجمالي مرات الحضور',
    'pdf.kpi_rate': 'متوسط نسبة الحضور العامة',
    'pdf.days': 'أيام',
    'pdf.records': 'تسجيل',
    'pdf.sign_teacher': 'مسؤول الحضور ومعلم الكمبيوتر',
    'pdf.sign_teacher_name': 'الأستاذ / محمود عبدالعاطي حسن',
    'pdf.sign_affairs': 'شؤون الطلاب والتسجيل',
    'pdf.sign_stamp': 'خاتم واعتماد إدارة المدرسة',
    'pdf.stamp_placeholder': 'خاتم المدرسة',
  },
  en: {
    // School branding
    'school.name': 'Egyptian Technical School in Galkayo',
    'app.title': 'Smart Attendance System',
    'app.subtitle': 'AI Face Recognition synced with Google Drive & Excel',
    'school.ministry': 'Arab Republic of Egypt - Ministry of Education & Technical Education',
    'teacher.title': 'Supervised by: Mr. Mahmoud Abdelaty Hassan (Computer Science Teacher)',

    // Header & Navigation
    'nav.camera': 'Camera & Scan',
    'nav.roster': 'Attendance Roster',
    'nav.dashboard': 'Dashboard & Settings',
    'nav.apk': 'Download APK',
    'nav.apk_title': 'Install App on Phone (APK)',
    'nav.login': 'Sign in with Google',
    'nav.logout': 'Sign Out',
    'nav.select_folder': 'Select Photos Folder',
    'nav.select_sheet': 'Select Excel Sheet',
    'nav.change_files': 'Change Files',
    'nav.no_folder': 'No photos folder selected',
    'nav.no_sheet': 'No excel file selected',
    'nav.photos_count': 'photos',

    // Language Toggle
    'lang.switch': 'العربية',
    'lang.current': 'English',
    'lang.label': 'Language',

    // Login screen
    'login.welcome': 'Welcome to the Smart Attendance System',
    'login.desc': 'A comprehensive AI-powered student attendance management system seamlessly integrated with Google Drive and Excel sheets.',
    'login.btn': 'Sign in with Google to Start',
    'login.connecting': 'Connecting to Google...',
    'login.permission_notice': 'The app requires permission to access the student photos folder and attendance sheet on Google Drive.',
    'login.install_apk_btn': 'Install App on Mobile (APK / WebAPK)',

    // Alerts & Banners
    'alert.missing_files': 'Please select the student photos folder and attendance sheet to begin camera scanning',
    'alert.missing_folder': 'Please select the student photos folder on Google Drive',
    'alert.missing_sheet': 'Please select or create an Excel sheet for attendance records',
    'alert.select_files_btn': 'Select Files',

    // Camera tab
    'camera.title': 'Live Camera Face Recognition',
    'camera.status_ready': 'Camera is ready to scan',
    'camera.scan_btn': 'Capture & Match with AI',
    'camera.analyzing': 'Analyzing and matching face with AI...',
    'camera.switch_cam': 'Switch Camera',
    'camera.folder_active': 'Active Photos Folder:',
    'camera.sheet_active': 'Active Excel Sheet:',

    // Dashboard
    'dashboard.title': 'Attendance & Absence Analytics',
    'dashboard.subtitle': 'Live analytics directly synchronized with Google Drive and Excel',
    'dashboard.subtab_charts': 'Charts & Analytics Dashboard',
    'dashboard.subtab_files': 'Google Drive Files Settings',
    'dashboard.attendance_rate': 'Attendance Rate',
    'dashboard.students_present': 'Present Students',
    'dashboard.students_absent': 'Absent Students',
    'dashboard.ai_avg_confidence': 'Avg AI Confidence',
    'dashboard.chart_donut': 'Student Attendance vs Absence (Excel Sheet)',
    'dashboard.chart_timeline': 'Camera Attendance Timestamps Distribution',
    'dashboard.chart_confidence': 'Biometric Match Accuracy (Gemini Vision AI)',
    'dashboard.time_slots': 'Time Intervals',
    'dashboard.total_students': 'Total Students:',
    'dashboard.student_count': 'students',
    'dashboard.present': 'Present',
    'dashboard.absent': 'Absent',

    // PDF Export Banner
    'pdf.banner_title': 'Export Monthly Attendance Report (PDF)',
    'pdf.banner_badge': 'Official',
    'pdf.banner_desc': 'Certified report with student names, daily presence/absence records, and signatures',
    'pdf.export_btn': 'Export PDF',

    // WhatsApp Alerts Banner
    'whatsapp.banner_title': 'WhatsApp Absence Notifications',
    'whatsapp.banner_badge': 'Cloud Function',
    'whatsapp.banner_desc': 'Send automated messages to parents of students exceeding the allowed absence threshold',
    'whatsapp.send_btn': 'Send Alerts',

    // Interactive Calendar
    'calendar.title': 'Interactive Attendance & Absence Calendar',
    'calendar.badge': 'Live',
    'calendar.subtitle': 'Visually color-coded calendar reflecting daily student attendance synced with Excel',
    'calendar.filter_for': 'Filter for:',
    'calendar.all_students': 'All Students (Full Classroom)',
    'calendar.student_prefix': 'Student:',
    'calendar.today': 'Today',
    'calendar.present_stat': 'Present:',
    'calendar.absent_stat': 'Absent:',
    'calendar.month_rate': 'Month Rate:',
    'calendar.export_pdf': 'Export PDF Report',
    'calendar.legend_title': 'Calendar Color Guide:',
    'calendar.legend_high': 'High Attendance (≥ 80%)',
    'calendar.legend_med': 'Medium Attendance (50% - 79%)',
    'calendar.legend_low': 'Low Attendance (< 50%)',
    'calendar.legend_nosession': 'No Sessions',
    'calendar.legend_student_present': 'Student Present',
    'calendar.legend_student_absent': 'Student Absent',
    'calendar.legend_student_none': 'No Session',
    'calendar.day_details_title': 'Attendance Records for Date:',
    'calendar.no_records_day': 'No attendance records logged for this day.',

    // Attendance Roster Tab
    'roster.title': 'Student Attendance Roster',
    'roster.search_placeholder': 'Search by student name or ID...',
    'roster.refresh': 'Refresh Data',
    'roster.export_excel': 'Export Excel',
    'roster.mark_present': 'Mark Present',
    'roster.mark_absent': 'Mark Absent',
    'roster.column_index': '#',
    'roster.column_name': 'Student Name',
    'roster.column_id': 'Student ID',
    'roster.column_status': 'Status',
    'roster.column_time': 'Time',
    'roster.column_confidence': 'Match Confidence',
    'roster.column_notes': 'Notes',
    'roster.auto_col_banner': 'Active Feature: Automatically creates a new date & time column in Excel for each check-in',

    // Confirmation Modal
    'confirm.title': 'Confirm Student Attendance',
    'confirm.matched_badge': 'Recognized Successfully',
    'confirm.confidence': 'Match Confidence:',
    'confirm.save_btn': 'Confirm & Save in Excel',
    'confirm.cancel_btn': 'Cancel',
    'confirm.reasoning': 'AI Vision Reasoning:',

    // PDF Modal
    'pdf.modal_title': 'Export Monthly Attendance Report (PDF)',
    'pdf.modal_badge': 'Official',
    'pdf.modal_subtitle': 'Egyptian Technical School in Galkayo - Certified Monthly Attendance & Absence Report',
    'pdf.month': 'Month',
    'pdf.year': 'Year',
    'pdf.print_btn': 'Print / Save as PDF',
    'pdf.download_html_btn': 'Download Printable HTML',
    'pdf.close': 'Close',
    'pdf.letterhead_country': 'Arab Republic of Egypt',
    'pdf.letterhead_ministry': 'Ministry of Education & Technical Education',
    'pdf.letterhead_school': 'Egyptian Technical School in Galkayo',
    'pdf.letterhead_system': 'Smart Biometric AI Facial Recognition Attendance System',
    'pdf.meta_date': 'Report Date:',
    'pdf.meta_time': 'Generated Time:',
    'pdf.meta_supervisor': 'Supervised by: Mr. Mahmoud Abdelaty Hassan',
    'pdf.banner_heading': 'Monthly Student Attendance & Absence Register',
    'pdf.kpi_students': 'Total Students',
    'pdf.kpi_sessions': 'Recorded Sessions',
    'pdf.kpi_presents': 'Total Check-ins',
    'pdf.kpi_rate': 'Average Attendance Rate',
    'pdf.days': 'days',
    'pdf.records': 'check-ins',
    'pdf.sign_teacher': 'Attendance & Computer Science Teacher',
    'pdf.sign_teacher_name': 'Mr. Mahmoud Abdelaty Hassan',
    'pdf.sign_affairs': 'Student Affairs & Registration',
    'pdf.sign_stamp': 'School Administration Stamp',
    'pdf.stamp_placeholder': 'School Stamp',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'en' ? 'en' : 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';

  // Sync HTML document direction and lang attribute
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const t = (key: string, fallback?: string): string => {
    return translations[language][key] || fallback || translations.ar[key] || key;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        dir,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
