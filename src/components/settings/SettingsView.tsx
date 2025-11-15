
'use client';

import { useAuth } from '@/providers/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/config';
import { Skeleton } from '../ui/skeleton';

export default function SettingsView() {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isNotificationsSupported, setIsNotificationsSupported] = useState(false);

  useEffect(() => {
    isSupported().then(supported => {
        setIsNotificationsSupported(supported);
        if (supported && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }
    });
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user || !isNotificationsSupported) {
        toast({
            variant: "destructive",
            description: "Push notifications are not supported on this browser."
        });
        return;
    }
    
    if (enabled) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const messaging = getMessaging(app);
          const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
          if (currentToken) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(currentToken),
            });
            setNotificationsEnabled(true);
            toast({ description: 'Notifications enabled.' });
          } else {
             toast({ variant: "destructive", description: 'Could not get notification token.' });
          }
        } else {
            toast({ variant: "destructive", description: 'Notification permission denied.' });
        }
      } catch (error) {
        console.error('Error enabling notifications:', error);
        toast({ variant: "destructive", description: 'Failed to enable notifications.' });
      }
    } else {
       // Note: Disabling notifications client-side. For a full solution, you'd manage tokens server-side.
       // This UX simply stops the client from asking for more messages.
       setNotificationsEnabled(false);
       toast({ description: 'Notifications disabled locally. Note: Server may still send pushes until token expires.' });
    }
  };
  
  if (loading) {
      return <div className="p-8"><Skeleton className="h-96 w-full"/></div>
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Please log in to see your settings.</p>
      </div>
    );
  }


  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Settings</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              This is your public profile information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                <AvatarFallback>
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Separator className="my-6" />
            <Button variant="destructive" onClick={signOut}>
              Log Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-mode">Theme Mode</Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-toggle">
                Get notified for new messages
              </Label>
              <Switch
                id="notifications-toggle"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={!isNotificationsSupported}
              />
            </div>
            {!isNotificationsSupported && <p className='text-xs text-muted-foreground mt-2'>Notifications are not supported on this browser or device.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
