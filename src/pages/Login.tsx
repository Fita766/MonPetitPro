import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@papa-immo.fr');
  // Supabase requiert 6 caractères minimum, d'où "testtest"
  const [password, setPassword] = useState('testtest'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message + " (Avez-vous créé le compte en cliquant sur 'Créer ce compte' ?)");
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Supabase nécessite au moins 6 caractères pour le mot de passe
    const pwdToUse = password.length >= 6 ? password : 'testtest';
    if (password !== pwdToUse) {
      setPassword(pwdToUse);
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pwdToUse,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter (ou vous êtes déjà connecté si l'email n'a pas besoin d'être confirmé).");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg mb-4">
            <Building2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">MonPetitPro</h2>
          <p className="text-slate-500">Suivi d'Action Immo</p>
        </div>

        {error && (
          <div className="bg-danger/10 text-danger p-3 rounded mb-4 text-sm font-medium">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-100 text-emerald-800 p-3 rounded mb-4 text-sm font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe (6 car. min)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              required
              minLength={6}
            />
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
            
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 text-sm"
            >
              Créer ce compte la première fois
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Le mot de passe doit faire au moins 6 caractères (ex: demo@papa-immo.fr).</p>
        </div>
      </div>
    </div>
  );
}
