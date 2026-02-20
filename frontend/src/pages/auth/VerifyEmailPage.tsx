/**
 * Email verification page
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authApi from '@/api/auth';

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
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-slate-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-600">Verificando tu correo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-slate-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">¡Verificación completada!</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Tu correo ha sido verificado correctamente. Ahora puedes iniciar sesión.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              Verificar Correo
            </h1>
            <p className="text-center text-gray-400 text-sm">
              Aún no hemos podido verificar tu correo
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {email && (
                <>
                  <p className="text-sm text-gray-600">
                    Si no recibiste el correo de verificación a <span className="font-medium">{email}</span>:
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={state === 'resending'}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:border-blue-500 hover:text-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {state === 'resending' ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Reenviando...
                      </>
                    ) : (
                      'Reenviar Correo de Verificación'
                    )}
                  </button>
                </>
              )}

              <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
                ¿Quieres intentar con otra cuenta?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Registrarse nuevamente
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
