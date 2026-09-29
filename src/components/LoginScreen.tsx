import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Radio,
  Mic,
  FileSpreadsheet,
  AlertTriangle,
  HardHat,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
    } catch (err: any) {
      console.error(err);
      setError('No se pudo completar el inicio de sesión con Google. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Bar */}
      <header className="px-4 py-4 border-b border-slate-900 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-950">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-xl font-['Chakra_Petch',sans-serif] text-orange-400">
              VOZ<span className="text-white">DE</span>OBRA
            </span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Walkie-Talkie con Memoria & IA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-full font-mono">
          <span>ARGENTINA</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-14 flex-1 flex flex-col items-center text-center justify-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Diseñado para condiciones extremas en campo y obra</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white font-['Chakra_Petch',sans-serif] uppercase max-w-3xl leading-tight mb-4">
          La radio de tu cuadrilla, <br className="hidden sm:inline" />
          <span className="text-orange-500 underline decoration-orange-600/50 decoration-4">
            con memoria e IA
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Mantené apretado, hablá y soltá. El audio se reproduce al instante en los teléfonos y radios de tu equipo, se transcribe con terminología técnica argentina y te arma el reporte completo de cambio de turno.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm rounded-xl max-w-md w-full">
            {error}
          </div>
        )}

        {/* CTA: Google Sign In */}
        <div className="w-full max-w-sm mb-12">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-50 text-slate-950 font-black font-['Chakra_Petch',sans-serif] text-lg uppercase tracking-wider transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-3 border-2 border-orange-400 cursor-pointer"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Conectando…' : 'Ingresar con Google'}</span>
          </button>
          <span className="block text-[11px] text-slate-500 mt-2 font-mono">
            Acceso seguro mediante Firebase Auth
          </span>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left w-full">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center mb-3">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
              Botón PTT de Gran Tamaño
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diseñado para usar con guantes y al aire libre. Mantené apretado en el celular o usá la barra espaciadora en la PC.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
              Alertas de Seguridad
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detección automática de palabras de riesgo: accidentes, fugas, incendios, derrames o evacuaciones marcadas en rojo.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
              Reporte de Cambio de Turno
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gemini consolida las últimas 8 horas: resumen, pendientes con responsables y pedidos de materiales sin inventar nada.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        <span>VozDeObra © 2026 • Prototipo industrial para obras, minería y energía</span>
      </footer>
    </div>
  );
};
