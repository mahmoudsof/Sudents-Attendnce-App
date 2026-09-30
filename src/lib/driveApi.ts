import * as XLSX from 'xlsx';

export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface StudentPhoto {
  id: string;
  name: string;
  studentName: string;
  studentId: string;
  mimeType: string;
  thumbnailLink?: string;
  imageBase64?: string;
  size?: number;
}

export interface DriveSpreadsheet {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  isGoogleSheet: boolean;
  modifiedTime?: string;
}

export interface AttendanceRecord {
  index: number;
  studentName: string;
  studentId: string;
  dateTime?: string; // التاريخ والوقت الحالي بالكامل
  date: string;
  time: string;
  status: string;
  confidence: number;
  notes?: string;
  photoUrl?: string;
  addedColumnName?: string;
}

// Clean filename to extract student name and optional ID
// E.g., "104_Ahmed Ali.jpg" -> studentName: "Ahmed Ali", studentId: "104"
// E.g., "سارة_محمود.png" -> studentName: "سارة محمود", studentId: "S-1"
export function parseStudentInfoFromFileName(filename: string, index: number): { name: string; id: string } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  
  // Try pattern: "12345 - Name" or "12345_Name"
  const idPrefixMatch = nameWithoutExt.match(/^([A-Za-z0-9_-]+)[\s_-]+(.*)$/);
  if (idPrefixMatch && idPrefixMatch[1] && idPrefixMatch[2]) {
    const rawId = idPrefixMatch[1].trim();
    const rawName = idPrefixMatch[2].replace(/[_-]/g, ' ').trim();
    if (rawName.length > 1) {
      return {
        id: rawId,
        name: rawName,
      };
    }
  }

  // Fallback: entire name without underscores
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ').trim();
  return {
    id: `STD-${String(index + 1).padStart(3, '0')}`,
    name: cleanName || `طالب ${index + 1}`,
  };
}

/**
 * List folders in Google Drive for folder selection
 */
export async function listFolders(
  accessToken: string,
  searchQuery = '',
  parentId = ''
): Promise<DriveFolder[]> {
  try {
    let q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }
    if (searchQuery.trim()) {
      q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', 'files(id, name, modifiedTime)');
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'name_natural');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'فشل في جلب مجلدات جوجل درايف');
    }

    const data = await res.json();
    return data.files || [];
  } catch (error: any) {
    console.error('listFolders error:', error);
    throw error;
  }
}

/**
 * List student photo files inside a specific Google Drive folder
 */
export async function listFolderImages(
  accessToken: string,
  folderId: string
): Promise<StudentPhoto[]> {
  try {
    const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', 'files(id, name, mimeType, thumbnailLink, size)');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'name_natural');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'فشل في جلب صور مجلد الطلاب');
    }

    const data = await res.json();
    const files = data.files || [];

    return files.map((file: any, idx: number) => {
      const parsed = parseStudentInfoFromFileName(file.name, idx);
      return {
        id: file.id,
        name: file.name,
        studentName: parsed.name,
        studentId: parsed.id,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink,
        size: Number(file.size || 0),
      };
    });
  } catch (error: any) {
    console.error('listFolderImages error:', error);
    throw error;
  }
}

/**
 * Fetch image binary from Google Drive and convert to base64
 */
export async function fetchDriveImageBase64(
  accessToken: string,
  fileId: string
): Promise<string> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`فشل في تحميل الصورة: ${res.statusText}`);
    }

    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error(`fetchDriveImageBase64 error for ${fileId}:`, error);
    throw error;
  }
}

/**
 * Search Google Sheets and Excel (.xlsx) files
 */
