import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Channel, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeChannelMessages,
  createVoiceMessage,
  processAudioTranscription,
} from '../services/messageService';
import { setChannelActiveSpeaker } from '../services/channelService';
import {
  playTxStartSound,
  playRogerBeep,
  playIncomingAlert,
} from '../utils/soundEffects';
import {
  Volume2,
  VolumeX,
  Mic,
  Radio,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Users,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ReportModal } from './ReportModal';
import { ReportListModal } from './ReportListModal';

interface ChannelViewProps {
  channel: Channel;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channel,
}) => {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportListModal, setShowReportListModal] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [discardNotice, setDiscardNotice] = useState<string | null>(null);

  // Currently playing message
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [currentlySpeakingName, setCurrentlySpeakingName] = useState<string | null>(null);

  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const maxDurationTimeoutRef = useRef<any>(null);

  // Auto-play queue state
  const audioQueueRef = useRef<Message[]>([]);
  const isPlayingQueueRef = useRef(false);
  const isRecordingRef = useRef(false);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Keep track of messages already received/played to only auto-play NEW messages
  const initialLoadCompletedRef = useRef(false);
  const playedMessageIdsRef = useRef<Set<string>>(new Set());

  // Scroll anchor
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync ref with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Unlock Audio context and permission
  const handleUnlockAudio = () => {
    try {
      const dummyAudio = new Audio();
      dummyAudio.play().catch(() => {});
      setAudioUnlocked(true);
      playIncomingAlert();
    } catch (e) {
      setAudioUnlocked(true);
    }
  };

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    if (isRecordingRef.current) {
      // Defer playback if user is transmitting
      return;
    }

    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setCurrentPlayingId(null);
      setCurrentlySpeakingName(null);
      return;
    }

    isPlayingQueueRef.current = true;
    const nextMsg = audioQueueRef.current.shift()!;
    setCurrentPlayingId(nextMsg.id);
    setCurrentlySpeakingName(nextMsg.authorName);

    try {
      playIncomingAlert();
      setTimeout(() => {
        const audio = new Audio(nextMsg.audioData);
        activeAudioElementRef.current = audio;

        audio.onended = () => {
          activeAudioElementRef.current = null;
          setCurrentPlayingId(null);
          setCurrentlySpeakingName(null);
          // Wait 300ms before playing next in queue to prevent overlap
          setTimeout(() => {
            playNextInQueue();
          }, 300);
        };

        audio.onerror = (e) => {
          console.error('Error al reproducir audio entrante:', e);
          activeAudioElementRef.current = null;
          setCurrentPlayingId(null);
          setCurrentlySpeakingName(null);
          playNextInQueue();
        };

        audio.play().catch((err) => {
          console.warn('Autoplay bloqueado por el navegador:', err);
          setAudioUnlocked(false);
          activeAudioElementRef.current = null;
          setCurrentPlayingId(null);
          setCurrentlySpeakingName(null);
        });
      }, 150);
    } catch (error) {
      console.error('Error iniciando audio:', error);
      isPlayingQueueRef.current = false;
    }
  }, []);

  // Listen to messages in Firestore
  useEffect(() => {
    initialLoadCompletedRef.current = false;
    playedMessageIdsRef.current.clear();
    audioQueueRef.current = [];

    const unsubscribe = subscribeChannelMessages(channel.id, (loadedMessages) => {
      setMessages(loadedMessages);

      if (!initialLoadCompletedRef.current) {
        // Initial snapshot: mark all existing messages as already seen
        loadedMessages.forEach((m) => playedMessageIdsRef.current.add(m.id));
        initialLoadCompletedRef.current = true;
        scrollToBottom();
        return;
      }

      // Check for incoming new messages from other users
      loadedMessages.forEach((msg) => {
        if (!playedMessageIdsRef.current.has(msg.id)) {
          playedMessageIdsRef.current.add(msg.id);

          // Only auto-play if message is from another user and has audio
          if (user && msg.authorId !== user.uid && msg.audioData) {
            audioQueueRef.current.push(msg);
            if (!isPlayingQueueRef.current && !isRecordingRef.current) {
              playNextInQueue();
            }
          }
        }
      });

      scrollToBottom();
    });

    return () => {
      unsubscribe();
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current = null;
      }
    };
  }, [channel.id, user, playNextInQueue]);

  // Scroll chat to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // START RECORDING
  const startRecording = async () => {
    if (isRecordingRef.current) return;
    setDiscardNotice(null);

    // If an incoming message is currently playing, pause it while user talks
    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
      isPlayingQueueRef.current = false;
      setCurrentPlayingId(null);
      setCurrentlySpeakingName(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Sound feedback
      playTxStartSound();

      // Find supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordStartTimeRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());

        const durationSec = (performance.now() - recordStartTimeRef.current) / 1000;

        // Discard if under 0.5s
        if (durationSec < 0.5) {
          setDiscardNotice('Audio descartado (muy corto: menos de medio segundo)');
          setTimeout(() => setDiscardNotice(null), 3500);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        // Convert blob to base64 Data URL
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (user && profile && base64Audio) {
            try {
              await createVoiceMessage({
                channelId: channel.id,
                authorId: user.uid,
                authorName: profile.displayName || 'Operario',
                audioData: base64Audio,
                duration: durationSec,
              });
            } catch (err) {
              console.error('Error al subir mensaje de voz:', err);
            }
          }
        };

        // If messages were queued while recording, resume playback
        if (audioQueueRef.current.length > 0) {
          setTimeout(() => {
            playNextInQueue();
          }, 500);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Notify other users via activeSpeaker
      if (user && profile) {
        setChannelActiveSpeaker(channel.id, {
          uid: user.uid,
          name: profile.displayName,
        });
      }

      // Elapsed seconds counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Max 60 seconds limit
      maxDurationTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);
    } catch (err: any) {
      console.error('Error accediendo al micrófono:', err);
      setDiscardNotice('Permiso de micrófono denegado o no disponible en este dispositivo.');
      setTimeout(() => setDiscardNotice(null), 4000);
      setIsRecording(false);
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    playRogerBeep();

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }

    // Clear active speaker broadcast
    setChannelActiveSpeaker(channel.id, null);
  };

  // Manual playback of a message
  const handleTogglePlayMessage = (msg: Message) => {
    if (currentPlayingId === msg.id && activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
      setCurrentPlayingId(null);
      return;
    }

    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
    }

    const audio = new Audio(msg.audioData);
    activeAudioElementRef.current = audio;
    setCurrentPlayingId(msg.id);

    audio.onended = () => {
      activeAudioElementRef.current = null;
      setCurrentPlayingId(null);
    };

    audio.onerror = () => {
      activeAudioElementRef.current = null;
      setCurrentPlayingId(null);
    };

    audio.play().catch((err) => {
      console.warn('Playback error:', err);
      setCurrentPlayingId(null);
    });
  };

  // Retry transcription for a failed message
  const handleRetryTranscription = async (msg: Message) => {
    try {
      const msgRef = doc(db, 'channels', channel.id, 'messages', msg.id);
      await updateDoc(msgRef, { transcriptStatus: 'pending' });
    } catch (e) {
      console.error(e);
    }
    processAudioTranscription(channel.id, msg.id, msg.audioData);
  };

  // Desktop Spacebar Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isRecordingRef.current) {
        e.preventDefault();
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space' && isRecordingRef.current) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(channel.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Is another person talking according to Firestore activeSpeaker or current playing audio?
  const remoteSpeakerName =
    currentlySpeakingName ||
    (channel.activeSpeaker && channel.activeSpeaker.uid !== user?.uid
      ? channel.activeSpeaker.name
      : null);

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-4xl mx-auto bg-slate-950 text-slate-100 select-none">
      {/* Top Bar with Channel Info & Quick Actions */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate font-['Chakra_Petch',sans-serif]">
                  {channel.name}
                </h2>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-orange-400 font-mono text-xs px-2 py-0.5 rounded font-bold transition-colors shrink-0"
                  title="Copiar código de canal"
                >
                  <span>{channel.code}</span>
                  {copiedCode ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {channel.members?.length || 1} miembros
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Canal en vivo
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowReportListModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 font-['Chakra_Petch',sans-serif]"
              title="Ver reportes anteriores"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Historial Reportes</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white p-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-950 flex items-center gap-1.5 font-['Chakra_Petch',sans-serif]"
              title="Generar reporte con IA"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-spin-slow" />
              <span className="hidden sm:inline">Generar Reporte IA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unlock Audio Banner (Required by modern browsers for auto-playing incoming walkie-talkie audio) */}
      {!audioUnlocked && (
        <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Para que la radio reproduzca los mensajes automáticamente, activá el audio del navegador.
            </span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors shrink-0 shadow font-['Chakra_Petch',sans-serif]"
          >
            Activar Audio
          </button>
        </div>
      )}

      {/* Remote Speaker Banner Indicator: "🔊 [Nombre] está hablando" */}
      {remoteSpeakerName && (
        <div className="bg-emerald-950/90 border-b-2 border-emerald-500 px-4 py-2 flex items-center justify-center gap-2.5 text-sm text-emerald-200 font-bold animate-pulse font-['Chakra_Petch',sans-serif]">
          <Volume2 className="w-5 h-5 text-emerald-400 animate-bounce" />
          <span>🔊 {remoteSpeakerName} está hablando…</span>
        </div>
      )}

      {/* Discard Warning Notification */}
      {discardNotice && (
        <div className="bg-red-950/95 border-b border-red-700 px-4 py-2 text-center text-xs text-red-200 font-semibold animate-fade-in">
          {discardNotice}
        </div>
      )}

      {/* Messages History (Chat-like, latest at bottom) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-orange-500/60">
              <Radio className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-slate-300 font-['Chakra_Petch',sans-serif]">
              Canal silencioso
            </p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Mantené apretado el botón naranja abajo para emitir tu primer mensaje en la radio.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user?.uid === msg.authorId;
            const isPlayingThis = currentPlayingId === msg.id;

            // Format timestamp
            let timeStr = '';
            if (msg.createdAt) {
              const date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
              timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }

            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  msg.hasSafetyAlert
                    ? 'bg-red-950/60 border-red-600 shadow-lg shadow-red-950/50'
                    : isMe
                    ? 'bg-slate-900/90 border-slate-800 ml-auto max-w-2xl'
                    : 'bg-slate-900/90 border-slate-800 mr-auto max-w-2xl'
                }`}
              >
                {/* Safety Alert Badge if safety words triggered */}
                {msg.hasSafetyAlert && (
                  <div className="flex items-center gap-1.5 bg-red-600/30 border border-red-500/60 text-red-300 px-2.5 py-1 rounded-lg text-xs font-bold mb-2.5 uppercase tracking-wider font-['Chakra_Petch',sans-serif]">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      ALERTA DE SEGURIDAD DETECTADA
                      {msg.safetyKeywords && msg.safetyKeywords.length > 0
                        ? `: (${msg.safetyKeywords.join(', ')})`
                        : ''}
                    </span>
                  </div>
                )}

                {/* Author, Time, Duration & Play Button */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-['Chakra_Petch',sans-serif]">
                      {msg.authorName}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                        Vos
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {timeStr}
                    </span>
                    <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-orange-400 font-bold">
                      {msg.duration}s
                    </span>
                  </div>
                </div>

                {/* Audio Playback Control & Transcription */}
                <div className="flex items-start gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => handleTogglePlayMessage(msg)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      isPlayingThis
                        ? 'bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-orange-400'
                    }`}
                    title={isPlayingThis ? 'Pausar audio' : 'Escuchar audio'}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                      Transcripción IA
                    </div>

                    {msg.transcriptStatus === 'pending' ? (
                      <div className="flex items-center gap-2 text-xs text-amber-400 italic py-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Transcribiendo audio…</span>
                      </div>
                    ) : msg.transcriptStatus === 'error' ? (
                      <div className="flex items-center justify-between gap-2 py-1">
                        <span className="text-xs text-red-400">
                          Error al transcribir
                        </span>
                        <button
                          onClick={() => handleRetryTranscription(msg)}
                          className="text-xs bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 px-2 py-1 rounded transition-colors font-medium"
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-200 leading-relaxed font-sans select-text">
                        {msg.transcript || '[Audio sin voz reconocible]'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom PTT Control Area */}
      <div className="bg-slate-900 border-t-2 border-slate-800 p-3 sm:p-4 shrink-0 shadow-2xl">
        <div className="max-w-md mx-auto">
          {/* Status info bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              {isRecording ? '🔴 Grabando transmisión' : '📻 Radio lista'}
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Espacio en teclado para hablar
            </span>
          </div>

          {/* Giant PTT Button */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            className={`w-full py-5 sm:py-6 px-4 rounded-2xl font-['Chakra_Petch',sans-serif] font-black tracking-wider text-lg sm:text-2xl uppercase transition-all shadow-xl flex items-center justify-center gap-3 touch-none select-none active:scale-[0.98] ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-950 ring-4 ring-red-500/50 animate-pulse'
                : 'bg-orange-600 hover:bg-orange-500 text-slate-950 hover:text-black shadow-orange-950 ring-2 ring-orange-500/50'
            }`}
          >
            <Mic className={`w-7 h-7 sm:w-8 sm:h-8 ${isRecording ? 'animate-bounce text-white' : 'text-slate-950'}`} />

            {isRecording ? (
              <div className="flex items-center gap-3">
                <span>Transmitiendo…</span>
                <span className="bg-black/40 text-white font-mono text-base sm:text-lg px-2.5 py-0.5 rounded-lg border border-white/20">
                  {recordingSeconds}s / 60s
                </span>
              </div>
            ) : (
              <span>Mantener para hablar</span>
            )}
          </button>
        </div>
      </div>

      {/* Report Generation Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        channel={channel}
        messages={messages}
      />

      {/* Past Reports List Modal */}
      <ReportListModal
        isOpen={showReportListModal}
        onClose={() => setShowReportListModal(false)}
        channel={channel}
      />
    </div>
  );
};
