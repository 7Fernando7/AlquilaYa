/**
 * Navigation bar component
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700">
              <span className="text-white font-bold text-sm"></span>
            </div>
            <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
              FormaconIA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/search" className="text-gray-700 hover:text-primary-600">
                  Buscar
                </Link>
                <Link to="/favorites" className="text-gray-700 hover:text-primary-600">
                  Favoritos
                </Link>
                <Link to="/alerts" className="text-gray-700 hover:text-primary-600">
                  Alertas
                </Link>
                <Link to="/chat" className="text-gray-700 hover:text-primary-600">
                  Mensajes
                </Link>
                <div className="flex items-center space-x-4">
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600 font-medium">
                    {user.name}
                  </Link>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Salir
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {user ? (
              <>
                <Link to="/search" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Buscar
                </Link>
                <Link to="/favorites" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Favoritos
                </Link>
                <Link to="/alerts" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Alertas
                </Link>
                <Link to="/chat" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Mensajes
                </Link>
                <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Mi Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Iniciar sesión
                </Link>
                <Link to="/register" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
