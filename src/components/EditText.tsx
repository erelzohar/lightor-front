import type { ReactNode } from 'react';
import { useEdit } from '../services/editMode';

/**
 * LT-243: one owner-authored text inside a larger element (the hero title
 * shares its <h1> with the subtitle). In the editor the text gets its own
 * span carrying its path; everywhere else it renders bare, so the public
 * markup is untouched.
 */
const EditText = ({ path, children }: { path?: string | null; children: ReactNode }) => {
  const { editing } = useEdit();
  return editing && path ? <span data-lt-edit={path} data-lt-kind="text">{children}</span> : <>{children}</>;
};

export default EditText;
