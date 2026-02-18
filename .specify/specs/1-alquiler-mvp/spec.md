# Feature Specification: Marketplace de Alquiler de Viviendas en España (MVP)

**Feature Branch**: `1-alquiler-mvp`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: Especificación funcional completa del marketplace de alquiler de viviendas en España basada en documento de brainstorming

---

## Executive Summary

FormaconIA es un marketplace inteligente de alquiler de viviendas en España que resuelve los principales problemas del mercado de alquileres: estafas, falta de información del barrio, precios inflados, contacto lento con propietarios y falta de transparencia.

La propuesta de valor diferencia a FormaconIA de portales tradicionales al integrar búsqueda inteligente por lenguaje natural, verificación anti-fraude, información detallada del barrio, y recomendaciones basadas en IA.

El MVP inicial incluye funcionalidades core para usuarios buscadores de vivienda, estableciendo la base para agregar monetización, servicios adicionales y funcionalidades avanzadas en fases posteriores.

---

## 1. User Scenarios & Testing

### User Story 1 - Buscar viviendas con filtros inteligentes (Priority: P1)

Un usuario que busca vivienda en una ciudad nueva necesita filtrar propiedades por criterios específicos de su estilo de vida: cercanía al trabajo, zonas tranquilas, vida nocturna, proximidad a colegios, acceso a transporte público. El sistema debe presentar resultados relevantes de forma rápida.

**Por qué esta prioridad**: Es el core del producto - sin búsqueda funcional el usuario no puede acceder al catálogo de viviendas. Es la primer acción del 100% de los usuarios.

**Test independiente**: Puede ser completamente probado permitiendo que un usuario ingrese filtros y reciba una lista ordenada de propiedades que coincidan. Entrega valor inmediato: acceso al catálogo disponible.

**Acceptance Scenarios**:

1. **Given** un usuario sin autenticar accede al marketplace, **When** visualiza opciones de búsqueda, **Then** puede ver filtros básicos disponibles (ubicación, rango de precio, número de habitaciones, tipo de vivienda)
2. **Given** un usuario ingresa filtros de búsqueda, **When** hace clic en buscar, **Then** el sistema retorna propiedades que coinciden con todos los criterios aplicados
3. **Given** existen múltiples propiedades que coinciden, **When** se visualiza la lista de resultados, **Then** los resultados están ordenados por relevancia (combinación de precio, ubicación, recencia)
4. **Given** un usuario aplica el filtro "Cercano a transporte público", **When** visualiza los resultados, **Then** todas las propiedades mostradas tienen acceso a transporte público documentado
5. **Given** un usuario aplica filtro de rango de precio, **When** visualiza resultados, **Then** todas las propiedades están dentro del rango especificado

### Edge Cases para Story 1
- ¿Qué ocurre cuando no hay resultados que coincidan con los filtros? → Mostrar mensaje claro y sugerir expandir criterios
- ¿Qué pasa si el usuario aplica filtros contradictorios? → Mostrar advertencia clara y permitir ajuste

---

### User Story 2 - Registrarse e iniciar sesión (Priority: P1)

Un usuario nuevo en la plataforma debe poder crear una cuenta fácilmente con email y contraseña para acceder a funcionalidades personalizadas (favoritos, alertas, historial de búsqueda).

**Por qué esta prioridad**: Requerido para acceso a funcionalidades clave. Usuarios tienen diferentes perfiles (buscadores, propietarios/agencias).

**Test independiente**: Puede probarse completamente permitiendo que un nuevo usuario se registre, cierre sesión, e inicie sesión nuevamente. Entrega valor: acceso a funcionalidades personalizadas.

**Acceptance Scenarios**:

1. **Given** un usuario sin cuenta accede al sitio, **When** hace clic en "Registrarse", **Then** visualiza formulario con campos: email, contraseña, nombre
2. **Given** el usuario completa el formulario con datos válidos, **When** hace clic en crear cuenta, **Then** la cuenta es creada y se inicia sesión automáticamente
3. **Given** el usuario intenta registrarse con un email ya existente, **When** envía el formulario, **Then** recibe error claro indicando email duplicado
4. **Given** un usuario registrado accede al sitio, **When** hace clic en "Iniciar sesión", **Then** visualiza campos para email y contraseña
5. **Given** el usuario ingresa credenciales correctas, **When** hace clic en iniciar sesión, **Then** la sesión se inicia y accede al dashboard personalizado
6. **Given** el usuario ingresa credenciales incorrectas, **When** intenta iniciar sesión, **Then** recibe error sin revelar si email existe o contraseña es incorrecta

