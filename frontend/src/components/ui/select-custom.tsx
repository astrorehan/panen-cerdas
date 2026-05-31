import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  wrapperClassName?: string;
}

const CustomSelect = React.forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ className, children, label, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {label && (
          <span className="absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 pointer-events-none">
            {label}
          </span>
        )}
        <select
          className={cn(
            "w-full appearance-none rounded-2xl border border-border/80 bg-surface/40 px-4 text-sm font-medium text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
            label ? "pb-2 pt-6 pr-10" : "py-3 pr-10",
            "cursor-pointer hover:border-primary/40 hover:bg-surface focus:border-primary",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted-foreground/60">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    );
  }
);
CustomSelect.displayName = "CustomSelect";

export { CustomSelect };
