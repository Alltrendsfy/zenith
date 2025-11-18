import { cn } from "@/lib/utils";

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-6 -mb-6 mt-6 border-t bg-background px-6 py-4",
        "md:static md:mx-0 md:mb-0 md:border-t-0 md:px-0 md:py-0",
        "flex justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}
