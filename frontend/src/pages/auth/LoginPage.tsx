/**
 * User login page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';

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
      // Handle specific error cases
      if (error.response?.status === 403) {
        const detail = error.response?.data?.detail;
        if (detail === 'Email not verified') {
          navigate(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
          return;
        }
      }
      // Error is handled by auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      {/* Background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-8 right-4 w-72 h-72 bg-accent-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

      <Card className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 mb-4">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Bienvenido</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accede a tu cuenta de FormaconIA
          </p>
        </div>

        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo Electrónico"
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            error={errors.email}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            required
          />

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

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">o continúa con</span>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
