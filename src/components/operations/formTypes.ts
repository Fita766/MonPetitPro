import type { OperationFormData } from '../../lib/operationPayload';

export type OperationFieldChange = <K extends keyof OperationFormData>(
  key: K,
  value: OperationFormData[K],
) => void;

export interface OperationSectionProps {
  form: OperationFormData;
  onChange: OperationFieldChange;
}