---

### User Story 3 - Guardar propiedades favoritas (Priority: P1)

Un usuario autenticado que encuentra propiedades de interés necesita poder guardarlas para revisarlas después sin tener que hacer búsquedas repetidas.

**Por qué esta prioridad**: Funcionalidad core del MVP que aumenta engagement y retención. Usuarios típicamente comparan múltiples opciones antes de decidir.

**Test independiente**: Puede probarse permitiendo guardar una propiedad a favoritos y verificar que aparece en la lista de favoritos. Entrega valor: gestión personal de opciones de interés.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado visualiza una propiedad, **When** hace clic en el ícono de favorito, **Then** la propiedad se agrega a su lista de favoritos
2. **Given** un usuario tiene propiedades en favoritos, **When** accede a la sección "Mis Favoritos", **Then** visualiza todas las propiedades guardadas con detalles resumidos
3. **Given** un usuario tiene favoritos guardados, **When** visualiza una propiedad en el sitio, **Then** el ícono de favorito muestra estado activo (destacado)
4. **Given** una propiedad está en favoritos, **When** el usuario hace clic nuevamente en el ícono de favorito, **Then** la propiedad se remueve de favoritos
5. **Given** un usuario tiene favoritos, **When** comparsa lista de favoritos con historial de búsqueda, **Then** puede diferenciar claramente qué guardó específicamente

---

### User Story 4 - Recibir alertas de nuevas propiedades (Priority: P2)

Un usuario que realiza búsquedas frecuentes con los mismos criterios necesita recibir notificaciones cuando nuevas propiedades que coinciden con sus preferencias se publican.

**Por qué esta prioridad**: Mejora significativamente experiencia de usuario reduciendo necesidad de búsquedas repetidas. Aumenta engagement pero no es bloqueante para MVP mínimo.

**Test independiente**: Puede probarse creando una alerta, publicando una propiedad que coincida, y verificando que el usuario la reciba. Entrega valor: automación de búsqueda recurrente.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado realiza una búsqueda, **When** visualiza la opción "Crear alerta", **Then** puede crear alerta basada en los criterios actuales
2. **Given** un usuario crea una alerta, **When** confirma la acción, **Then** la alerta se guarda y recibe confirmación visual
3. **Given** una alerta está activa para un usuario, **When** se publica una nueva propiedad que coincide exactamente con los criterios, **Then** se envía notificación al usuario
4. **Given** un usuario tiene alertas activas, **When** accede a "Mis Alertas", **Then** visualiza lista de alertas activas con opción de editar o eliminar
5. **Given** una alerta es activa, **When** pasar 30 días sin nuevas propiedades coincidentes, **Then** el sistema mantiene la alerta activa (sin límite de tiempo)

---

### User Story 5 - Contactar con propietario (Priority: P2)

Un usuario interesado en una propiedad necesita poder contactar al propietario o agencia inmobiliaria para agendar visitas, hacer preguntas, y negociar detalles.

**Por qué esta prioridad**: Funcionalidad crítica de la experiencia pero requiere que las historias P1 estén funcionales primero. Resuelve problema de "contacto lento con propietarios".

**Test independiente**: Puede probarse permitiendo que un usuario envíe un mensaje a un propietario y verificando que el propietario lo reciba. Entrega valor: comunicación directa sin intermediarios.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado visualiza una propiedad, **When** hace clic en "Contactar", **Then** se abre interfaz de chat o formulario de contacto
2. **Given** el usuario escribe un mensaje, **When** hace clic en enviar, **Then** el mensaje se envía al propietario/agencia de forma inmediata
3. **Given** el propietario recibe un mensaje, **When** visualiza su bandeja, **Then** ve el mensaje con información del interesado y detalles de la propiedad
4. **Given** ambos usuarios intercambian mensajes, **When** uno accede al chat, **Then** visualiza historial completo de la conversación ordenado cronológicamente
5. **Given** un usuario envía mensaje a propietario, **When** el sistema notifica al propietario, **Then** el propietario puede responder desde el sitio o vía notificación

