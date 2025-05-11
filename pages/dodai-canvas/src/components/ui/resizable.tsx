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
      'relative flex w-1 items-center justify-center bg-slate-700/50 transition-colors hover:bg-blue-500/50',
      'data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=vertical]:w-full',
      className || '',
    )}
    {...props}>
    {withHandle && (
      <div className="z-10 flex h-8 w-1.5 items-center justify-center">
        <div className="w-0.5 h-4 bg-slate-400 rounded-full hover:bg-blue-400"></div>
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);