export async function listSpreadsheets(
  accessToken: string,
  searchQuery = ''
): Promise<DriveSpreadsheet[]> {
  try {
    let q =
      "(mimeType = 'application/vnd.google-apps.spreadsheet' or " +
      "mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or " +
      "name contains '.xlsx' or name contains '.xls') and trashed = false";

    if (searchQuery.trim()) {
      q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', 'files(id, name, mimeType, webViewLink, modifiedTime)');
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'modifiedTime desc');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'فشل في جلب ملفات الإكسل والجداول');
    }

    const data = await res.json();
    const files = data.files || [];

    return files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      isGoogleSheet: file.mimeType === 'application/vnd.google-apps.spreadsheet',
      modifiedTime: file.modifiedTime,
    }));
  } catch (error: any) {
    console.error('listSpreadsheets error:', error);
    throw error;
  }
}

/**
 * Create a new Google Spreadsheet for attendance
 */
export async function createNewGoogleSheet(
  accessToken: string,
  title: string
): Promise<DriveSpreadsheet> {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: title || `كشف حضور الطلاب - ${new Date().toLocaleDateString('ar-EG')}`,
        },
        sheets: [
          {
            properties: {
              title: 'سجل الحضور',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: '#' } },
                      { userEnteredValue: { stringValue: 'اسم الطالب' } },
                      { userEnteredValue: { stringValue: 'رقم القيد / الكود' } },
                      { userEnteredValue: { stringValue: 'تاريخ الحضور' } },
                      { userEnteredValue: { stringValue: 'وقت الحضور' } },
                      { userEnteredValue: { stringValue: 'الحالة' } },
                      { userEnteredValue: { stringValue: 'نسبة التطابق AI' } },
                      { userEnteredValue: { stringValue: 'ملاحظات' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'فشل إنشاء جدول الحضور الجديد');
    }

    const data = await res.json();
    return {
      id: data.spreadsheetId,
      name: data.properties.title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      webViewLink: data.spreadsheetUrl,
      isGoogleSheet: true,
    };
  } catch (error: any) {
    console.error('createNewGoogleSheet error:', error);
    throw error;
  }
}

/**
 * Read attendance records from either Google Sheet or Excel file
 */
