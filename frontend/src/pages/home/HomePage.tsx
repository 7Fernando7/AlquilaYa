/**
 * Home page - landing page for authenticated users
 */


import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    // Unauthenticated landing page
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bienvenido a <span className="text-primary-600">FormaconIA</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            El marketplace inteligente de alquiler de viviendas en España
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={() => navigate('/register')}>
              Registrarse
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
              Iniciar Sesión
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Búsqueda Inteligente</h3>
                <p className="text-gray-600">
                  Busca propiedades por lenguaje natural y encuentra exactamente lo que necesitas
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Verificación Confiable</h3>
                <p className="text-gray-600">
                  Propiedades y propietarios verificados para tu seguridad
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Chat Seguro</h3>
                <p className="text-gray-600">
                  Comunícate directamente con propietarios de forma segura y rápida
                </p>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Authenticated home page
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Hola, {user.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Bienvenido de vuelta a FormaconIA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/search')}>
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Buscar Propiedades</h3>
            <p className="text-sm text-gray-600 mb-4">
              Descubre nuevas propiedades disponibles
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ir a Búsqueda
            </Button>
          </div>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/favorites')}>
          <div className="text-center">
            <div className="text-4xl mb-4">❤️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mis Favoritos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Propiedades que has guardado
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ver Favoritos
            </Button>
          </div>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/alerts')}>
          <div className="text-center">
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mis Alertas</h3>
            <p className="text-sm text-gray-600 mb-4">
              Alertas de búsqueda personalizadas
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ver Alertas
            </Button>
          </div>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/chat')}>
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mensajes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conversaciones con propietarios
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ver Mensajes
            </Button>
          </div>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/map')}>
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mapa</h3>
            <p className="text-sm text-gray-600 mb-4">
              Propiedades en el mapa
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ver Mapa
            </Button>
          </div>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile')}>
          <div className="text-center">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mi Perfil</h3>
            <p className="text-sm text-gray-600 mb-4">
              Actualiza tu información
            </p>
            <Button variant="secondary" size="sm" className="w-full">
              Ver Perfil
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
