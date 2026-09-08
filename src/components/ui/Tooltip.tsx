import type { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

/** Proveedor unico de tooltips. Se monta una vez en la raiz del shell. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={150}>
      {children}
    </RadixTooltip.Provider>
  );
}

interface TooltipProps {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

export function Tooltip({ label, side = "right", children }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-white shadow-md select-none"
        >
          {label}
          <RadixTooltip.Arrow className="fill-neutral-800" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
