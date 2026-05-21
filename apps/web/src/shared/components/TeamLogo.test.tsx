import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { TEAMS } from '@mbd/sim-core';
import { TeamLogo } from './TeamLogo';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const logoAssets = (import.meta as unknown as {
  glob: (
    pattern: string,
    options: { eager: true; import: 'default'; query: '?raw' },
  ) => Record<string, string>;
}).glob('../../../public/logos/*.svg', { eager: true, import: 'default', query: '?raw' });

describe('TeamLogo assets', () => {
  it('ships an SVG logo for every fictional team id', () => {
    for (const team of TEAMS) {
      const logoPath = `../../../public/logos/${team.id}.svg`;
      const svg = logoAssets[logoPath];
      expect(svg, `${team.id} logo should exist`).toBeTruthy();
      expect(svg).toContain('<svg');
      expect(svg).toContain(team.abbreviation);
    }
  });
});

describe('TeamLogo', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('falls back to a monogram badge when an unknown logo fails to load', async () => {
    await act(async () => {
      root.render(<TeamLogo teamId="unknown-club" size="sm" />);
    });

    const image = container.querySelector('img');
    expect(image).toBeTruthy();

    await act(async () => {
      image?.dispatchEvent(new Event('error'));
    });

    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toContain('UNK');
  });
});
