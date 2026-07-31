import { useState } from 'react';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

export default function ChangePassword() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 12) {
      setError('Le nouveau mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    setError(null);
    const passwordResult = await supabase.auth.updateUser({ password });
    if (passwordResult.error) {
      setError(passwordResult.error.message);
      setSaving(false);
      return;
    }
    const completionResult = await supabase.rpc('complete_password_change');
    if (completionResult.error) {
      setError(`Mot de passe modifié, mais la validation du compte a échoué : ${completionResult.error.message}`);
      setSaving(false);
      return;
    }

    if (profile) setProfile({ ...profile, must_change_password: false });
    navigate('/', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] p-5">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/10 md:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <ShieldCheck size={28} />
        </div>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-teal-700">Première connexion</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-slate-950">Choisissez votre mot de passe</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Le mot de passe transmis par l’administrateur est temporaire. Remplacez-le avant d’accéder aux données de MonPetitPro.
        </p>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm text-slate-700">
            Nouveau mot de passe
            <input autoComplete="new-password" autoFocus minLength={12} required type="password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10" />
          </label>
          <label className="block text-sm text-slate-700">
            Confirmer le mot de passe
            <input autoComplete="new-password" minLength={12} required type="password" value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10" />
          </label>
          <p className="text-xs text-slate-500">12 caractères minimum. Évitez un mot de passe déjà utilisé ailleurs.</p>
          <button disabled={saving} type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-50">
            <KeyRound size={18} /> {saving ? 'Validation…' : 'Enregistrer et accéder à MonPetitPro'}
          </button>
        </form>
        <button type="button" onClick={() => void supabase.auth.signOut()}
          className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-800">
          <LogOut size={16} /> Se déconnecter
        </button>
      </section>
    </main>
  );
}
