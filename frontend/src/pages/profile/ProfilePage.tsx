/**
 * User profile page - view and edit profile
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <p className="font-medium text-sm">Perfil actualizado correctamente</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover mb-4 border-4 border-blue-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4 border-4 border-blue-200">
                  <span className="text-4xl text-blue-600 font-bold">
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
          </div>

          {/* Profile Form Card */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Información del Perfil</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    editMode
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {editMode ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {editMode ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Email Input (disabled) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-500 bg-gray-50 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">El correo no puede ser cambiado</p>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+34 6XX XXX XXX"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                      disabled={loading}
                    />
                  </div>

                  {/* Bio Textarea */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">
                      Biografía
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Cuéntanos sobre ti..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                      disabled={loading}
                    />
                  </div>

                  {/* Profile Photo URL Input */}
                  <div>
                    <label htmlFor="profile_photo_url" className="block text-sm font-semibold text-gray-700 mb-2">
                      URL de Foto de Perfil
                    </label>
                    <input
                      id="profile_photo_url"
                      type="url"
                      name="profile_photo_url"
                      value={formData.profile_photo_url}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white"
                      disabled={loading}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Nombre Completo</p>
                    <p className="text-lg font-medium text-gray-900">{user.name}</p>
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Correo Electrónico</p>
                    <p className="text-lg font-medium text-gray-900">{user.email}</p>
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Tipo de Usuario</p>
                    <p className="text-lg font-medium text-gray-900">{userTypeLabel}</p>
                  </div>

                  {user.phone && (
                    <div className="pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Teléfono</p>
                      <p className="text-lg font-medium text-gray-900">{user.phone}</p>
                    </div>
                  )}

                  {user.bio && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Biografía</p>
                      <p className="text-base text-gray-900">{user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
