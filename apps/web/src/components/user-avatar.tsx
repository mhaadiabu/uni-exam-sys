import { cn } from "@uni-exam-sys/ui/lib/utils";

export function UserAvatar({
  name,
  className,
  size = 96,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const seed = encodeURIComponent(name);
  return (
    <img
      src={`https://api.navii.dev/avatar/${seed}?size=${size}`}
      alt={`${name}'s avatar`}
      className={cn("rounded-full bg-muted", className)}
      loading="lazy"
    />
  );
}
