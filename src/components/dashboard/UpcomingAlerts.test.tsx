import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OperationAlert } from '../../lib/alerts';
import UpcomingAlerts from './UpcomingAlerts';

const alert: OperationAlert = {
  id: 'op-1-permit-2026-08-15',
  operationId: 'op-1',
  operationName: 'Clairoix — Les Jardins',
  milestoneKey: 'permit_submission',
  label: 'Dépôt du permis',
  date: '2026-08-15',
  days: 15,
  status: 'within15',
};

describe('actions Outlook des échéances du tableau de bord', () => {
  it('exporte une échéance sans ouvrir la fiche opération', async () => {
    const user = userEvent.setup();
    const onOpenOperation = vi.fn();
    const onExportAlert = vi.fn();

    render(
      <UpcomingAlerts
        alerts={[alert]}
        onOpenOperation={onOpenOperation}
        onExportAlert={onExportAlert}
        onExportAll={vi.fn()}
      />,
    );

    // L'encart est replié par défaut : le déplier pour atteindre l'échéance.
    await user.click(
      screen.getByRole('button', { name: /Échéances à surveiller/ }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Ajouter Dépôt du permis à Outlook' }),
    );

    expect(onExportAlert).toHaveBeenCalledWith(alert);
    expect(onOpenOperation).not.toHaveBeenCalled();
  });

  it('exporte exactement toutes les échéances actuellement affichées', async () => {
    const user = userEvent.setup();
    const onExportAll = vi.fn();

    render(
      <UpcomingAlerts
        alerts={[alert]}
        onOpenOperation={vi.fn()}
        onExportAlert={vi.fn()}
        onExportAll={onExportAll}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Exporter toutes vers Outlook' }),
    );

    expect(onExportAll).toHaveBeenCalledWith([alert]);
  });
});
