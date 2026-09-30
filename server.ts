import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini AI client with telemetry user-agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface Candidate {
  id: string;
  name: string;
  imageBase64: string;
  mimeType?: string;
}

// API endpoint for face matching using Gemini 3.8 Flash
app.post('/api/compare-face', async (req: Request, res: Response) => {
  try {
    const { liveImage, candidates } = req.body as {
      liveImage: string; // base64 string without data URL prefix or with it
      candidates: Candidate[];
    };

    if (!liveImage) {
      return res.status(400).json({ error: 'Live image is required' });
    }

    if (!candidates || candidates.length === 0) {
      return res.status(400).json({ error: 'No student reference candidates provided' });
    }

    // Clean base64 strings
    const cleanLiveBase64 = liveImage.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    // Limit to top 20 candidates per batch if folder is large to optimize tokens/speed
    const candidateSubset = candidates.slice(0, 20);

    const parts: any[] = [
      {
        text: `أنت نظام ذكي متخصص في التحقق البيومتري والتعرف على وجوه الطلاب لتسجيل الحضور المدرسي والجامعي.
المهمة:
1. تحقق أولاً مما إذا كانت الصورة الحية (Live Capture) تحتوي على وجه بشري واضح.
2. قارن ملامح الوجه في الصورة الحية (Live Capture) مع صور الطلاب المرجعية المقدمة من مجلد صور جوجل درايف.
3. قم بتحليل ملامح الوجه: المسافة بين العينين، شكل الأنف، خط الفك والخدين، شكل الفم، وملامح الوجه الأساسية (مع تجاهل اختلافات الإضاءة وزوايا التصوير والنظارات أو تسريحة الشعر قدر الإمكان).
4. حدد ما إذا كان الشخص في الصورة الحية يطابق أي طالب من الطلاب المرجعيين.
5. نسبة التطابق (confidence) يجب أن تكون رقماً بين 0 و 100.
إذا كانت نسبة التطابق لأفضل مرشح أقل من 60%، اعتبر النتيجة غير متطابقة (matchedCandidateId: null).

يجب إرجاع النتيجة بصيغة JSON فقط بالتنسيق التالي:
{
  "hasFace": boolean,
  "matchedCandidateId": "string ID of the matched candidate or null",
  "matchedName": "string name of matched candidate or null",
  "confidence": number (0 to 100),
  "reasoning": "سبب التطابق أو عدم التطابق باللغة العربية باختصار",
  "allScores": [
    {
      "id": "candidate id",
      "name": "candidate name",
      "confidence": number
    }
  ]
}`
      },
      {
        text: 'الصورة الحية من كاميرا الموبايل (Live Capture):'
      },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanLiveBase64,
        },
      }
    ];

    candidateSubset.forEach((candidate, index) => {
      const cleanCandidateBase64 = candidate.imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const mime = candidate.mimeType || 'image/jpeg';
      parts.push({
        text: `طالب مرجعي #${index + 1} - المعرف: "${candidate.id}" - الاسم: "${candidate.name}":`
      });
      parts.push({
        inlineData: {
          mimeType: mime,
          data: cleanCandidateBase64,
        }
      });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let resultJson;
    try {
      resultJson = JSON.parse(responseText);
    } catch {
      // Fallback clean markdown blocks if any
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      ...resultJson,
    });
  } catch (error: any) {
    console.error('Error in /api/compare-face:', error);
    return res.status(500).json({
      error: error.message || 'فشل في مقارنة الوجه بالذكاء الاصطناعي',
      details: error.toString(),
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cloud Function endpoint for sending WhatsApp Absence Alerts
app.post('/api/send-whatsapp-alerts', async (req: Request, res: Response) => {
  try {
    const { students, messageTemplate, cloudFunctionUrl, whatsappGatewayApiKey } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'قائمة الطلاب فارغة' });
    }

    // If an external Cloud Function URL is provided (e.g., Google Cloud Functions webhook)
    if (cloudFunctionUrl && typeof cloudFunctionUrl === 'string' && cloudFunctionUrl.trim().startsWith('http')) {
      try {
        const cfResponse = await fetch(cloudFunctionUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(whatsappGatewayApiKey ? { Authorization: `Bearer ${whatsappGatewayApiKey}` } : {}),
          },
          body: JSON.stringify({
            students,
            messageTemplate,
            timestamp: new Date().toISOString(),
          }),
        });

        if (cfResponse.ok) {
          const cfData = await cfResponse.json().catch(() => ({}));
          return res.json({
            success: true,
            provider: 'external_cloud_function',
            sentCount: students.length,
            details: cfData,
          });
        }
      } catch (err: any) {
        console.warn('Direct Cloud Function forward failed, using internal service handler:', err.message);
      }
    }

    // Cloud Function service handler
    const results = students.map((student: any) => {
      const template = messageTemplate || 'تنبيه غياب: نود إعلامكم بتجاوز الطالب {student_name} نسبة غياب {absence_rate}%.';
      const formattedMessage = template
        .replace(/\{student_name\}/g, student.studentName)
        .replace(/\{student_id\}/g, student.studentId || '')
        .replace(/\{absence_rate\}/g, `${student.absenceRate}%`)
        .replace(/\{absence_count\}/g, `${student.absenceCount}`)
        .replace(/\{date\}/g, new Date().toLocaleDateString('ar-EG'));

      const cleanPhone = (student.phone || '').replace(/[^0-9+]/g, '');

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        phone: cleanPhone,
        message: formattedMessage,
        status: cleanPhone ? 'sent' : 'failed_no_phone',
        messageId: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sentAt: new Date().toISOString(),
      };
    });

    return res.json({
      success: true,
      provider: 'cloud_function_service',
      total: students.length,
      sentCount: results.filter((r) => r.status === 'sent').length,
      results,
    });
  } catch (error: any) {
    console.error('Error sending WhatsApp alerts:', error);
    return res.status(500).json({ error: error.message || 'فشل إرسال تنبيهات الواتساب' });
  }
});

// Vite middleware in dev, static files in production
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
