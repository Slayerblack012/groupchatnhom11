
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
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/config';
import { Skeleton } from '../ui/skeleton';
import { useLanguage } from '@/providers/language-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from 'lucide-react';

export default function SettingsView({ onBack }: { onBack: () => void; }) {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
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
            description: t('toasts.notificationsNotSupported')
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
            toast({ description: t('toasts.notificationsEnabled') });
          } else {
             toast({ variant: "destructive", description: t('toasts.getNotificationTokenError') });
          }
        } else {
            toast({ variant: "destructive", description: t('toasts.notificationPermissionDenied') });
        }
      } catch (error) {
        console.error('Error enabling notifications:', error);
        toast({ variant: "destructive", description: t('toasts.enableNotificationsError') });
      }
    } else {
       setNotificationsEnabled(false);
       toast({ description: t('toasts.notificationsDisabled') });
    }
  };
  
  if (loading) {
      return <div className="p-8"><Skeleton className="h-96 w-full"/></div>
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>{t('login.description')}</p>
      </div>
    );
  }


  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="relative mb-6 flex items-center">
          <Button variant="ghost" size="icon" className="absolute -left-12" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('settings.accountTitle')}</CardTitle>
            <CardDescription>
              {t('settings.accountDescription')}
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
              {t('settings.logoutButton')}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('settings.appearanceTitle')}</CardTitle>
            <CardDescription>
              {t('settings.appearanceDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-mode">{t('settings.themeMode')}</Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>{t('settings.languageTitle')}</CardTitle>
                <CardDescription>{t('settings.languageDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <Label htmlFor="language-select">{t('settings.languageLabel')}</Label>
                    <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'vi' | 'zh')}>
                        <SelectTrigger className="w-[180px]" id="language-select">
                            <SelectValue placeholder={t('settings.languageLabel')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>


        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('settings.notificationsTitle')}</CardTitle>
            <CardDescription>
              {t('settings.notificationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-toggle">
                {t('settings.notificationsToggle')}
              </Label>
              <Switch
                id="notifications-toggle"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={!isNotificationsSupported}
              />
            </div>
            {!isNotificationsSupported && <p className='text-xs text-muted-foreground mt-2'>{t('settings.notificationsUnsupported')}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
