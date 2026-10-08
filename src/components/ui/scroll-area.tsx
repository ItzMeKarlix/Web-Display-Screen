import * as React from "react"
import * as ScrollAreaPrimitives from "@radix-ui/react-scroll-area"

import { cn } from "../../lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitives.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitives.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitives.Viewport
      className="scrollbar-hide h-full w-full rounded-[inherit]"
      style={{ overflowY: 'auto', overflowX: 'hidden' }}
    >
      {children}
    </ScrollAreaPrimitives.Viewport>
  </ScrollAreaPrimitives.Root>
))
ScrollArea.displayName = ScrollAreaPrimitives.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitives.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitives.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitives.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-px",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-px",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitives.Thumb className="relative flex-1 rounded-full bg-slate-200 dark:bg-slate-800" />
  </ScrollAreaPrimitives.Scrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitives.Scrollbar.displayName

export { ScrollArea, ScrollBar }
