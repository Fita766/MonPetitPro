import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setError('Adresse e-mail ou mot de passe incorrect, ou compte suspendu.');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">MonPetitPro</h1>
          <p className="mt-1 text-slate-500">Suivi d’action immobilière</p>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Adresse e-mail</label>
            <input id="email" type="email" autoComplete="email" value={email}
              onChange={(event) => setEmail(event.target.value)} required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} required minLength={8}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 disabled:opacity-50">
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Les comptes sont créés par un administrateur avec un mot de passe temporaire.
        </p>
      </div>
    </div>
  );
}
