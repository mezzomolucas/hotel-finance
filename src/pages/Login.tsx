import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberCard } from '../components/ui/CyberCard';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            setError('Email ou senha incorretos.');
            break;
          case 'auth/invalid-email':
            setError('Endereço de email inválido.');
            break;
          case 'auth/too-many-requests':
            setError('Muitas tentativas. Tente novamente mais tarde.');
            break;
          default:
            setError('Falha ao fazer login. Verifique suas credenciais.');
        }
      } else {
        setError('Falha ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <CyberCard className="border-white/10 backdrop-blur-xl bg-black/40">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">HOTEL FINANCE OS</h1>
            <p className="text-gray-400 text-sm">Acesse sua conta para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <CyberButton
              type="submit"
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </CyberButton>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-400">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-white hover:underline font-medium transition-colors">
                  Criar Conta
                </Link>
              </p>
            </div>
          </form>
        </CyberCard>
      </motion.div>
    </div>
  );
};
