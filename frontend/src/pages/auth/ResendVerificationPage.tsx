/**
 * Resend verification email page
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '@/api/auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { validateEmail } from '@/utils/validators';

export function ResendVerificationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo válido');
      return;
    }

    setLoading(true);
    try {
      await authApi.resendVerification(email);
      setSubmitted(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Falló al reenviar el correo';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Correo Enviado</h2>
            <p className="mt-2 text-gray-600">
              Se ha enviado un link de verificación a <span className="font-medium">{email}</span>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Por favor, revisa tu bandeja de entrada y spam.
            </p>
            <Button className="w-full mt-6" onClick={() => navigate('/login')}>
              Volver a Iniciar Sesión
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reenviar Verificación</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu correo para recibir un nuevo link de verificación
          </p>
        </div>

        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Reenviar
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Volver a iniciar sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
