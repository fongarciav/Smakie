import React, { useState } from 'react';
import { Channel, Message, ShiftReport } from '../types';
import { useAuth } from '../context/AuthContext';
import { generateAndSaveReport } from '../services/reportService';
import {
  Sparkles,
  X,
  Calendar,
  Clock,
  Copy,
  Check,
  Download,
  AlertCircle,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  messages: Message[];
  onReportCreated?: (report: ShiftReport) => void;
}

type PeriodType = '8hours' | 'today' | 'custom';

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  channel,
  messages,
  onReportCreated,
}) => {
  const { user, profile } = useAuth();

  const [periodType, setPeriodType] = useState<PeriodType>('8hours');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date(Date.now() - 8 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<ShiftReport | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter messages based on chosen period
  const getFilteredMessages = () => {
    const now = Date.now();
    let minTime = 0;
    let maxTime = now;

    if (periodType === '8hours') {
      minTime = now - 8 * 60 * 60 * 1000;
    } else if (periodType === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      minTime = todayStart.getTime();
    } else if (periodType === 'custom') {
      minTime = new Date(customStart).getTime() || 0;
      maxTime = new Date(customEnd).getTime() || now;
    }

    return messages.filter((m) => {
      let t = 0;
      if (m.createdAt) {
        if (m.createdAt.toMillis) {
          t = m.createdAt.toMillis();
        } else if (m.createdAt.getTime) {
          t = m.createdAt.getTime();
        } else {
          t = new Date(m.createdAt).getTime();
        }
      }
      return t >= minTime && t <= maxTime;
    });
  };

  const filteredMessages = getFilteredMessages();

  const handleGenerate = async () => {
    if (!user || !profile) return;

    if (filteredMessages.length === 0) {
      setError('No hay mensajes registrados en el período seleccionado.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      let periodLabel = 'Últimas 8 horas';
      if (periodType === 'today') periodLabel = 'Hoy (desde las 00:00 hs)';
      else if (periodType === 'custom') periodLabel = `Desde ${customStart} hasta ${customEnd}`;

      const formatted = filteredMessages.map((m) => {
        let timeStr = 'Hora desconocida';
        if (m.createdAt) {
          const date = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
          timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          authorName: m.authorName,
          time: timeStr,
          transcript: m.transcript || '[Audio no transcripto]',
        };
      });

      const report = await generateAndSaveReport({
        channelId: channel.id,
        channelName: channel.name,
        period: periodLabel,
        messages: formatted,
        user,
        profile,
      });

      setGeneratedReport(report);
      if (onReportCreated) onReportCreated(report);
    } catch (err: any) {
      setError(err.message || 'Error al generar el reporte.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${channel.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border-2 border-orange-500/80 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-['Chakra_Petch',sans-serif]">
                Generar Reporte de Turno con IA
              </h3>
              <p className="text-xs text-slate-400">
                Canal: <span className="text-slate-200 font-semibold">{channel.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!generatedReport ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Elegí el período a auditar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPeriodType('8hours')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      periodType === '8hours'
                        ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm mb-1 font-['Chakra_Petch',sans-serif]">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span>Últimas 8 horas</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Turno de trabajo habitual</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('today')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      periodType === 'today'
                        ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm mb-1 font-['Chakra_Petch',sans-serif]">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <span>Hoy completo</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Desde las 00:00 de hoy</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('custom')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      periodType === 'custom'
                        ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm mb-1 font-['Chakra_Petch',sans-serif]">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span>Personalizado</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Elegir fecha y hora exacta</p>
                  </button>
                </div>
              </div>

              {periodType === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Desde
                    </label>
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Hasta
                    </label>
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Messages count indicator */}
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Mensajes a consolidar en el período:</span>
                <span className="font-bold text-orange-400 font-mono text-sm">
                  {filteredMessages.length} audios
                </span>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-1">
                  Secciones generadas por el modelo de IA:
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Resumen del período (3 a 5 líneas)</li>
                  <li>Incidentes y temas de seguridad</li>
                  <li>Novedades y avances de la operación, agrupados por tema</li>
                  <li>Pendientes y tareas con responsables</li>
                  <li>Pedidos de materiales, repuestos o equipos</li>
                  <li>Para el cambio de turno: lo que la persona que entra tiene que saber sí o sí</li>
                </ol>
              </div>
            </div>
          ) : (
            /* Result View */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-800 px-3.5 py-2.5 rounded-xl text-emerald-200 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Reporte generado y guardado en el canal
                </span>
                <span className="text-emerald-400 font-mono">{generatedReport.period}</span>
              </div>

              {/* Report Markdown Text Content */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-96 overflow-y-auto">
                {generatedReport.content}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-colors font-['Chakra_Petch',sans-serif]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-orange-400" />
                      <span>Copiar al portapapeles</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-colors font-['Chakra_Petch',sans-serif]"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  <span>Descargar como TXT</span>
                </button>

                <button
                  onClick={() => setGeneratedReport(null)}
                  className="w-full sm:w-auto ml-auto px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                >
                  Generar otro reporte
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!generatedReport && (
          <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900/50">
            <button
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || filteredMessages.length === 0}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all font-['Chakra_Petch',sans-serif]"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Analizando con Gemini…' : 'Generar Reporte Ahora'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
