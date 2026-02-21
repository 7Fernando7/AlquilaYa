/**
 * User login page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);

    try {
      await login(credentials.email, credentials.password);
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed';
      setLocalError(errorMsg);

      // Special handling for unverified email
      if (errorMsg.includes('Email not verified') || errorMsg.includes('not verified')) {
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-slate-800">
      {/* Gradient Orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">F</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center text-white mb-2">
              Bienvenido de vuelta
            </h1>
            <p className="text-center text-gray-400 text-sm">
              Accede a tu cuenta de FormaconIA
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            {/* Error Message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{displayError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !credentials.email || !credentials.password}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Regístrate
              </Link>
            </p>
          </div>

          {/* Legal Text */}
          <p className="text-center text-gray-500 text-xs mt-6">
            Al iniciar sesión aceptas nuestros{' '}
            <a href="#" className="text-gray-400 hover:text-gray-300 underline transition-colors">
              términos de servicio
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
