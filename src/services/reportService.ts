import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ShiftReport, UserProfile } from '../types';
import { User } from 'firebase/auth';

export async function generateAndSaveReport({
  channelId,
  channelName,
  period,
  messages,
  user,
  profile,
}: {
  channelId: string;
  channelName: string;
  period: string;
  messages: Array<{ authorName: string; time: string; transcript: string }>;
  user: User;
  profile: UserProfile;
}): Promise<ShiftReport> {
  const res = await fetch('/api/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelName,
      period,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error en el servidor al generar el reporte.');
  }

  const data = await res.json();
  const content = data.report;

  const reportsRef = collection(db, 'channels', channelId, 'reports');

  try {
    const docRef = await addDoc(reportsRef, {
      channelId,
      period,
      content,
      createdById: user.uid,
      createdByName: profile.displayName || 'Operario',
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      channelId,
      period,
      content,
      createdById: user.uid,
      createdByName: profile.displayName || 'Operario',
      createdAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channelId}/reports`);
    throw error;
  }
}

export function subscribeChannelReports(
  channelId: string,
  onUpdate: (reports: ShiftReport[]) => void,
  onError?: (error: any) => void
) {
  const reportsRef = collection(db, 'channels', channelId, 'reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const reports: ShiftReport[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ShiftReport, 'id'>),
      }));
      onUpdate(reports);
    },
    (error) => {
      console.error('Error escuchando reportes:', error);
      handleFirestoreError(error, OperationType.LIST, `channels/${channelId}/reports`);
      if (onError) onError(error);
    }
  );
}
