/**
 * User registration page
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { validateEmail, validatePassword, validateName } from '@/utils/validators';
import type { UserType } from '@/types/auth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    user_type: 'seeker' as UserType,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: '' }));
    clearError();

    // Validate password on change
    if (name === 'password') {
      const { errors: pwErrors } = validatePassword(value);
      setPasswordErrors(pwErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (!validateName(formData.name)) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

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

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        user_type: formData.user_type,
      });

      // Redirect to verification page
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error) {
      // Error is handled by auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden animate-fadeIn">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white pointer-events-none"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none opacity-30"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-6">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Crea tu cuenta</h1>
          <p className="text-gray-600 text-base">Únete a FormaconIA y encuentra tu hogar ideal</p>
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
                value={formData.email}
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
                label="Nombre Completo"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan García López"
                error={errors.name}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                required
              />
            </div>

            <div>
              <label htmlFor="user_type" className="block text-sm font-semibold text-gray-700 mb-2.5">
                ¿Quién eres?
              </label>
              <select
                id="user_type"
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="seeker" className="bg-white text-gray-900">Buscador de vivienda</option>
                <option value="owner" className="bg-white text-gray-900">Propietario / Casero</option>
              </select>
            </div>

            <div>
              <Input
                label="Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                error={errors.password}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                required
              />
              {passwordErrors.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {passwordErrors.map((err, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-amber-600">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Input
                label="Confirmar Contraseña"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                error={errors.confirmPassword}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                required
              />
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all mt-1">
              Registrarse
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>

        {/* Footer text */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Al registrarte aceptas nuestros{' '}
          <a href="#" className="text-gray-600 hover:text-gray-700 underline">
            términos de servicio
          </a>
        </p>
      </div>
    </div>
  );
}
