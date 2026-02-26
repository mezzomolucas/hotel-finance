import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, CreditCard, Menu, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { CyberBackground } from './CyberBackground';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bgVariant, setBgVariant] = useState<'subtle' | 'intense'>('intense');

  const toggleBg = () => {
    setBgVariant(prev => prev === 'intense' ? 'subtle' : 'intense');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Entradas', href: '/incomes', icon: TrendingUp },
    { name: 'Saídas', href: '/expenses', icon: TrendingDown },
    { name: 'A Receber', href: '/receivables', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      <CyberBackground variant={bgVariant} />
      
      {/* Top Header / HUD */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 glass-panel border-b border-white/10 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              HOTEL FINANCE OS
            </h1>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200 flex items-center gap-2",
                  isActive
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleBg}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title={bgVariant === 'intense' ? 'Mudar para estilo sutil' : 'Mudar para estilo intenso'}
          >
            <Sparkles className={cn("w-4 h-4", bgVariant === 'intense' ? "text-yellow-400" : "text-gray-400")} />
          </button>
          
          <div className="text-xs text-gray-400 mr-2">
            {user?.email}
          </div>
          <button 
            onClick={signOut}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleBg}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <Sparkles className={cn("w-5 h-5", bgVariant === 'intense' ? "text-yellow-400" : "text-gray-400")} />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0a0a0a] border-b border-white/10 p-4 md:hidden shadow-2xl"
          >
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              <div className="h-px bg-white/10 my-2" />
              
              <div className="px-4 py-2">
                <div className="text-xs text-gray-500 mb-2">Logado como</div>
                <div className="text-sm text-white mb-4">{user?.email}</div>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="relative z-10 pt-24 px-4 sm:px-8 max-w-7xl mx-auto min-h-screen">
        {children}
      </main>
    </div>
  );
};
