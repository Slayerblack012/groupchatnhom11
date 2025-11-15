"use client";

import { useState, useRef } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
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

export default function MessageInput({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    try {
      await addDoc(collection(db, "groups", groupId, "messages"), {
        text,
        senderId: user.uid,
        senderName: user.displayName,
        senderPhotoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message.",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload files smaller than 20MB.",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const isImage = file.type.startsWith("image/");
      const fileToUpload = isImage ? await compressImage(file) : file;
      
      const storageRef = ref(storage, `group_files/${groupId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({ variant: "destructive", title: "Upload Failed" });
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "groups", groupId, "messages"), {
            ...(isImage ? { imageUrl: downloadURL } : { fileUrl: downloadURL, fileName: file.name }),
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
          });
          setUploading(false);
        }
      );
    } catch (error) {
      console.error("Error processing file:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not process file." });
      setUploading(false);
    }

    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
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
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <Input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1"
          autoComplete="off"
          disabled={uploading}
        />
        <Button type="submit" size="icon" disabled={!text.trim() || uploading}>
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
