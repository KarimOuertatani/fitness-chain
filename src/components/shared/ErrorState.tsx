import { AlertTriangle } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title="Impossible de charger les données"
        description={message}
        action={
          onRetry ? (
            <Button variant="glass" size="sm" onClick={onRetry}>
              Réessayer
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}
