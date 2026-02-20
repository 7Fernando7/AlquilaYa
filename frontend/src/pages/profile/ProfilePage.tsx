/**
 * User profile page - view and edit profile
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import authApi from '@/api/auth';

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    profile_photo_url: user?.profile_photo_url || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.updateProfile(user.id, formData);
      setSuccess(true);
      setEditMode(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Falló al actualizar el perfil';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const userTypeLabel = user.user_type === 'seeker' ? 'Buscador de vivienda' : 'Propietario';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Perfil actualizado correctamente</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <Card className="md:col-span-1">
            <div className="text-center">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto bg-primary-100 flex items-center justify-center mb-4">
                  <span className="text-4xl text-primary-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{userTypeLabel}</p>
              <p className="text-xs text-gray-500 mt-2">{user.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          </Card>

          {/* Profile Form Card */}
          <Card className="md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Información del Perfil</h3>
              <Button
                variant={editMode ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'Cancelar' : 'Editar'}
              </Button>
            </div>

            <FormError message={error} />

            {editMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nombre Completo"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={user.email}
                  disabled
                  helperText="El correo no puede ser cambiado"
                />

                <Input
                  label="Teléfono"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 6XX XXX XXX"
                />

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Biografía
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Cuéntanos sobre ti..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <Input
                  label="URL de Foto de Perfil"
                  type="url"
                  name="profile_photo_url"
                  value={formData.profile_photo_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />

                <Button type="submit" loading={loading} className="w-full">
                  Guardar Cambios
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre Completo</p>
                  <p className="text-lg font-medium text-gray-900">{user.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Correo Electrónico</p>
                  <p className="text-lg font-medium text-gray-900">{user.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Tipo de Usuario</p>
                  <p className="text-lg font-medium text-gray-900">{userTypeLabel}</p>
                </div>

                {user.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="text-lg font-medium text-gray-900">{user.phone}</p>
                  </div>
                )}

                {user.bio && (
                  <div>
                    <p className="text-sm text-gray-600">Biografía</p>
                    <p className="text-base text-gray-900">{user.bio}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
