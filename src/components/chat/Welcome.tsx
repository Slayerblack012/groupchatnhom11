import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

export default function Welcome() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-8 text-center">
      <MessageSquare className="h-24 w-24 text-muted-foreground/50" />
      <h2 className="mt-6 text-2xl font-semibold">{t('welcome.title')}</h2>
      <p className="mt-2 text-muted-foreground">
        {t('welcome.description').split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
      </p>
    </div>
  );
}
