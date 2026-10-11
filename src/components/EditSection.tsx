import type { ReactNode } from 'react';
import { useEdit } from '../services/editMode';

/**
 * LT-243: marks one section of the page for the site editor — a block's id
 * on a composed page, the legacy section key otherwise. `display: contents`
 * gives the wrapper no box of its own, so it cannot move anything; the
 * overlay measures what it contains. Outside the editor it renders nothing.
 */
const EditSection = ({ id, type, hidden = false, children }: { id: string; type: string; hidden?: boolean; children: ReactNode }) => {
  const { editing } = useEdit();
  if (!editing) return <>{children}</>;
  return (
    <div
      data-lt-section={id}
      data-lt-section-type={type}
      // LT-249: hidden by the owner — drawn faded here only (index.css), so it can be shown again.
      {...(hidden ? { 'data-lt-hidden': 'true' } : {})}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  );
};

export default EditSection;
