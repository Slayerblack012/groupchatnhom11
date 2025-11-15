
'use client';

import { useLanguage } from "@/providers/language-provider";

interface TypingUser {
    name: string;
    uid: string;
}

interface TypingIndicatorProps {
    users: TypingUser[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
    const { t } = useLanguage();

    if (users.length === 0) {
        return <div className="h-5"></div>; // Reserve space
    }

    const names = users.map(u => u.name).join(', ');
    
    return (
        <div className="h-5 pt-1 text-sm text-muted-foreground animate-pulse">
            {t('typingIndicator.isTyping', { names })}
        </div>
    );
}
