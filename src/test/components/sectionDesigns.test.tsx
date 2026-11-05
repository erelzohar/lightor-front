import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Process from '../../components/blocks/Process';
import { notesPath } from '../../components/blocks/ProcessNotes';
import Stats from '../../components/blocks/Stats';
import { EditContext } from '../../services/editMode';

/**
 * LT-529: a section added empty draws nothing on the public site, and stays on
 * the page in the editor to be clicked and written. LT-530: the steps in a row.
 */
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const editing = (node: React.ReactNode) => render(<EditContext.Provider value={{ editing: true }}>{node}</EditContext.Provider>);
const EMPTY = [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }];

describe('Stats', () => {
  it('draws nothing unwritten on the public site', () => {
    const { container } = render(<Stats items={EMPTY} />);
    expect(container.firstChild).toBeNull();
  });

  it('keeps every unwritten number on the page in the editor, each with its path', () => {
    const { container } = editing(<Stats items={EMPTY} basePath="blocks.s1.props" />);
    expect(screen.getAllByText('00')).toHaveLength(3);
    expect(screen.getAllByText('editor.statLabel')).toHaveLength(3);
    expect(container.querySelector('[data-lt-edit="blocks.s1.props.items.2.value"]')).not.toBeNull();
  });

  it('shows what the owner wrote, as written', () => {
    render(<Stats items={[{ value: '500+', label: 'Clients' }, { value: '24/7', label: 'Open' }]} />);
    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
  });
});

describe('Process', () => {
  const STEPS = [{ title: 'Pick', text: 'Choose one' }, { title: 'Bake' }, { title: 'Collect' }];

  it('numbers the steps in a row', () => {
    render(<Process steps={STEPS} title="How" variant="steps" />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('Choose one')).toBeInTheDocument();
    expect(screen.getByRole('list').className).toContain('md:grid-cols-3');
  });

  it('keeps an unwritten step on the page in the editor only', () => {
    const { container } = render(<Process steps={[{ title: '' }]} variant="steps" />);
    expect(container.firstChild).toBeNull();
    editing(<Process steps={[{ title: '' }]} variant="steps" basePath="blocks.p1.props" />);
    expect(screen.getByText('editor.stepTitle')).toBeInTheDocument();
  });
});

describe('Process as pinned notes (LT-583)', () => {
  const STEPS = [{ title: 'Pick', text: 'Choose one' }, { title: 'Bake' }, { title: 'Collect', text: 'At the door' }];

  it('pins each step on a note, numbered, every one with its editor path', () => {
    const { container } = editing(<Process steps={STEPS} title="How" variant="pinned" basePath="blocks.p1.props" />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(container.querySelector('[data-lt-edit="blocks.p1.props.steps.2.text"]')?.textContent).toBe('At the door');
    expect(container.querySelector('[data-lt-edit="blocks.p1.props.title"]')?.textContent).toBe('How');
  });

  it('tilts the notes left and right in turn', () => {
    render(<Process steps={STEPS} variant="pinned" />);
    const tilts = screen.getAllByRole('listitem').map((li) => (li.firstElementChild as HTMLElement).className.includes('md:-rotate-[6deg]') ? 'right' : 'left');
    expect(tilts).toEqual(['left', 'right', 'left']);
  });

  it('runs its line from each note to the next, as S-curves', () => {
    expect(notesPath([{ x: 0, y: 0 }])).toBe('');
    expect(notesPath([{ x: 100, y: 50 }, { x: 500, y: 150 }])).toBe('M100.0 50.0 C320.0 50.0 280.0 150.0 500.0 150.0');
  });
});
