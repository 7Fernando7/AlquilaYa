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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accede a tu cuenta de FormaconIA
          </p>
        </div>

        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            error={errors.email}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="Tu contraseña"
            error={errors.password}
            required
          />

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Iniciar Sesión
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