---

### User Story 6 - Ver mapa interactivo de propiedades (Priority: P2)

Un usuario que busca vivienda necesita visualizar propiedades en un mapa interactivo para evaluar ubicaciones y cercanía a puntos de referencia importantes.

**Por qué esta prioridad**: Mejora significativamente evaluación de ubicaciones pero no es bloqueante. Complementa búsqueda por filtros.

**Test independiente**: Puede probarse visualizando un mapa con propiedades plotteadas y clickeando en marcadores para ver detalles. Entrega valor: evaluación visual de ubicaciones.

**Acceptance Scenarios**:

1. **Given** un usuario visualiza resultados de búsqueda, **When** hace clic en "Vista de Mapa", **Then** se muestra mapa interactivo con todas las propiedades como marcadores
2. **Given** el mapa está visible, **When** el usuario hace zoom o pan, **Then** los marcadores se mantienen correctamente posicionados
3. **Given** propiedades están plotteadas en mapa, **When** el usuario clickea un marcador, **Then** se visualiza información resumida de la propiedad (precio, habitaciones, ubicación)
4. **Given** un usuario hace clic en información resumida en el mapa, **When** selecciona "Ver detalles", **Then** se abre página completa de la propiedad
5. **Given** el usuario tiene una ubicación de referencia (trabajo, colegio), **When** lo indica en el mapa, **Then** el sistema muestra distancia aproximada de cada propiedad a ese punto

---

### User Story 7 - Listar una propiedad (Priority: P3)

Un propietario o agencia inmobiliaria necesita poder publicar propiedades en la plataforma para que usuarios buscadores las encuentren.

**Por qué esta prioridad**: Funcionalidad necesaria pero que puede ser manejada inicialmente por admin/agencias socios. No es requerida para MVP de usuario buscador.

**Test independiente**: Puede probarse permitiendo que propietario cree listado, lo publique, y verificar que es visible en búsquedas. Entrega valor: provisión de inventario.

**Acceptance Scenarios**:

1. **Given** un propietario/agencia registrado accede a su dashboard, **When** hace clic en "Publicar Propiedad", **Then** visualiza formulario con campos de propiedad
2. **Given** el propietario completa información básica (ubicación, precio, habitaciones, descripción), **When** hace clic en siguiente, **Then** continúa a sección de fotos y detalles
3. **Given** el propietario carga fotos y detalles adicionales, **When** hace clic en "Publicar", **Then** la propiedad es publicada y visible inmediatamente en búsquedas
4. **Given** una propiedad está publicada, **When** el propietario accede a "Mis Propiedades", **Then** puede editar, desactivar, o eliminar la propiedad
5. **Given** una propiedad recibe contactos, **When** el propietario accede a su dashboard, **Then** visualiza cantidad y detalles de interesados

---

### User Story 8 - Verificación básica de propietarios (Priority: P3)

Un usuario buscador necesita confianza en que el propietario/agencia es legítimo para evitar estafas. El sistema debe validar que propietarios son verificados.

**Por qué esta prioridad**: Resuelve problema crítico de "estafas en alquileres" pero implementación inicial puede ser manual (admin verifica). Core para confianza de plataforma.

**Test independiente**: Puede probarse permitiendo visualizar badge de verificación en perfil de propietario y verificar que solo propietarios verificados pueden listar. Entrega valor: reducción de riesgo de estafa.

**Acceptance Scenarios**:

1. **Given** un propietario se registra, **When** intenta publicar propiedad, **Then** debe completar proceso de verificación (subir documento de identidad)
2. **Given** un propietario carga documentos, **When** están validados por admin, **Then** recibe badge de "Verificado" en su perfil
3. **Given** un usuario visualiza una propiedad, **When** ve información del propietario, **Then** puede ver claramente si está verificado o no
4. **Given** un usuario filtra búsqueda por "Propietario Verificado", **When** ejecuta búsqueda, **Then** solo se muestran propiedades de propietarios verificados
5. **Given** un propietario no está verificado, **When** intenta publicar propiedad, **Then** la propiedad no es visible en búsquedas públicas

---

## 2. Requirements

### Functional Requirements

