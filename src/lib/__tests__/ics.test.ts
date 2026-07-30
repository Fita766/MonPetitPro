import { describe, expect, it } from 'vitest';
import { buildIcs } from '../ics';

describe('Outlook ICS export', () => {
  it('builds all-day events with J-30 and J-15 alarms', () => {
    const ics = buildIcs([
      { uid: 'op1-pc', title: 'Dépôt PC — Clairoix', date: '2026-05-01', description: 'Permis, secteur A; urgent' },
    ], 'MonPetitPro');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260501');
    expect(ics).toContain('TRIGGER:-P30D');
    expect(ics).toContain('TRIGGER:-P15D');
    expect(ics).toContain('Permis\\, secteur A\\; urgent');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('uses CRLF and escapes new lines and backslashes', () => {
    const ics = buildIcs([{ uid: 'x', title: 'A\\B', date: '2026-05-01', description: 'L1\nL2' }], 'MPP');
    expect(ics).toContain('SUMMARY:A\\\\B');
    expect(ics).toContain('DESCRIPTION:L1\\nL2');
    expect(ics).not.toMatch(/(?<!\r)\n/);
  });
});
