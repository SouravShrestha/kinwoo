import { Button } from "@/components/Button";

type HomeLoadErrorProps = {
  onRetry: () => void;
};

export function HomeLoadError({ onRetry }: HomeLoadErrorProps) {
  return (
    <div className="w-full">
      <p className="text-base text-muted-foreground">Couldn&apos;t load your houses.</p>
      <Button className="mt-4" variant="outline" label="Try again" onClick={onRetry} />
    </div>
  );
}
