import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { Channel, UserProfile } from '../types';
import { User } from 'firebase/auth';

function generateShortCode(): string {
  // 6 uppercase characters, readable (avoid ambiguous O, 0, I, 1)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createChannel(
  name: string,
  user: User,
  profile: UserProfile
): Promise<string> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('El nombre del canal no puede estar vacío');

  const code = generateShortCode();
  const channelsRef = collection(db, 'channels');

  try {
    const docRef = await addDoc(channelsRef, {
      name: trimmedName,
      code,
      creatorId: user.uid,
      creatorName: profile.displayName || 'Operario',
      members: [user.uid],
      activeSpeaker: null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'channels');
    throw error;
  }
}

export async function joinChannelByCode(
  code: string,
  user: User
): Promise<{ channelId: string; channelName: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Ingresá un código válido');

  const channelsRef = collection(db, 'channels');
  const q = query(channelsRef, where('code', '==', cleanCode));

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`No se encontró ningún canal con el código "${cleanCode}".`);
    }

    const channelDoc = snap.docs[0];
    const channelData = channelDoc.data();
    const members = (channelData.members as string[]) || [];

    if (!members.includes(user.uid)) {
      await updateDoc(doc(db, 'channels', channelDoc.id), {
        members: arrayUnion(user.uid),
      });
    }

    return {
      channelId: channelDoc.id,
      channelName: channelData.name,
    };
  } catch (error: any) {
    if (error.message && error.message.includes('No se encontró')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, 'channels');
    throw error;
  }
}

export function subscribeUserChannels(
  userId: string,
  onUpdate: (channels: Channel[]) => void,
  onError?: (error: any) => void
) {
  const channelsRef = collection(db, 'channels');
  const q = query(channelsRef, where('members', 'array-contains', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const channels: Channel[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Channel, 'id'>),
      }));

      // Sort by createdAt descending
      channels.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      onUpdate(channels);
    },
    (error) => {
      console.error('Error escuchando canales:', error);
      handleFirestoreError(error, OperationType.LIST, 'channels');
      if (onError) onError(error);
    }
  );
}

export async function setChannelActiveSpeaker(
  channelId: string,
  speaker: { uid: string; name: string } | null
) {
  try {
    const channelRef = doc(db, 'channels', channelId);
    await updateDoc(channelRef, {
      activeSpeaker: speaker
        ? {
            uid: speaker.uid,
            name: speaker.name,
            startedAt: Date.now(),
          }
        : null,
    });
  } catch (error) {
    // Non-fatal, activeSpeaker is an ephemeral indicator
    console.debug('No se pudo actualizar estado de activeSpeaker:', error);
  }
}
