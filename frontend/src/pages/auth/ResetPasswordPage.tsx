/**
 * Reset password page - confirm password reset with new password
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authApi from '@/api/auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { validatePassword } from '@/utils/validators';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setError(null);

    if (name === 'password') {
      const { errors: pwErrors } = validatePassword(value);
      setPasswordErrors(pwErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const { isValid: passwordValid } = validatePassword(formData.password);
    if (!passwordValid) {
      newErrors.password = 'La contraseña no cumple los requisitos';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token de recuperación no válido');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await authApi.confirmPasswordReset(token, formData.password);
      setSuccess(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Falló al restablecer la contraseña';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Link no válido</h2>
            <p className="mt-2 text-gray-600">
              El link de recuperación no es válido o ha expirado.
            </p>
            <Button className="w-full mt-6" onClick={() => navigate('/forgot-password')}>
              Solicitar nuevo link
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">¡Contraseña Restablecida!</h2>
            <p className="mt-2 text-gray-600">
              Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Restablecer Contraseña</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Nueva Contraseña"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              error={errors.password}
              required
            />
            {passwordErrors.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-red-600">
                {passwordErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            )}
          </div>

          <Input
            label="Confirmar Contraseña"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Restablecer Contraseña
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
