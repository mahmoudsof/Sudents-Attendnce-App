import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileSpreadsheet,
  Search,
  Plus,
  Check,
  RefreshCw,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FolderPlus,
} from 'lucide-react';
import {
  DriveFolder,
  DriveSpreadsheet,
  StudentPhoto,
  listFolders,
  listSpreadsheets,
  listFolderImages,
  createNewGoogleSheet,
} from '../lib/driveApi';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  selectedFolder: DriveFolder | null;
  onSelectFolder: (folder: DriveFolder) => void;
  selectedSheet: DriveSpreadsheet | null;
  onSelectSheet: (sheet: DriveSpreadsheet) => void;
  onFolderImagesLoaded?: (images: StudentPhoto[]) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  selectedFolder,
  onSelectFolder,
  selectedSheet,
  onSelectSheet,
  onFolderImagesLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'folders' | 'sheets'>('folders');

  // Folders state
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [searchFolderQuery, setSearchFolderQuery] = useState('');
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderPreviewImages, setFolderPreviewImages] = useState<StudentPhoto[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Sheets state
  const [sheets, setSheets] = useState<DriveSpreadsheet[]>([]);
  const [searchSheetQuery, setSearchSheetQuery] = useState('');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  // Load folders
  const loadFolders = async (query = '') => {
    if (!accessToken) return;
    setIsLoadingFolders(true);
    try {
      const data = await listFolders(accessToken, query);
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // Load sheets / excel files
  const loadSheets = async (query = '') => {
    if (!accessToken) return;
    setIsLoadingSheets(true);
    try {
      const data = await listSpreadsheets(accessToken, query);
      setSheets(data);
    } catch (err) {
      console.error('Failed to load sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFolders();
      loadSheets();
    }
  }, [isOpen, accessToken]);

  // Load preview images when a folder is selected
  const handleSelectFolder = async (folder: DriveFolder) => {
    onSelectFolder(folder);
    setIsLoadingImages(true);
    try {
      const imgs = await listFolderImages(accessToken, folder.id);
      setFolderPreviewImages(imgs);
      if (onFolderImagesLoaded) {
        onFolderImagesLoaded(imgs);
      }
    } catch (err) {
      console.error('Failed to load images from folder:', err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!accessToken) return;
    setIsCreatingSheet(true);
    try {
      const defaultName = newSheetTitle.trim() || `سجل حضور الطلاب ${new Date().toLocaleDateString('ar-EG')}`;
      const newSheet = await createNewGoogleSheet(accessToken, defaultName);
      setSheets((prev) => [newSheet, ...prev]);
      onSelectSheet(newSheet);
      setShowCreateInput(false);
      setNewSheetTitle('');
    } catch (err) {
      console.error('Failed to create sheet:', err);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">إعدادات ملفات Google Drive</h2>
              <p className="text-xs text-slate-400">حدد مجلد صور الطلاب وملف الإكسل لتسجيل الحضور</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('folders')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'folders'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>1. مجلد صور الطلاب</span>
            {selectedFolder && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'sheets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>2. ملف الإكسل / الحضور</span>
            {selectedSheet && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'folders' ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث عن مجلد الطلاب في جوجل درايف..."
                  value={searchFolderQuery}
                  onChange={(e) => {
                    setSearchFolderQuery(e.target.value);
                    loadFolders(e.target.value);
                  }}
                  className="w-full pl-3 pr-9 py-2 bg-slate-800/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Currently Selected Folder Alert */}
              {selectedFolder && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[11px]">المجلد الحالي المختار:</span>
                      <p className="font-semibold text-white">{selectedFolder.name}</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    {folderPreviewImages.length} طالب
                  </span>
                </div>
              )}

              {/* Folders List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>المجلدات المتاحة في جوجل درايف:</span>
                  <button
                    onClick={() => loadFolders(searchFolderQuery)}
                    className="hover:text-amber-400 flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingFolders ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                </div>

                {isLoadingFolders ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                    <span>جاري جلب المجلدات من جوجل درايف...</span>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 p-4">
                    <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <span>لم يتم العثور على مجلدات. تأكد من وجود مجلد لصور الطلاب في حسابك.</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {folders.map((folder) => {
                      const isSelected = selectedFolder?.id === folder.id;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => handleSelectFolder(folder)}
                          className={`w-full p-2.5 rounded-xl text-right text-xs flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-amber-500/20 border border-amber-500/60 text-white'
                              : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FolderOpen
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-amber-400' : 'text-slate-400'
                              }`}
                            />
                            <span className="font-medium truncate">{folder.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Photo Preview inside Selected Folder */}
              {selectedFolder && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>صور الطلاب المكتشفة ({folderPreviewImages.length}):</span>
                    {isLoadingImages && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> جاري الفحص...
                      </span>
                    )}
                  </div>

                  {folderPreviewImages.length === 0 && !isLoadingImages ? (
                    <div className="text-[11px] text-slate-400 bg-slate-800/40 p-3 rounded-lg text-center">
                      لم يتم العثور على صور داخل هذا المجلد. يرجى اختيار مجلد يحتوي على صور الطلاب (.jpg, .png).
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800">
                      {folderPreviewImages.slice(0, 15).map((img) => (
                        <div
                          key={img.id}
                          className="flex flex-col items-center bg-slate-800/60 p-1 rounded-lg border border-slate-700 text-center"
                        >
                          <div className="w-12 h-12 rounded bg-slate-900 overflow-hidden relative mb-1 flex items-center justify-center">
                            {img.thumbnailLink ? (
                              <img
                                src={img.thumbnailLink}
                                alt={img.studentName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500">صورة</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-200 truncate w-full px-0.5">
                            {img.studentName}
                          </span>
                        </div>
                      ))}
                      {folderPreviewImages.length > 15 && (
                        <div className="flex items-center justify-center text-[10px] text-slate-400 bg-slate-800/40 rounded-lg">
                          +{folderPreviewImages.length - 15} آخرين
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث عن ملف إكسل أو جدول حضور..."
                  value={searchSheetQuery}
                  onChange={(e) => {
                    setSearchSheetQuery(e.target.value);
                    loadSheets(e.target.value);
                  }}
                  className="w-full pl-3 pr-9 py-2 bg-slate-800/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Create New Sheet Quick Action */}
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 space-y-2">
                {!showCreateInput ? (
                  <button
                    onClick={() => setShowCreateInput(true)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إنشاء كشف حضور جديد مخصص في Google Drive</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-300 font-medium">اسم كشف الحضور الجديد:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`كشف حضور ${new Date().toLocaleDateString('ar-EG')}`}
                        value={newSheetTitle}
                        onChange={(e) => setNewSheetTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-emerald-500/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        onClick={handleCreateSheet}
                        disabled={isCreatingSheet}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                      >
                        {isCreatingSheet ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>إنشاء</span>
                      </button>
                      <button
                        onClick={() => setShowCreateInput(false)}
                        className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Currently Selected Sheet */}
              {selectedSheet && (
                <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[11px]">الملف المختار حالياً:</span>
                      <p className="font-semibold text-white">{selectedSheet.name}</p>
                    </div>
                  </div>
                  {selectedSheet.webViewLink && (
                    <a
                      href={selectedSheet.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-emerald-300"
                      title="فتح في جوجل درايف"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* List Sheets & Excel files */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>ملفات الإكسل وجداول البيانات في درايف:</span>
                  <button
                    onClick={() => loadSheets(searchSheetQuery)}
                    className="hover:text-emerald-400 flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                </div>

                {isLoadingSheets ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>جاري جلب الملفات من جوجل درايف...</span>
                  </div>
                ) : sheets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 p-4">
                    <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <span>لا توجد ملفات إكسل أو جداول بيانات. يمكنك إنشاء ملف جديد بنقرة زر أعلاه.</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {sheets.map((sheet) => {
                      const isSelected = selectedSheet?.id === sheet.id;
                      return (
                        <button
                          key={sheet.id}
                          onClick={() => onSelectSheet(sheet)}
                          className={`w-full p-2.5 rounded-xl text-right text-xs flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-emerald-500/20 border border-emerald-500/60 text-white'
                              : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileSpreadsheet
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                            <div className="truncate text-right">
                              <span className="font-medium truncate block">{sheet.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {sheet.isGoogleSheet ? 'Google Sheets' : 'Microsoft Excel (.xlsx)'}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
          >
            تم وحفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};
