import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { Message } from '../types';

export async function createVoiceMessage({
  channelId,
  authorId,
  authorName,
  audioData,
  duration,
}: {
  channelId: string;
  authorId: string;
  authorName: string;
  audioData: string;
  duration: number;
}): Promise<string> {
  const messagesRef = collection(db, 'channels', channelId, 'messages');

  try {
    const docRef = await addDoc(messagesRef, {
      channelId,
      authorId,
      authorName,
      audioData,
      duration: Math.round(duration * 10) / 10,
      transcript: '',
      transcriptStatus: 'pending',
      hasSafetyAlert: false,
      safetyKeywords: [],
      createdAt: serverTimestamp(),
    });

    // Asynchronously kick off server transcription
    processAudioTranscription(channelId, docRef.id, audioData);

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channelId}/messages`);
    throw error;
  }
}

export async function processAudioTranscription(
  channelId: string,
  messageId: string,
  audioData: string
) {
  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: audioData,
        mimeType: 'audio/webm',
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    const msgRef = doc(db, 'channels', channelId, 'messages', messageId);

    await updateDoc(msgRef, {
      transcript: data.transcript || '[Inaudible]',
      transcriptStatus: 'completed',
      hasSafetyAlert: !!data.hasSafetyAlert,
      safetyKeywords: data.safetyKeywords || [],
    });
  } catch (error) {
    console.error('Error al transcribir audio:', error);
    try {
      const msgRef = doc(db, 'channels', channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        transcriptStatus: 'error',
      });
    } catch (e) {
      console.error('No se pudo actualizar estado de error en mensaje:', e);
    }
  }
}

export function subscribeChannelMessages(
  channelId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: any) => void
) {
  const messagesRef = collection(db, 'channels', channelId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Message, 'id'>),
      }));
      onUpdate(messages);
    },
    (error) => {
      console.error('Error escuchando mensajes:', error);
      handleFirestoreError(error, OperationType.LIST, `channels/${channelId}/messages`);
      if (onError) onError(error);
    }
  );
}