**Búsqueda y Filtrado**
- **FR-001**: Sistema DEBE permitir búsqueda por ubicación (ciudad, barrio, código postal)
- **FR-002**: Sistema DEBE permitir filtrar por rango de precio (mínimo y máximo)
- **FR-003**: Sistema DEBE permitir filtrar por tipo de vivienda (piso, casa, habitación, estudio)
- **FR-004**: Sistema DEBE permitir filtrar por número de habitaciones y baños
- **FR-005**: Sistema DEBE permitir filtrar por criterios de barrio (cercano a transporte público, zonas tranquilas, vida nocturna, proximidad a colegios, parques)
- **FR-006**: Sistema DEBE permitir búsqueda combinada de múltiples filtros simultáneamente
- **FR-007**: Sistema DEBE ordenar resultados por relevancia (combinación de precio, proximidad a filtros de ubicación, recencia de listado)

**Autenticación y Gestión de Usuarios**
- **FR-008**: Sistema DEBE permitir registro de usuarios con email y contraseña
- **FR-009**: Sistema DEBE validar formato de email antes de crear cuenta
- **FR-010**: Sistema DEBE enviar correo de confirmación (o validar email antes de activar cuenta)
- **FR-011**: Sistema DEBE permitir inicio de sesión con email y contraseña
- **FR-012**: Sistema DEBE mantener sesión activa por tiempo razonable sin requerir re-autenticación
- **FR-013**: Sistema DEBE permitir cierre de sesión manual
- **FR-014**: Sistema DEBE permitir recuperación de contraseña via email
- **FR-015**: Sistema DEBE almacenar contraseñas de forma segura (hashed, salted)
- **FR-016**: Sistema DEBE distinguir entre tipos de usuario: buscador de vivienda, propietario, agencia, admin

**Gestión de Favoritos**
- **FR-017**: Sistema DEBE permitir agregar/remover propiedades a favoritos (solo usuarios autenticados)
- **FR-018**: Sistema DEBE mantener lista de favoritos persistente por usuario
- **FR-019**: Sistema DEBE mostrar lista de favoritos con información resumida y opciones rápidas
- **FR-020**: Sistema DEBE permitir ordenar favoritos (por recencia guardada, precio, ubicación)
- **FR-021**: Sistema DEBE permitir exportar o compartir lista de favoritos

**Alertas de Propiedades**
- **FR-022**: Sistema DEBE permitir crear alerta basada en criterios de búsqueda actual
- **FR-023**: Sistema DEBE permitir múltiples alertas por usuario con diferentes criterios
- **FR-024**: Sistema DEBE notificar usuario cuando nueva propiedad publica coincide con criterios de alerta
- **FR-025**: Sistema DEBE permitir editar o eliminar alertas existentes
- **FR-026**: Sistema DEBE permitir seleccionar frecuencia de notificación (inmediata, diaria, semanal)
- **FR-027**: Sistema DEBE almacenar historial de propiedades notificadas por alerta

**Gestión de Propiedades**
- **FR-028**: Sistema DEBE permitir propietarios/agencias publicar propiedades (después de verificación)
- **FR-029**: Sistema DEBE validar que información obligatoria está completa antes de publicar
- **FR-030**: Sistema DEBE permitir propietarios editar información de propiedad publicada
- **FR-031**: Sistema DEBE permitir propietarios desactivar/reactivar propiedades sin eliminarlas
- **FR-032**: Sistema DEBE permitir cargar múltiples fotos de propiedades (mínimo 1, máximo [NEEDS CLARIFICATION: límite de fotos no especificado, sugerir 20-50])
- **FR-033**: Sistema DEBE mostrar estampa de tiempo de creación/última edición de propiedad
- **FR-034**: Sistema DEBE permitir búsqueda de propiedades antiguas (propiedad debe ser indexada)

**Mapas e Información de Ubicación**
- **FR-035**: Sistema DEBE mostrar mapa interactivo de propiedades resultantes
- **FR-036**: Sistema DEBE permitir zoom y pan en mapa
- **FR-037**: Sistema DEBE mostrar información resumida de propiedad al clickear marcador en mapa
- **FR-038**: Sistema DEBE calcular distancia/tiempo a ubicaciones de referencia (trabajo, colegio, transporte público)
- **FR-039**: Sistema DEBE mostrar información de barrio: nivel de seguridad, acceso a transporte, comercios cercanos, escuelas, hospitales, tiempo al centro de la ciudad

