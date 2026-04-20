import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card>
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Construction className="h-7 w-7 text-accent-foreground" />
          </div>
          <p className="font-medium">Modul akan datang</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {description ?? "Modul ini akan dibangun pada tahap berikutnya. Tahap 1 berfokus pada autentikasi, peran, dan manajemen data dasar."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
