import type { OperationStage } from '../types/domain';

export interface StageConfig {
  code: OperationStage | null;
  label: string;
  color: string;
  textColor: string;
}

export const STAGE_CONFIG: Record<OperationStage, StageConfig> = {
  '0': { code: '0', label: 'Développement', color: '#FFF2CC', textColor: '#594A00' },
  '0bis': { code: '0bis', label: 'Développement / Montage', color: '#F2DAF1', textColor: '#673765' },
  '1': { code: '1', label: 'Montage', color: '#F2F2F2', textColor: '#3F3F46' },
  '1bis': { code: '1bis', label: 'Montage / Travaux', color: '#BDD7EE', textColor: '#164E63' },
  '2': { code: '2', label: 'Travaux', color: '#FBE4D5', textColor: '#7C2D12' },
  '3': { code: '3', label: 'GPA', color: '#E2EFDA', textColor: '#365314' },
  '4': { code: '4', label: 'DO', color: '#9BC2E6', textColor: '#0C4A6E' },
  '5': { code: '5', label: 'Gestion', color: '#EC9288', textColor: '#7F1D1D' },
  '6': { code: '6', label: 'Abandon', color: '#A5A5A5', textColor: '#18181B' },
};

const NEUTRAL_STAGE: StageConfig = {
  code: null,
  label: 'Stade non renseigné',
  color: '#E2E8F0',
  textColor: '#334155',
};

export function getStageConfig(stage: OperationStage | null | undefined): StageConfig {
  return stage ? STAGE_CONFIG[stage] : NEUTRAL_STAGE;
}
