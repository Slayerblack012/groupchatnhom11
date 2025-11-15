import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  fcmTokens?: string[];
}

export interface Group {
  id: string;
  name: string;
  admin: string;
  members: string[];
  createdAt: Timestamp;
  photoURL?: string;
}

export interface Message {
  id: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  contentType: 'text' | 'image' | 'video' | 'file';
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  createdAt: Timestamp;
}
