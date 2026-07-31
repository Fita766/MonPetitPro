import { describe, expect, it } from 'vitest';
import { alertToIcsEvent, buildIcs } from '../ics';

describe('Outlook ICS export', () => {
  it('convertit une alerte métier en échéance Outlook stable et explicite', () => {
    expect(alertToIcsEvent({
      id: 'op-7-permit_expected_date-2026-09-18',
      operationId: 'op-7',
      operationName: 'Clairoix — Les Jardins',
      milestoneKey: 'permit_submission',
      label: 'Dépôt du permis',
      date: '2026-09-18',
      days: 20,
      status: 'within30',
    })).toEqual({
      uid: 'op-7-permit_expected_date-2026-09-18',
      title: 'Dépôt du permis — Clairoix — Les Jardins',
      date: '2026-09-18',
      description: 'Échéance MonPetitPro pour l’opération Clairoix — Les Jardins. Ouvrir la fiche : /operations/op-7',
    });
  });

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
