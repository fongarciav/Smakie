import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Radio, LogOut, User, HardHat, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  currentChannelName?: string;
  onBackToChannels?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentChannelName,
  onBackToChannels,
  onOpenProfile,
}) => {
  const { user, profile, logOut } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBackToChannels ? (
            <button
              onClick={onBackToChannels}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              title="Volver a canales"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Canales</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-inner">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-lg sm:text-xl font-['Chakra_Petch',sans-serif] text-orange-400">
                  VOZ<span className="text-white">DE</span>OBRA
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30">
                  PTT RADIO
                </span>
              </div>
            </div>
          )}

          {currentChannelName && (
            <div className="ml-2 pl-2 border-l border-slate-700 truncate max-w-[180px] sm:max-w-xs">
              <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Canal activo</span>
              <span className="text-sm font-bold text-white truncate block">{currentChannelName}</span>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors text-xs sm:text-sm font-medium max-w-[150px] sm:max-w-[220px]"
              title="Editar nombre visible"
            >
              <HardHat className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="truncate">{profile?.displayName || 'Configurar nombre'}</span>
            </button>

            <button
              onClick={logOut}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
