/**
 * Footer component
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold mb-4">FormaconIA</h3>
            <p className="text-sm">
              Marketplace inteligente de alquiler de viviendas en España.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Características</a></li>
              <li><a href="#" className="hover:text-white">Precios</a></li>
              <li><a href="#" className="hover:text-white">Seguridad</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Información</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Ayuda</a></li>
              <li><a href="#" className="hover:text-white">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Términos</a></li>
              <li><a href="#" className="hover:text-white">Privacidad</a></li>
              <li><a href="#" className="hover:text-white">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-sm text-center">
            © {currentYear} FormaconIA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
