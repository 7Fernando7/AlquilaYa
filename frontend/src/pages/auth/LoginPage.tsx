/**
 * User login page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    clearError();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!credentials.email) {
      newErrors.email = 'El correo es requerido';
    }

    if (!credentials.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(credentials);
      navigate('/');
    } catch (error: any) {
      if (error.response?.status === 403) {
        const detail = error.response?.data?.detail;
        if (detail === 'Email not verified') {
          navigate(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
          return;
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden animate-fadeIn">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white pointer-events-none"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none opacity-30"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-6">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Bienvenido de vuelta</h1>
          <p className="text-gray-600 text-base">Accede a tu cuenta de FormaconIA</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100/50 p-8">
          <FormError message={error} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                label="Correo Electrónico"
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                error={errors.email}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                required
              />
            </div>

            <div>
              <Input
                label="Contraseña"
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                error={errors.password}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                required
              />
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
              Iniciar Sesión
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Regístrate
            </Link>
          </p>
        </div>

        {/* Footer text */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Al iniciar sesión aceptas nuestros{' '}
          <a href="#" className="text-gray-600 hover:text-gray-700 underline">
            términos de servicio
          </a>
        </p>
      </div>
    </div>
  );
}
