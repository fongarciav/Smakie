import React, { useState, useEffect } from 'react';
import { Channel, ShiftReport } from '../types';
import { subscribeChannelReports } from '../services/reportService';
import {
  FileText,
  X,
  Calendar,
  User,
  Copy,
  Check,
  Download,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ReportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
}

export const ReportListModal: React.FC<ReportListModalProps> = ({
  isOpen,
  onClose,
  channel,
}) => {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = subscribeChannelReports(
      channel.id,
      (loaded) => {
        setReports(loaded);
        if (loaded.length > 0 && !expandedId) {
          setExpandedId(loaded[0].id);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [channel.id, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (report: ShiftReport) => {
    navigator.clipboard.writeText(report.content);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (report: ShiftReport) => {
    const blob = new Blob([report.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${channel.name.replace(/\s+/g, '_')}_${report.period.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-['Chakra_Petch',sans-serif]">
                Reportes Anteriores del Canal
              </h3>
              <p className="text-xs text-slate-400">
                Historial de turnos guardados para <span className="text-white font-semibold">{channel.name}</span>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-slate-950 border border-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-base font-bold text-slate-300 font-['Chakra_Petch',sans-serif]">
                Aún no hay reportes generados
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Cuando haya conversaciones en el canal, hacé clic en "Generar Reporte IA" para consolidar el turno.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const isExpanded = expandedId === report.id;
              let dateStr = '';
              if (report.createdAt) {
                const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
                dateStr = date.toLocaleString([], {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });
              }

              return (
                <div
                  key={report.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all shadow-md"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-orange-400 font-['Chakra_Petch',sans-serif]">
                          {report.period}
                        </span>
                        <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Generado por {report.createdByName || 'Operario'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(report);
                        }}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition-colors"
                        title="Copiar texto"
                      >
                        {copiedId === report.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(report);
                        }}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition-colors"
                        title="Descargar archivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <div className="text-slate-400 ml-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text">
                      {report.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
