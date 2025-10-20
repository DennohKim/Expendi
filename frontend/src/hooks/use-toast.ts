import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactElement;
}

export function useToast() {
  return {
    toast: ({ title, description, variant, ...props }: ToastProps) => {
      if (variant === 'destructive') {
        sonnerToast.error(title, {
          description,
        });
      } else {
        sonnerToast.success(title, {
          description,
        });
      }
    },
  };
}