/**
 * Chat thread page - individual chat conversation
 */


import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';

export function ChatThreadPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conversación</h1>
        <p className="text-gray-600 mt-2">Chat con propietario {id}</p>
      </div>

      <Card className="text-center py-12">
        <div className="text-4xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Próximamente</h2>
        <p className="text-gray-600">
          La funcionalidad de chat estará disponible pronto
        </p>
      </Card>
    </Layout>
  );
}
