/**
 * Email verification page
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authApi from '@/api/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FormError } from '@/components/ui/FormError';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<'loading' | 'verifying' | 'verified' | 'resending' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Auto-verify if token is present
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setState('error');
        setError('No se proporcionó un token de verificación');
        return;
      }

      setState('verifying');
      try {
        await authApi.verifyEmail(token);
        setState('verified');
      } catch (error: any) {
        setState('error');
        const detail = error.response?.data?.detail || 'Falló la verificación de correo';
        setError(detail);
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) return;

    setState('resending');
    try {
      await authApi.resendVerification(email);
      setState('error');
      setError('Se ha enviado un nuevo link de verificación. Revisa tu correo.');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Falló al reenviar el correo';
      setError(detail);
      setState('error');
    }
  };

  if (state === 'loading' || state === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Verificando tu correo...</p>
        </Card>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">¡Verificación completada!</h2>
            <p className="mt-2 text-gray-600">
              Tu correo ha sido verificado correctamente. Ahora puedes iniciar sesión.
            </p>
            <Button className="w-full mt-6" onClick={() => navigate('/login')}>
              Ir a Iniciar Sesión
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Verificar Correo</h2>
          <p className="mt-2 text-sm text-gray-600">
            Aún no hemos podido verificar tu correo
          </p>
        </div>

        <FormError message={error} />

        <div className="mt-6 space-y-4">
          {email && (
            <>
              <p className="text-sm text-gray-600">
                Si no recibiste el correo de verificación a <span className="font-medium">{email}</span>:
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleResendVerification}
                loading={state === 'resending'}
              >
                Reenviar Correo de Verificación
              </Button>
            </>
          )}

          <p className="text-sm text-gray-600 mt-4">
            ¿Quieres intentar con otra cuenta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Registrarse nuevamente
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
