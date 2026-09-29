import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '35mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SAFETY_KEYWORDS = [
  'accidente',
  'accidentado',
  'accidentada',
  'herido',
  'herida',
  'lesionado',
  'lesionada',
  'fuga',
  'incendio',
  'fuego',
  'derrame',
  'emergencia',
  'evacuar',
  'evacuación',
  'evacuacion',
  'explosión',
  'explosion',
  'caída',
  'caida',
  'colapso',
  'desmoronamiento',
  'peligro inminente'
];

function detectSafetyAlerts(text: string): { hasAlert: boolean; keywords: string[] } {
  if (!text) return { hasAlert: false, keywords: [] };
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const keyword of SAFETY_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lower)) {
      matched.push(keyword);
    }
  }

  return {
    hasAlert: matched.length > 0,
    keywords: matched,
  };
}

const CANDIDATE_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const isQuota =
        err?.status === 'RESOURCE_EXHAUSTED' ||
        err?.message?.includes('429') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('Quota exceeded') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuota) {
        console.warn(`Modelo ${model} agotó cuota (429). Probando siguiente modelo de respaldo...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// Endpoint: Transcribe Audio
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Falta el audio para transcribir' });
    }

    let cleanBase64 = audioBase64;
    let detectedMime = mimeType;

    if (audioBase64.includes(',')) {
      const commaIndex = audioBase64.indexOf(',');
      const header = audioBase64.substring(0, commaIndex);
      cleanBase64 = audioBase64.substring(commaIndex + 1);

      const mimeMatch = header.match(/^data:([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        detectedMime = mimeMatch[1].trim();
      }
    } else if (detectedMime.includes(';')) {
      detectedMime = detectedMime.split(';')[0].trim();
    }

    if (detectedMime === 'audio/mp4' || detectedMime === 'audio/x-m4a') {
      detectedMime = 'audio/m4a';
    }

    const promptText = `Sos el transcriptor oficial del sistema de radio walkie-talkie para cuadrillas de trabajo en obras, minería y energía en Argentina.
Instrucciones estrictas:
1. Transcribí textualmente todo lo que dice el audio en español rioplatense (Argentina).
2. Conservá términos técnicos, códigos de obra, números de pieza, marcas, patentes de vehículos, mediciones y nombres propios tal como se dicen.
3. Si una parte no se entiende claramente, escribí exactamente "[inaudible]" en vez de adivinar o inventar.
4. NO resumas, NO corrijas gramática ni agregues explicaciones ni comentarios.
5. Devolvé ÚNICAMENTE el texto exacto transcripto, sin comillas ni títulos adicionales.`;

    const audioPart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const { response } = await generateContentWithFallback({
      contents: {
        parts: [
          audioPart,
          { text: promptText },
        ],
      },
    });

    let transcript = response.text?.trim() || '';

    if (!transcript) {
      transcript = '[Audio sin voz reconocible]';
    }

    const { hasAlert, keywords } = detectSafetyAlerts(transcript);

    return res.json({
      transcript,
      hasSafetyAlert: hasAlert,
      safetyKeywords: keywords,
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    const isQuota =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('Quota exceeded');

    const statusCode = isQuota ? 429 : 500;
    return res.status(statusCode).json({
      error: isQuota
        ? 'Límite temporal de cuota excedido. Por favor esperá unos segundos antes de reintentar.'
        : (error.message || 'Error al procesar la transcripción del audio'),
      isQuotaExceeded: isQuota,
    });
  }
});

// Endpoint: Generate AI Shift Report
app.post('/api/generate-report', async (req: Request, res: Response) => {
  try {
    const { period, messages, channelName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No hay mensajes en el período seleccionado para armar el reporte' });
    }

    const formattedMessages = messages
      .map((m: any, index: number) => {
        const time = m.time || 'Hora no especificada';
        const author = m.authorName || 'Operario';
        const text = m.transcript || '[Audio sin transcribir]';
        return `[Mensaje ${index + 1}] (${time}) ${author}: "${text}"`;
      })
      .join('\n');

    const prompt = `Actuás como el Coordinador y Jefe Técnico de Turno para obras de construcción, minería y energía en Argentina.
El canal de radio es: "${channelName || 'Canal de Cuadrilla'}".
Período evaluado: "${period || 'Turno actual'}".

A continuación tenés las transcripciones literales de todo lo hablado por los miembros de la cuadrilla en la radio durante el período:
---
${formattedMessages}
---

Generá un reporte técnico estructurado y profesional en español de Argentina.
El reporte DEBE contener EXACTAMENTE estas 6 secciones en formato Markdown (con títulos h3 "### "):

### 1. Resumen del período
(Síntesis ejecutiva de entre 3 a 5 líneas con lo esencial del turno/período).

### 2. Incidentes y temas de seguridad
(Cualquier accidente, cuasi-accidente, condición insegura, alerta de EPP, fuga, fuego, derrame o parada de seguridad. Si no hubo nada, escribí exactamente "Sin novedades".)

### 3. Novedades y avances de la operación
(Agrupados por tema o frente de trabajo: avance de tareas, hormigonado, excavación, tendido, mantenimiento, etc.)

### 4. Pendientes y tareas
(Qué quedó sin terminar o debe continuarse y quién se hizo cargo o fue asignado, indicando el responsable si se mencionó en los audios.)

### 5. Pedidos de materiales, repuestos o equipos
(Herramientas pedidas, combustible, repuestos, llegada o demora de camiones/maquinaria.)

### 6. Para el cambio de turno: lo que la persona que entra tiene que saber sí o sí
(Los 2 a 4 puntos críticos indispensables para el relevo o la guardia entrante.)

REGLAS OBLIGATORIAS:
- Cada punto que mencione un hecho debe citar entre paréntesis la hora y quién lo dijo (ejemplo: "(14:22 - Juan Supervisor)").
- Si en una sección no hubo mención alguna en las transcripciones, poné únicamente "Sin novedades".
- NUNCA inventes datos, números ni incidentes que no estén presentes en las transcripciones.
- Mantené un tono sobrio, industrial y directo.`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
    });

    const reportContent = response.text || 'No se pudo generar el reporte.';

    return res.json({
      report: reportContent,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-report:', error);
    const isQuota =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('Quota exceeded');

    const statusCode = isQuota ? 429 : 500;
    return res.status(statusCode).json({
      error: isQuota
        ? 'Límite de cuota alcanzado. Esperá unos segundos antes de reintentar el reporte.'
        : (error.message || 'Error al generar el reporte con IA'),
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`VozDeObra server running on http://0.0.0.0:${port}`);
  });
}

startServer();
