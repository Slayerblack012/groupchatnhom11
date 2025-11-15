"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/providers/language-provider";

export default function Login() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
        toast({ variant: "destructive", description: t('toasts.fillFields') });
        return;
    }
    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch (error: any) {
      toast({ variant: "destructive", title: t('toasts.loginFailed'), description: error.message });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail || !signUpPassword || !signUpConfirmPassword) {
        toast({ variant: "destructive", description: t('toasts.fillFields') });
        return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
        toast({ variant: "destructive", description: t('toasts.passwordsNoMatch') });
        return;
    }
    try {
      await signUpWithEmail(signUpEmail, signUpPassword);
    } catch (error: any) {
        toast({ variant: "destructive", title: t('toasts.signUpFailed'), description: error.message });
    }
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex items-center justify-center">
          <MessageSquare className="h-12 w-12 text-primary" />
          <h1 className="ml-4 font-headline text-5xl font-bold text-foreground">
            {t('login.appName')}
          </h1>
        </div>
        <p className="mb-10 text-lg text-muted-foreground">
          {t('login.appSlogan')}
        </p>

      <Tabs defaultValue="login" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t('login.title')}</TabsTrigger>
          <TabsTrigger value="register">{t('register.title')}</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{t('login.title')}</CardTitle>
              <CardDescription>
                {t('login.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="login-email">{t('login.emailLabel')}</Label>
                        <Input id="login-email" type="email" placeholder="m@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="login-password">{t('login.passwordLabel')}</Label>
                        <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">
                        {t('login.button')}
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>{t('register.title')}</CardTitle>
              <CardDescription>
                {t('register.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
             <form onSubmit={handleSignUp}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="signup-email">{t('register.emailLabel')}</Label>
                        <Input id="signup-email" type="email" placeholder="m@example.com" required value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-password">{t('register.passwordLabel')}</Label>
                        <Input id="signup-password" type="password" required value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t('register.confirmPasswordLabel')}</Label>
                        <Input id="confirm-password" type="password" required value={signUpConfirmPassword} onChange={(e) => setSignUpConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">
                        {t('register.button')}
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
