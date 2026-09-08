import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import GenerateReveal from '../../components/GenerateReveal';
import { generateDelay } from '../../services/generateReveal';

describe('GenerateReveal', () => {
  it('lands sections top to bottom, front-loaded, and stops growing past the fold', () => {
    expect(generateDelay(0)).toBeCloseTo(0.15);
    expect(generateDelay(1)).toBeGreaterThan(generateDelay(0));
    expect(generateDelay(3)).toBeGreaterThan(generateDelay(2));
    // Deep pages must not keep the last section waiting for ages.
    expect(generateDelay(20)).toBe(generateDelay(8));
  });

  it('is inert until a generation is posted (seq 0 renders children bare)', () => {
    const { container } = render(<GenerateReveal seq={0} index={2}><p>hello</p></GenerateReveal>);
    expect(container).toHaveTextContent('hello');
    expect(container.querySelector('div')).toBeNull();
  });

  it('wraps and animates once a generation is posted', () => {
    const { container } = render(<GenerateReveal seq={1} index={2}><p>hello</p></GenerateReveal>);
    expect(container.querySelector('div')).not.toBeNull();
    expect(container).toHaveTextContent('hello');
  });
});
