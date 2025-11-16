
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
  pinnedMessage?: Message | null;
}

export interface Message {
  id: string;
  groupId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  contentType: 'text' | 'image' | 'video' | 'file';
  senderId: string;
  senderName: string | null;
  senderPhotoURL: string | null;
  createdAt: Timestamp;
  editedAt?: Timestamp;
}
