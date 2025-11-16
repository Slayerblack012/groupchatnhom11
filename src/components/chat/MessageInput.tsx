
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import { useAuth } from "@/providers/auth-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { compressImage } from "@/lib/image-compression";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useLanguage } from "@/providers/language-provider";
import type { Message } from "@/types";
import FileUploadPreview from "./FileUploadPreview";

// Debounce hook
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

export default function MessageInput({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const typingRef = useRef<boolean>(false);
  
  const removeTypingStatus = useCallback(async () => {
    if (user) {
      try {
        await deleteDoc(doc(db, "groups", groupId, "typing", user.uid));
        typingRef.current = false;
      } catch (error) {
        // Handle error silently
      }
    }
  }, [user, groupId]);
  
  const debouncedRemoveTyping = useDebounce(removeTypingStatus, 3000);

  const updateTypingStatus = useCallback(async () => {
    if (user) {
      try {
        const typingDocRef = doc(db, "groups", groupId, "typing", user.uid);
        await setDoc(typingDocRef, {
          name: user.displayName,
          timestamp: Timestamp.now(),
        });
        typingRef.current = true;
        debouncedRemoveTyping();
      } catch (error) {
        // Handle error silently
      }
    }
  }, [user, groupId, debouncedRemoveTyping]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (fileToSend) {
      await handleFileUpload(fileToSend);
      return;
    }

    if (!text.trim()) return;

    removeTypingStatus();

    const messageData: Omit<Message, 'id' | 'createdAt'> = {
      text,
      contentType: 'text',
      senderId: user.uid,
      senderName: user.displayName,
      senderPhotoURL: user.photoURL,
    };

    const messagesCollection = collection(db, "groups", groupId, "messages");
    addDoc(messagesCollection, { ...messageData, createdAt: serverTimestamp() }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: `groups/${groupId}/messages`,
        operation: 'create',
        requestResourceData: messageData
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    setText("");
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    
    setUploading(true);
    setUploadProgress(0);

    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      
      const fileToUpload: File | Blob = isImage ? await compressImage(file) : file;
      
      const timestamp = Date.now();
      const storageRef = ref(storage, `group_files/${groupId}/${timestamp}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload as Blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: "destructive", title: t('toasts.uploadFailed') });
          setUploading(false);
          setFileToSend(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const messagesCollection = collection(db, "groups", groupId, "messages");
          
          let contentType: Message['contentType'] = 'file';
          if (isImage) contentType = 'image';
          if (isVideo) contentType = 'video';

          const messageData: Omit<Message, 'id' | 'createdAt'> = {
            fileUrl: downloadURL,
            fileName: file.name,
            contentType: contentType,
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
          };
          
          addDoc(messagesCollection, { ...messageData, createdAt: serverTimestamp() }).catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: `groups/${groupId}/messages`,
                operation: 'create',
                requestResourceData: messageData
            });
            errorEmitter.emit('permission-error', permissionError);
          });
          setUploading(false);
          setFileToSend(null);
        }
      );
    } catch (error) {
      console.error("Error processing file:", error);
      toast({ variant: "destructive", title: "Error", description: t('toasts.processFileError') });
      setUploading(false);
      setFileToSend(null);
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({
        variant: "destructive",
        title: t('toasts.fileTooLarge'),
        description: t('toasts.fileTooLargeDesc', { size: '20MB' }),
      });
      return;
    }
    setFileToSend(file);
    setText(""); // Clear text when a file is selected
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentText = e.target.value;
    setText(currentText);
    
    if(currentText) setFileToSend(null);

    if (currentText && !typingRef.current) {
        updateTypingStatus();
    } else if (!currentText && typingRef.current) {
        removeTypingStatus();
    } else if (currentText) {
        debouncedRemoveTyping();
    }
  };


  return (
    <div>
       {fileToSend && !uploading && (
         <FileUploadPreview file={fileToSend} onRemove={() => setFileToSend(null)} />
      )}
      {uploading && (
        <div className="mb-2 flex items-center gap-2">
            <Progress value={uploadProgress} className="w-full" />
            <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={t('messageInput.uploadFile')}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        
        <Input
          type="text"
          placeholder={t('messageInput.placeholder')}
          value={text}
          onChange={handleTextChange}
          className="flex-1"
          autoComplete="off"
          disabled={uploading || !!fileToSend}
        />
        <Button type="submit" size="icon" disabled={(!text.trim() && !fileToSend) || uploading} aria-label={t('messageInput.sendMessage')}>
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