**Comunicación y Contacto**
- **FR-040**: Sistema DEBE permitir usuarios buscadores contactar propietarios/agencias
- **FR-041**: Sistema DEBE mantener historial de mensajes entre usuarios
- **FR-042**: Sistema DEBE enviar notificaciones cuando hay nuevos mensajes
- **FR-043**: Sistema DEBE permitir responder rápidamente desde notificación sin acceder al sitio
- **FR-044**: Sistema DEBE permitir propietarios ver lista de interesados en propiedades
- **FR-045**: Sistema DEBE permitir propietarios responder múltiples contactos

**Verificación y Anti-fraude**
- **FR-046**: Sistema DEBE requerir verificación de identidad a propietarios antes de permitir publicación
- **FR-047**: Sistema DEBE solicitar documento de identidad como método de verificación
- **FR-048**: Sistema DEBE mostrar badge de "Verificado" en propietarios validados
- **FR-049**: Sistema DEBE permitir usuarios filtrar solo por propietarios verificados
- **FR-050**: Sistema DEBE bloquear publicación de propiedades por usuarios no verificados

---

### Key Entities

**Usuario (User)**
- Identificador único
- Email (único)
- Contraseña (hasheada)
- Nombre completo
- Tipo de usuario (buscador, propietario, agencia, admin)
- Avatar/foto de perfil
- Teléfono (opcional)
- Dirección (opcional para propietarios)
- Fecha de registro
- Estado de verificación (verificado, pendiente, rechazado)
- Preferencias de notificación
- Historial de búsquedas (búsquedas recientes)

**Propiedad (Property)**
- Identificador único
- Propietario/Agencia (relación a Usuario)
- Ubicación (ciudad, barrio, dirección, latitud, longitud)
- Tipo de vivienda (piso, casa, habitación, estudio)
- Precio de alquiler mensual
- Número de habitaciones
- Número de baños
- Superficie en metros cuadrados
- Descripción/características
- Fotos (múltiples URLs)
- Amenidades (aire acondicionado, calefacción, amueblado, balcón, etc.)
- Fecha de publicación
- Última fecha de actualización
- Estado (activa, pausada, eliminada)
- Información de disponibilidad (disponible desde, restricciones de contrato)

**Favorito (Favorite)**
- Identificador único
- Usuario (relación)
- Propiedad (relación)
- Fecha de creación

**Alerta (Alert)**
- Identificador único
- Usuario (relación)
- Criterios de búsqueda guardados (ubicación, rango precio, tipo vivienda, filtros barrio)
- Frecuencia de notificación (inmediata, diaria, semanal)
- Estado (activa, pausada, eliminada)
- Fecha de creación
- Propiedades notificadas (historial)

**Mensaje (Message)**
- Identificador único
- Usuario remitente (relación)
- Usuario destinatario (relación)
- Propiedad relacionada (relación)
- Contenido del mensaje
- Timestamp
- Estado (enviado, leído)

**Verificación (Verification)**
- Identificador único
- Usuario (relación)
- Tipo de documento
- URL del documento/foto
- Estado (pendiente, aprobado, rechazado)
- Notas de revisión
- Fecha de validación

---

## 3. Success Criteria

### Measurable Outcomes

**Adopción y Registro**
- **SC-001**: Al menos 100 usuarios registrados en los primeros 30 días de lanzamiento MVP
- **SC-002**: 40% de usuarios completar al menos una búsqueda dentro de 24 horas del registro
- **SC-003**: 70% de usuarios mantienen cuenta activa después de 7 días

**Engagement**
- **SC-004**: Promedio de 5+ búsquedas por usuario activo mensual
- **SC-005**: 30% de usuarios crear al menos una alerta en los primeros 30 días
- **SC-006**: 25% de usuarios guardar al menos un favorito en los primeros 7 días
- **SC-007**: 20% de usuarios iniciar contacto con propietario en primeros 30 días

**Rendimiento de Búsqueda**
- **SC-008**: 95% de búsquedas retornan resultados en bajo menos de 1 segundo
- **SC-009**: Tasa de 0% de búsquedas que retornan cero resultados válidos (mejorable con mejor inventario)
- **SC-010**: Usuarios completar búsqueda completa (filtrar + revisar resultados) en menos de 3 minutos

