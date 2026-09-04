import { useStore } from '../store/useStore';

export const triggerSuccessToast = (_userEmail: string | undefined, defaultMsg: string = "Action effectuée avec succès.") => {
  useStore.getState().setToastMessage(`✅ ${defaultMsg}`);
};

export const triggerErrorToast = (defaultMsg: string = "Une erreur est survenue.") => {
  useStore.getState().setToastMessage(`❌ ${defaultMsg}`);
};