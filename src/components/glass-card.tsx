import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {}

const GlassCard = ({ className, children, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