export async function readAttendanceRecords(
  accessToken: string,
  file: DriveSpreadsheet
): Promise<AttendanceRecord[]> {
  try {
    if (file.isGoogleSheet) {
      // Fetch metadata first to get exact sheet name
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!metaRes.ok) throw new Error('فشل قراءة تفاصيل جدول البيانات');
      const metaData = await metaRes.json();
      const firstSheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

      // Read values
      const valRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(
          firstSheetName
        )}!A1:ZZ500`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!valRes.ok) return [];
      const valData = await valRes.json();
      const rows: any[][] = valData.values || [];

      if (rows.length <= 1) return [];

      const headers: string[] = (rows[0] || []).map((h: any) => String(h || '').trim());
      const nameIdx = headers.findIndex((h) => h.includes('اسم') || h.toLowerCase().includes('name'));
      const idIdx = headers.findIndex((h) => h.includes('كود') || h.includes('قيد') || h.includes('رقم') || h.toLowerCase().includes('id'));
      const dateTimeIdx = headers.findIndex((h) => (h.includes('تاريخ') && h.includes('وقت')) || h.toLowerCase().includes('timestamp'));
      const dateIdx = headers.findIndex((h) => h.includes('تاريخ') && !h.includes('وقت'));
      const timeIdx = headers.findIndex((h) => h.includes('وقت') && !h.includes('تاريخ'));
      const statusIdx = headers.findIndex((h) => h.includes('حالة') || h.includes('الحالة') || h.toLowerCase().includes('status'));
      const confidenceIdx = headers.findIndex((h) => h.includes('تطابق') || h.includes('نسبة') || h.toLowerCase().includes('confidence'));
      const notesIdx = headers.findIndex((h) => h.includes('ملاحظ') || h.toLowerCase().includes('note'));

      return rows.slice(1).map((row, idx) => {
        const studentName = String((nameIdx !== -1 ? row[nameIdx] : row[1]) || '');
        const studentId = String((idIdx !== -1 ? row[idIdx] : row[2]) || '');
        const fullDateTime = String((dateTimeIdx !== -1 ? row[dateTimeIdx] : '') || '');
        const date = String((dateIdx !== -1 ? row[dateIdx] : row[3]) || '');
        const time = String((timeIdx !== -1 ? row[timeIdx] : row[4]) || '');
        const status = String((statusIdx !== -1 ? row[statusIdx] : row[5]) || 'حاضر');
        const confidence = parseInt(String((confidenceIdx !== -1 ? row[confidenceIdx] : row[6]) || '100'), 10) || 100;
        const notes = String((notesIdx !== -1 ? row[notesIdx] : row[7]) || '');

        return {
          index: Number(row[0]) || idx + 1,
          studentName,
          studentId,
          dateTime: fullDateTime || (date && time ? `${date} ${time}` : date || time),
          date: date || (fullDateTime ? fullDateTime.split(' ')[0] : ''),
          time: time || (fullDateTime ? fullDateTime.split(' ')[1] : ''),
          status,
          confidence,
          notes,
        };
      });
    } else {
      // Excel (.xlsx) file downloaded as binary
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('فشل تحميل ملف الإكسل من جوجل درايف');

      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];

      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (rawRows.length <= 1) return [];

      const headers: string[] = (rawRows[0] || []).map((h: any) => String(h || '').trim());
      const nameIdx = headers.findIndex((h) => h.includes('اسم') || h.toLowerCase().includes('name'));
      const idIdx = headers.findIndex((h) => h.includes('كود') || h.includes('قيد') || h.includes('رقم') || h.toLowerCase().includes('id'));
      const dateTimeIdx = headers.findIndex((h) => (h.includes('تاريخ') && h.includes('وقت')) || h.toLowerCase().includes('timestamp'));
      const dateIdx = headers.findIndex((h) => h.includes('تاريخ') && !h.includes('وقت'));
      const timeIdx = headers.findIndex((h) => h.includes('وقت') && !h.includes('تاريخ'));
      const statusIdx = headers.findIndex((h) => h.includes('حالة') || h.includes('الحالة') || h.toLowerCase().includes('status'));
      const confidenceIdx = headers.findIndex((h) => h.includes('تطابق') || h.includes('نسبة') || h.toLowerCase().includes('confidence'));
      const notesIdx = headers.findIndex((h) => h.includes('ملاحظ') || h.toLowerCase().includes('note'));

      return rawRows.slice(1).map((row, idx) => {
        const studentName = String((nameIdx !== -1 ? row[nameIdx] : row[1]) || '');
        const studentId = String((idIdx !== -1 ? row[idIdx] : row[2]) || '');
        const fullDateTime = String((dateTimeIdx !== -1 ? row[dateTimeIdx] : '') || '');
        const date = String((dateIdx !== -1 ? row[dateIdx] : row[3]) || '');
        const time = String((timeIdx !== -1 ? row[timeIdx] : row[4]) || '');
        const status = String((statusIdx !== -1 ? row[statusIdx] : row[5]) || 'حاضر');
        const confidence = parseInt(String((confidenceIdx !== -1 ? row[confidenceIdx] : row[6]) || '100'), 10) || 100;
        const notes = String((notesIdx !== -1 ? row[notesIdx] : row[7]) || '');

        return {
          index: Number(row[0]) || idx + 1,
          studentName,
          studentId,
          dateTime: fullDateTime || (date && time ? `${date} ${time}` : date || time),
          date: date || (fullDateTime ? fullDateTime.split(' ')[0] : ''),
          time: time || (fullDateTime ? fullDateTime.split(' ')[1] : ''),
          status,
          confidence,
          notes,
        };
      });
    }
  } catch (error: any) {
    console.warn('readAttendanceRecords warning:', error);
    return [];
  }
}

/**
 * Record student attendance into Google Sheet or Excel file
 * Automatically adds the current date & time in a new column
 */
export async function recordStudentAttendance(
  accessToken: string,
  file: DriveSpreadsheet,
  record: {
    studentName: string;
    studentId: string;
    confidence: number;
    status?: string;
    notes?: string;
    autoAddDateTimeColumn?: boolean;
  }
): Promise<{ success: boolean; message: string; addedColumnName: string }> {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
    const timeStr = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const fullDateTime = `${dateStr} - ${timeStr}`;
    const newDateTimeColName = `تاريخ ووقت الحضور (${dateStr} - ${timeStr})`;

    if (file.isGoogleSheet) {
      // Google Sheets API
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!metaRes.ok) throw new Error('فشل قراءة تفاصيل جدول البيانات');
      const metaData = await metaRes.json();
      const firstSheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

      // Read current values
      const existingRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(
          firstSheetName
        )}!A1:ZZ500`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const existingData = await existingRes.json();
      const currentRows: any[][] = existingData.values || [];

      if (currentRows.length === 0) {
        // Initialize sheet with new columns
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(
            firstSheetName
          )}!A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [
                [
                  '#',
                  'اسم الطالب',
                  'رقم القيد / الكود',
                  'تاريخ ووقت الحضور الحالي (عمود جديد)',
                  'تاريخ الحضور',
                  'وقت الحضور',
                  'الحالة',
                  'نسبة التطابق AI',
                  'ملاحظات',
                  newDateTimeColName,
                ],
                [
                  1,
                  record.studentName,
                  record.studentId,
                  fullDateTime,
                  dateStr,
                  timeStr,
                  record.status || 'حاضر',
                  `${record.confidence}%`,
                  record.notes || 'تم التحقق من الوجه بالكاميرا ومطابقة صور درايف',
                  `${record.status || 'حاضر'} (${timeStr})`,
                ],
              ],
            }),
          }
        );
      } else {
        const nextIndex = currentRows.length;
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(
            firstSheetName
          )}!A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [
                [
                  nextIndex,
                  record.studentName,
                  record.studentId,
                  fullDateTime,
                  dateStr,
                  timeStr,
                  record.status || 'حاضر',
                  `${record.confidence}%`,
                  record.notes || 'تم التحقق من الوجه بالكاميرا ومطابقة صور درايف',
                  `${record.status || 'حاضر'} (${timeStr})`,
                ],
              ],
            }),
          }
        );
      }

      return {
        success: true,
        message: `تم تسجيل حضور الطالب وإضافة عمود التاريخ والوقت الجديد (${newDateTimeColName}) في Google Sheets`,
        addedColumnName: newDateTimeColName,
      };
    } else {
      // Excel (.xlsx) file on Google Drive:
      // Download -> update workbook with new column -> re-upload
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let workbook: XLSX.WorkBook;
      let worksheet: XLSX.WorkSheet;
      let sheetName = 'الحضور';

      if (downloadRes.ok) {
        const arrayBuf = await downloadRes.arrayBuffer();
        workbook = XLSX.read(arrayBuf, { type: 'array' });
        sheetName = workbook.SheetNames[0] || 'الحضور';
        worksheet = workbook.Sheets[sheetName];
      } else {
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      const currentRows: any[][] = worksheet ? XLSX.utils.sheet_to_json(worksheet, { header: 1 }) : [];

      if (currentRows.length === 0) {
        // Create initial headers with new Date-Time column
        currentRows.push([
          '#',
          'اسم الطالب',
          'رقم القيد / الكود',
          'تاريخ ووقت الحضور الحالي (عمود جديد)',
          'تاريخ الحضور',
          'وقت الحضور',
          'الحالة',
          'نسبة التطابق AI',
          'ملاحظات',
          newDateTimeColName,
        ]);

        currentRows.push([
          1,
          record.studentName,
          record.studentId,
          fullDateTime,
          dateStr,
          timeStr,
          record.status || 'حاضر',
          `${record.confidence}%`,
          record.notes || 'تم التحقق من الوجه بالكاميرا ومطابقة صور درايف',
          `${record.status || 'حاضر'} (${timeStr})`,
        ]);
      } else {
        // Add the new Date & Time column to the Header Row (Row 0)
        const newColIdx = currentRows[0].length;
        currentRows[0].push(newDateTimeColName);

        // Check if sheet is a student roster table with matching student row
        const cleanSearchName = record.studentName.trim().toLowerCase();
        const cleanSearchId = (record.studentId || '').trim().toLowerCase();

        const studentRowIdx = currentRows.findIndex((r, idx) => {
          if (idx === 0) return false;
          const rName = String(r[1] || r[0] || '').trim().toLowerCase();
          const rId = String(r[2] || '').trim().toLowerCase();
          return (
            (cleanSearchName && (rName === cleanSearchName || rName.includes(cleanSearchName) || cleanSearchName.includes(rName))) ||
            (cleanSearchId && rId === cleanSearchId)
          );
        });

        if (studentRowIdx !== -1) {
          // Update the matched student's row under the newly added Date & Time column
          currentRows[studentRowIdx][newColIdx] = `${record.status || 'حاضر'} (${timeStr})`;

          // Fill other student rows with '-' for this new session column if empty
          for (let i = 1; i < currentRows.length; i++) {
            if (i !== studentRowIdx && (currentRows[i][newColIdx] === undefined || currentRows[i][newColIdx] === '')) {
              currentRows[i][newColIdx] = '-';
            }
          }
        } else {
          // Student not in existing rows or sheet is transaction-based: append new row
          const nextRowIdx = currentRows.length;
          const newRow = new Array(currentRows[0].length).fill('');
          newRow[0] = nextRowIdx;
          newRow[1] = record.studentName;
          newRow[2] = record.studentId;

          // Map standard columns
          const dtIdx = currentRows[0].findIndex((h: any) => String(h).includes('تاريخ ووقت الحضور الحالي'));
          if (dtIdx !== -1) newRow[dtIdx] = fullDateTime;
          const dIdx = currentRows[0].findIndex((h: any) => String(h) === 'تاريخ الحضور');
          if (dIdx !== -1) newRow[dIdx] = dateStr;
          const tIdx = currentRows[0].findIndex((h: any) => String(h) === 'وقت الحضور');
          if (tIdx !== -1) newRow[tIdx] = timeStr;
          const sIdx = currentRows[0].findIndex((h: any) => String(h) === 'الحالة');
          if (sIdx !== -1) newRow[sIdx] = record.status || 'حاضر';
          const cIdx = currentRows[0].findIndex((h: any) => String(h).includes('تطابق'));
          if (cIdx !== -1) newRow[cIdx] = `${record.confidence}%`;
          const nIdx = currentRows[0].findIndex((h: any) => String(h).includes('ملاحظ'));
          if (nIdx !== -1) newRow[nIdx] = record.notes || 'تم التحقق من الوجه بالكاميرا';

          // Put attendance value in the newly created date & time column
          newRow[newColIdx] = `${record.status || 'حاضر'} (${timeStr})`;
          currentRows.push(newRow);
        }
      }

      const updatedSheet = XLSX.utils.aoa_to_sheet(currentRows);
      workbook.Sheets[sheetName] = updatedSheet;

      const updatedBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // Upload updated Excel back to Google Drive
      const uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          body: updatedBinary,
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error?.message || 'فشل تحديث ملف الإكسل في جوجل درايف');
      }

      return {
        success: true,
        message: `تم تسجيل حضور ${record.studentName} وإضافة عمود جديد بالتاريخ والوقت (${newDateTimeColName}) في ملف الإكسل بنجاح!`,
        addedColumnName: newDateTimeColName,
      };
    }
  } catch (error: any) {
    console.error('recordStudentAttendance error:', error);
    throw error;
  }
}
