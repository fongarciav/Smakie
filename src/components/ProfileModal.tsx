import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HardHat, Check, User, AlertCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

const COMMON_ROLES = [
  'Supervisor de Obra',
  'Jefe de Turno',
  'Operador de Grúa',
  'Capataz Hormigón',
  'Encargado de Seguridad',
  'Técnico Electricista',
  'Topógrafo',
  'Chofer Camión',
  'Mecánico de Planta',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isInitialSetup = false,
}) => {
  const { profile, user, saveProfile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName) {
      setName(profile.displayName);
    } else if (user?.displayName) {
      setName(user.displayName);
    }
  }, [profile, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor escribí tu nombre y rol.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await saveProfile(name.trim());
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectRole = (role: string) => {
    const baseName = name.split('–')[0].split('-')[0].trim() || user?.displayName?.split(' ')[0] || 'Operario';
    setName(`${baseName} – ${role}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-orange-500/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <HardHat className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-['Chakra_Petch',sans-serif]">
              {isInitialSetup ? 'Identificación en Cuadrilla' : 'Modificar Identificación'}
            </h2>
            <p className="text-xs text-slate-400">
              Así te verán y escucharán tus compañeros de trabajo en la radio
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Nombre visible y función (ej. Juan – Supervisor)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Marcelo – Supervisor de Mina"
              maxLength={70}
              className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base font-medium outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <span className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
              Sugerencias rápidas de rol:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {COMMON_ROLES.map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 hover:text-orange-300 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  + {role}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {!isInitialSetup && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-orange-950 transition-all font-['Chakra_Petch',sans-serif]"
            >
              <Check className="w-5 h-5" />
              <span>{saving ? 'Guardando…' : 'Confirmar e Ingresar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
