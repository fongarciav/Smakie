import React, { useState, useEffect } from 'react';
import { Channel } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeUserChannels,
  createChannel,
  joinChannelByCode,
} from '../services/channelService';
import {
  Radio,
  Plus,
  Hash,
  Users,
  Copy,
  Check,
  ChevronRight,
  HardHat,
  Search,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface ChannelListProps {
  onSelectChannel: (channel: Channel) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({ onSelectChannel }) => {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / forms state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = subscribeUserChannels(
      user.uid,
      (userChannels) => {
        setChannels(userChannels);
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar la lista de canales.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newChannelName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const newId = await createChannel(newChannelName, user, profile);
      setShowCreateModal(false);
      setNewChannelName('');
    } catch (err: any) {
      setError(err.message || 'Error al crear canal');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    try {
      setJoining(true);
      setError(null);
      const result = await joinChannelByCode(joinCode, user);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (err: any) {
      setError(err.message || 'Código de canal inválido o no encontrado');
    } finally {
      setJoining(false);
    }
  };

  const copyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Banner & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
                SISTEMA OPERATIVO ACTIVO
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Chakra_Petch',sans-serif]">
              Canales de Radio y Cuadrillas
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mt-1">
              Conectate con tu equipo en obra, mina o planta. Hablá manteniendo apretado y dejá todo registrado con transcripción automática.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
            <button
              onClick={() => {
                setError(null);
                setShowJoinModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl border border-slate-700 transition-colors text-sm font-['Chakra_Petch',sans-serif]"
            >
              <Hash className="w-4 h-4 text-orange-400" />
              <span>Unirse con Código</span>
            </button>

            <button
              onClick={() => {
                setError(null);
                setShowCreateModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-950 transition-all text-sm font-['Chakra_Petch',sans-serif]"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Canal</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-200 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Channel Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tus Canales Asignados ({channels.length})
          </h2>
          <span className="text-[11px] text-slate-500">Tocá para sintonizar</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <Radio className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1 font-['Chakra_Petch',sans-serif]">
              No pertenecés a ningún canal todavía
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Creá un canal nuevo para tu turno o pedile el código de 6 caracteres al encargado de tu cuadrilla para unirte.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors font-['Chakra_Petch',sans-serif]"
              >
                Crear Mi Primer Canal
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors font-['Chakra_Petch',sans-serif]"
              >
                Ingresar Código
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className="group cursor-pointer bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/60 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-600/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
                      <Radio className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-orange-300 transition-colors line-clamp-1 font-['Chakra_Petch',sans-serif]">
                        {channel.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Creado por <span className="text-slate-300">{channel.creatorName || 'Operario'}</span>
                      </p>
                    </div>
                  </div>

                  {/* 6-char Code Badge */}
                  <button
                    onClick={(e) => copyCode(e, channel.code)}
                    className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 text-orange-400 font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Copiar código para invitar"
                  >
                    <span>{channel.code}</span>
                    {copiedCode === channel.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>{channel.members?.length || 1} miembros</span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-orange-400 group-hover:translate-x-1 transition-transform">
                    <span>Sintonizar canal</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Crear Canal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-orange-500/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1 font-['Chakra_Petch',sans-serif]">
              Crear Nuevo Canal de Cuadrilla
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              La app generará automáticamente un código corto de 6 caracteres para compartir con tu equipo.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre del Canal
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Ej: Obra Ruta 8 – Turno Mañana"
                  maxLength={90}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base font-medium outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newChannelName.trim()}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all font-['Chakra_Petch',sans-serif]"
                >
                  {creating ? 'Creando…' : 'Crear Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unirse con Código */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-orange-500/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1 font-['Chakra_Petch',sans-serif]">
              Unirse a Canal Existente
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresá el código de 6 caracteres que te envió el supervisor o creador del canal.
            </p>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Código de 6 caracteres
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ej: K7X9W2"
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest text-orange-400 uppercase placeholder-slate-600 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  disabled={joining}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={joining || joinCode.trim().length < 4}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all font-['Chakra_Petch',sans-serif]"
                >
                  {joining ? 'Buscando…' : 'Unirse al Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
