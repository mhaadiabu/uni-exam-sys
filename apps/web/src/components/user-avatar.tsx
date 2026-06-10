import { SVG } from "@mhaadi/svg";
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
    <SVG
      src={`https://api.navii.dev/avatar/${seed}?size=${size}`}
      className={cn("rounded-full bg-muted", className)}
      width={size}
      height={size}
      aria-label={`${name}'s avatar`}
      sanitize={false}
      loading={
        <div
          className={cn("rounded-full bg-muted", className)}
          style={{ width: size, height: size }}
        />
      }
      fallback={
        <div
          className={cn("rounded-full bg-muted", className)}
          style={{ width: size, height: size }}
        />
      }
    />
  );
}
