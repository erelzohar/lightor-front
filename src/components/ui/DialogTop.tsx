import { X } from 'lucide-react';

interface DialogTopProps {
  /** The title's id: the dialog's aria-labelledby. */
  titleId: string;
  title: string;
  /** The title's level, as the dialog had it. */
  level?: 2 | 3;
  onClose: () => void;
  closeLabel: string;
  className?: string;
  titleClassName?: string;
  /** The close button's colours; its shape and size are the same everywhere. */
  buttonClassName?: string;
}

/**
 * LT-446: the top of a long dialog (a policy, the accessibility statement):
 * its title and a close button that stay where they are while the text
 * scrolls under them. Erel: the X used to scroll away with the text, and it
 * was a bare icon, hard to see. Now it is a filled circle, 40px, reachable
 * at any point of the text.
 */
export function DialogTop({ titleId, title, level = 2, onClose, closeLabel, className = '', titleClassName = '', buttonClassName = '' }: DialogTopProps) {
  const Title = level === 3 ? 'h3' : 'h2';
  return (
    <div className={`flex shrink-0 items-center justify-between gap-3 ${className}`} data-testid="dialog-top">
      <Title id={titleId} className={`min-w-0 break-words ${titleClassName}`}>{title}</Title>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${buttonClassName}`}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
