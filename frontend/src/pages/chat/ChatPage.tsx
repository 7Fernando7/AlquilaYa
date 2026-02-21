/**
 * Chat page - list of conversations
 */


import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';

export function ChatPage() {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mensajes</h1>
        <p className="text-gray-600 mt-2">Conversaciones con propietarios</p>
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
