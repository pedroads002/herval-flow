import mark from "@/assets/herval-mark.png";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
  size = 28,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={mark}
        alt="Herval Marketing"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 object-contain"
      />
      {showWordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-sm font-extrabold tracking-tight">HERVAL FLOW</span>
          <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Marketing
          </span>
        </span>
      ) : null}
    </div>
  );
}
