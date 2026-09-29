export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSpeaker {
  uid: string;
  name: string;
  startedAt: number;
}

export interface Channel {
  id: string;
  name: string;
  code: string;
  creatorId: string;
  creatorName: string;
  members: string[];
  activeSpeaker?: ActiveSpeaker | null;
  createdAt: any;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  audioData: string;
  duration: number;
  transcript: string;
  transcriptStatus: 'pending' | 'completed' | 'error';
  hasSafetyAlert: boolean;
  safetyKeywords: string[];
  createdAt: any;
}

export interface ShiftReport {
  id: string;
  channelId: string;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  content: string;
  createdById: string;
  createdByName: string;
  createdAt: any;
}
