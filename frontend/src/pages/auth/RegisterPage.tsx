/**
 * User registration page
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Registrarse</h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea tu cuenta para comenzar a buscar propiedades
          </p>
        </div>

        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            error={errors.email}
            required
          />

          <Input
            label="Nombre Completo"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Juan García"
            error={errors.name}
            required
          />

          <div>
            <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Usuario
            </label>
            <select
              id="user_type"
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="seeker">Buscador de vivienda</option>
              <option value="owner">Propietario</option>
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

          <Button type="submit" loading={loading} className="w-full mt-6">
            Registrarse
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Iniciar sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