**Calidad de Propiedades**
- **SC-011**: 100% de propiedades publicadas tienen al menos 3 fotos
- **SC-012**: 100% de propiedades publicadas tienen descripción de al menos 100 caracteres
- **SC-013**: Propietarios verificados en 95% de propiedades publicadas
- **SC-014**: Información de barrio disponible para 90% de ubicaciones de propiedades

**Comunicación**
- **SC-015**: Propietarios responden mensajes en promedio dentro de 24 horas
- **SC-016**: 70% de usuarios que contactan propietario reciben respuesta
- **SC-017**: Usuarios reportan satisfacción de comunicación mínimo 4/5 estrellas en encuesta

**Retención**
- **SC-018**: 50% de usuarios registrados permanecen activos después de 30 días
- **SC-019**: 30% de usuarios registrados permanecen activos después de 90 días
- **SC-020**: Usuarios activos acceden al sistema mínimo 2 veces por semana

**Confianza y Seguridad**
- **SC-021**: 0 casos de estafas reportadas en primeros 3 meses (objetivo: mantener plataforma segura)
- **SC-022**: 90% de usuarios reportan sentirse seguros usando la plataforma (encuesta)
- **SC-023**: 100% de propietarios verificados exitosamente antes de publicar

**Satisfacción del Usuario**
- **SC-024**: NPS (Net Promoter Score) mínimo de 20 en primeros 60 días
- **SC-025**: Tasa de satisfacción general mínimo 3.5/5 estrellas
- **SC-026**: 75% de usuarios completar tarea deseada sin asistencia

---

## 4. Assumptions

Las siguientes suposiciones se realizaron dado que el documento de brainstorming no especificaba estos detalles:

- **Infraestructura**: El MVP será soportado por una arquitectura web estándar (frontend + backend) sin requerimientos iniciales de escalabilidad extrema
- **Geolocalización**: Se usarán APIs estándar de mapas (Google Maps o similar) para mostrar ubicaciones y información de barrio
- **Autenticación**: Se usará autenticación básica email/contraseña; OAuth no es requerido para MVP
- **Monetización**: MVP no incluye características de pago - monetización (anuncios destacados, premium, comisiones) se implementará en fase posterior
- **Límites técnicos**: 
  - Máximo 50 fotos por propiedad
  - Máximo 20 alertas por usuario
  - Máximo 1000 favoritos por usuario
  - Sesión activa por 30 días sin actividad
- **Propiedades**: Inicialmente se aceptan propiedades de todo tipo (pisos, casas, habitaciones), sin restricciones por ciudad o zona
- **Verificación**: En MVP la verificación de propietarios puede ser manual (admin valida documentos), sin biometría avanzada
- **Cobertura**: MVP inicial cubrirá búsqueda en territorio español sin restricciones por provincia
- **Información de barrio**: Se usarán fuentes públicas y APIs (transporte, crime stats, puntos de interés) sin ingesta manual

---

## 5. Scope Boundaries

### Incluído en MVP
- Búsqueda y filtrado de propiedades
- Autenticación de usuarios (registro, login, recuperación contraseña)
- Gestión de favoritos
- Alertas básicas de nuevas propiedades
- Listado de propiedades (después de verificación)
- Chat/contacto entre usuarios
- Mapa interactivo de propiedades
- Información de barrio (desde APIs públicas)
- Verificación básica de propietarios (manual)
- Dashboard de propietarios para gestión de propiedades
- Gestión de mensajes para ambos tipos de usuario

### Excluído del MVP (Fase Futura)
- Tours 3D o VR de propiedades
- Realidad aumentada para visualizar muebles
- Comparador visual lado a lado de propiedades
- Escáner de contratos con IA
- Cálculo automático de gastos mensuales con APIs de servicios
- Detector automático de anuncios sospechosos
- Score de fiabilidad del propietario (reputación basada en reviews)
- Búsqueda por lenguaje natural avanzada (con IA)
- Predicción de precios
- Asistente legal de contratos
- Firma digital de contratos
- Pago del alquiler dentro de app
- Historial crediticio del inquilino
- Matching automático para compartir piso
- Blockchain para contratos
- Integración con alquileres temporales
- Servicios adicionales (mudanzas, limpieza, seguros, internet)

