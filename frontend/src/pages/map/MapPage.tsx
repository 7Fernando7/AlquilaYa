/**
 * Map page - properties on map
 */


import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';

export function MapPage() {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mapa</h1>
        <p className="text-gray-600 mt-2">Propiedades en el mapa</p>
      </div>

      <Card className="text-center py-12">
        <div className="text-4xl mb-4">🗺️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Próximamente</h2>
        <p className="text-gray-600">
          La visualización de propiedades en mapa estará disponible pronto
        </p>
      </Card>
    </Layout>
  );
}
