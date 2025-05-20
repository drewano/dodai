import * as ResizablePrimitive from 'react-resizable-panels';
import { type ReactNode } from 'react';

// Utilitaire pour combiner les classes CSS
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface ResizablePanelGroupProps extends React.ComponentProps<typeof ResizablePrimitive.PanelGroup> {
  className?: string;
  children: ReactNode;
}

export const ResizablePanelGroup = ({ className, children, ...props }: ResizablePanelGroupProps) => (
  <ResizablePrimitive.PanelGroup
    className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className || '')}
    {...props}>
    {children}
  </ResizablePrimitive.PanelGroup>
);

interface ResizablePanelProps extends React.ComponentProps<typeof ResizablePrimitive.Panel> {
  className?: string;
  children?: ReactNode;
}

export const ResizablePanel = ({ className, children, ...props }: ResizablePanelProps) => (
  <ResizablePrimitive.Panel className={className} {...props}>
    {children}
  </ResizablePrimitive.Panel>
);

interface ResizableHandleProps extends React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> {
  className?: string;
  withHandle?: boolean;
}

export const ResizableHandle = ({ className, withHandle, ...props }: ResizableHandleProps) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      'relative flex w-1.5 items-center justify-center bg-background-quaternary/40 rounded-sm transition-colors hover:bg-border-accent/70 data-[resize-handle-state=drag]:bg-border-accent',
      'focus-visible:ring-1 focus-visible:ring-border-accent focus-visible:outline-none',
      'data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-full',
      className || '',
    )}
    {...props}>
    {withHandle && (
      <div className="z-10 flex h-10 w-full items-center justify-center">
        <div className="w-1 h-5 bg-slate-500/70 group-hover:bg-blue-400/70 rounded-full transition-colors data-[resize-handle-state=drag]:bg-blue-300"></div>
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);
