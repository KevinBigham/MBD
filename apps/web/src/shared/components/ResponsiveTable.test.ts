import { describe, it, expect } from 'vitest';
import { ResponsiveTable } from './ResponsiveTable';
import type { ColumnDef } from './ResponsiveTable';

describe('ResponsiveTable', () => {
  it('is a function component', () => {
    expect(typeof ResponsiveTable).toBe('function');
  });

  it('ColumnDef type supports required fields', () => {
    // Type-level test: ensure the interface works as expected
    const col: ColumnDef<{ name: string }> = {
      key: 'name',
      label: 'Name',
      render: (row) => row.name,
    };
    expect(col.key).toBe('name');
    expect(col.label).toBe('Name');
    expect(col.render({ name: 'Test' }, 0)).toBe('Test');
  });

  it('ColumnDef supports all optional fields', () => {
    const col: ColumnDef<{ val: number }> = {
      key: 'val',
      label: 'Value',
      render: (row) => row.val,
      className: 'text-right',
      primary: true,
      hideOnMobile: false,
      highlight: true,
    };
    expect(col.primary).toBe(true);
    expect(col.highlight).toBe(true);
  });
});
