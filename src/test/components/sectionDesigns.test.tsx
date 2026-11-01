import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Process from '../../components/blocks/Process';
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