### Out of Scope (Post-MVP)
- Integración con servicios de pago
- Validación automática de documentos (biometría)
- Historial crediticio
- Seguros y servicios afiliados

---

## 6. Dependencies & Constraints

**Dependencias Externas**
- APIs de mapas (Google Maps, Mapbox, OpenStreetMap)
- Fuentes de datos públicas para información de barrio
- Servicio de email para notificaciones y confirmaciones
- Almacenamiento de archivos (para fotos de propiedades y documentos)

**Dependencias Internas**
- Sistema de autenticación y gestión de sesiones
- Base de datos para persistencia
- Sistema de notificaciones

**Restricciones**
- GDPR compliance para datos de usuarios en España/UE
- Términos de servicio y política de privacidad requerida antes del lanzamiento
- Proceso de verificación de propietarios debe ser auditable

---

## 7. Visión Futura (Post-MVP)

El MVP establece la base para evolucionar FormaconIA hacia un ecosistema inmobiliario completo:

**Fase 2 - Inteligencia y Confianza**
- IA de búsqueda por lenguaje natural ("Busco piso tranquilo cerca del metro en Malasaña")
- Predicción de precios basada en datos históricos
- Asistente legal de contratos para revisión automática
- Sistema de reputación de propietarios basado en reviews de inquilinos
- Detector automático de anuncios sospechosos

**Fase 3 - Visualización Avanzada**
- Tours 3D o VR de propiedades
- Realidad aumentada para visualizar muebles en espacios
- Comparador visual de propiedades lado a lado
- Escáner de documentos con OCR

**Fase 4 - Monetización Completa**
- Anuncios destacados (propietarios pagan por visibilidad)
- Suscripción Premium (búsqueda avanzada, filtros exclusivos, sin anuncios)
- Comisión a agencias inmobiliarias por leads
- Venta de datos agregados (análisis de mercado) a inversionistas
- Servicios auxiliares: mudanzas, limpieza, seguros del hogar, internet fibra

**Fase 5 - Marketplace Completo**
- Firma digital de contratos
- Pago del alquiler dentro de la app (con escrow)
- Validación de historial crediticio del inquilino
- Matching automático para compartir piso (roommate finder)
- Blockchain para contratos inmutables
- Integración con plataformas de alquiler temporal (Airbnb, Booking)

**Expansión Geográfica**
- Comenzando con España, expandir a Portugal y Francia
- Adaptación de interfaz y información por país
- Integración con marcos legales locales

**Diferenciadores Clave por Fase**
- MVP: Confianza y facilidad de uso
- Fase 2: Inteligencia que entiende preferencias del usuario
- Fase 3: Visualización que reduce incertidumbre
- Fase 4-5: Ecosistema completo que maneja todo aspecto del alquiler

---

## 8. Testing Strategy

### User Acceptance Testing
- Validar búsqueda retorna propiedades correctas para todos los filtros
- Verificar que usuarios pueden completar registro e iniciar sesión
- Confirmar que favoritos se persisten y recuperan correctamente
- Validar alertas se crean y notificaciones se envían cuando propiedades coinciden
- Testear contacto entre usuarios y que mensajes se entregan

### Functional Testing
- Pruebas de campos obligatorios y validación de entrada
- Pruebas de casos límite (búsqueda con resultados cero, lista de favoritos vacía)
- Pruebas de manejo de errores (servidor no disponible, timeout)

### Performance Testing
- Verificar búsquedas completan en menos de 1 segundo
- Verificar carga de mapa con 100+ propiedades es fluida
- Verificar notificaciones se envían sin demora

### Security Testing
- Verificar contraseñas no están visibles o almacenadas en texto plano
- Verificar usuarios no pueden acceder datos de otros usuarios
- Verificar propietarios no pueden ver datos de propietarios competidores
- Verificar documentos de verificación se almacenan de forma segura

---

## 9. Out of Scope - Clarifications

El documento de brainstorming no especificó:
- Ámbito geográfico inicial de lanzamiento (se asume todo España)
- Presupuesto inicial o timeline específico (fuera del alcance de especificación)
- Equipo de desarrollo disponible (fuera del alcance de especificación)
- Tecnologías específicas (a ser decididas en planning phase)

