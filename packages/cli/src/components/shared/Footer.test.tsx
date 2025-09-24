import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Footer } from './Footer';

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    ui: {
      borderSubtle: 'gray',
      textDim: 'dimColor'
    }
  })
}));

describe('Footer Component', () => {
  it('should render default navigation for non-main menu', () => {
    const { lastFrame } = render(<Footer />);

    const output = lastFrame();
    expect(output).toContain('Back (ESC)');
    expect(output).toContain('↑↓ Navigate');
    expect(output).toContain('↵ Select');
    expect(output).toContain('? Help');
  });

  it('should render default navigation for main menu', () => {
    const { lastFrame } = render(<Footer isMainMenu={true} />);

    const output = lastFrame();
    expect(output).not.toContain('Back');
    expect(output).toContain('ESC Exit');
    expect(output).toContain('↑↓ Navigate');
    expect(output).toContain('↵ Select');
    expect(output).toContain('? Help');
  });

  it('should render custom content string', () => {
    const { lastFrame } = render(
      <Footer content="Custom footer content" />
    );

    expect(lastFrame()).toContain('Custom footer content');
    expect(lastFrame()).not.toContain('Navigate');
  });

  it('should render custom React element', () => {
    const CustomContent = () => <span>Custom React Footer</span>;

    const { lastFrame } = render(
      <Footer content={<CustomContent />} />
    );

    expect(lastFrame()).toContain('Custom React Footer');
    expect(lastFrame()).not.toContain('Navigate');
  });

  it('should not show defaults when showDefaults is false', () => {
    const { lastFrame } = render(
      <Footer showDefaults={false} />
    );

    const output = lastFrame();
    expect(output).not.toContain('Navigate');
    expect(output).not.toContain('Select');
    expect(output).not.toContain('Help');
  });

  it('should show custom content over defaults', () => {
    const { lastFrame } = render(
      <Footer
        content="Override content"
        showDefaults={true}
      />
    );

    expect(lastFrame()).toContain('Override content');
    expect(lastFrame()).not.toContain('Navigate');
  });

  it('should render nothing when no content and showDefaults is false', () => {
    const { lastFrame } = render(
      <Footer showDefaults={false} />
    );

    // Should still have the border box but no content
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).not.toContain('Navigate');
    expect(output).not.toContain('Select');
  });
});