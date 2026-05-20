# HOPEX GraphQL API — Análisis de Endpoints y Propuesta de Automatización

## Información del Documento

| Campo | Valor |
|-------|-------|
| **Proyecto** | Automatización del Alta de Sistemas Aplicativos en HOPEX |
| **Autor** | Aaron Delgado |
| **Fecha** | Junio 2026 |
| **Versión** | 1.0 |
| **Ambiente** | Pre-Producción (pprod-gnp.hopexcloud.com) |
| **Estado** | POC Validada ✅ |

---

## 1. Introducción

### 1.1 Contexto

HOPEX es la plataforma de arquitectura empresarial utilizada por GNP para documentar y gestionar el inventario de aplicaciones, sistemas aplicativos, microservicios, infraestructura y sus relaciones. Actualmente, el proceso de alta de un nuevo sistema aplicativo se realiza **manualmente** a través de la interfaz web de HOPEX, lo cual implica:

- Captura manual de ~25 objetos por sistema
- Tiempo promedio de 2-4 horas por alta completa
- Riesgo de errores humanos en nombres, códigos y vinculaciones
- Dependencia de disponibilidad del equipo de arquitectura
- Inconsistencia en la nomenclatura entre equipos

### 1.2 Descubrimiento

Se identificó que HOPEX expone una **API GraphQL** en el ambiente de Pre-Producción que permite realizar operaciones de lectura (queries) y escritura (mutations) sobre los objetos de arquitectura. Esta API está protegida por un API Key y opera sobre dos módulos principales:

- **ITPM** (IT Portfolio Management) — Gestión de aplicaciones, funcionalidades y owners
- **ITARC** (IT Architecture) — Gestión de sistemas aplicativos, microservicios, infraestructura y relaciones

### 1.3 Objetivo de este Análisis

Documentar el alcance completo de las APIs de HOPEX, validar qué operaciones son posibles vía API, identificar limitaciones, y proponer un modelo de automatización mediante agentes inteligentes que permita reducir significativamente el tiempo y esfuerzo del proceso de alta.

---

## 2. Objetivos

### 2.1 Objetivos del Análisis

1. **Mapear** todos los endpoints disponibles en la API GraphQL de HOPEX
2. **Validar** qué operaciones CRUD son posibles por cada tipo de objeto
3. **Documentar** el flujo completo de alta de un Sistema Aplicativo vía API
4. **Identificar** las limitaciones y operaciones que NO son posibles vía API
5. **Demostrar** con una POC funcional (Cotizador Seguros Mascotas) que el flujo es viable

### 2.2 Objetivos de la Propuesta de Automatización

1. **Diseñar** un portal web que orqueste las llamadas a HOPEX
2. **Proponer** el uso de agentes de IA para pre-llenar los formularios de alta
3. **Estimar** el porcentaje de automatización alcanzable
4. **Definir** la arquitectura de integración portal → agentes → HOPEX

---

## 3. APIs Utilizadas — Detalle Técnico

### 3.1 Configuración Base

```
Base URL:       https://pprod-gnp.hopexcloud.com/HOPEXGraphQL/api
Método:         POST (siempre, tanto queries como mutations)
Content-Type:   application/json
Autenticación:  Header x-api-key: <TOKEN>
Body:           { "query": "...", "variables": {} }
```

### 3.2 Endpoints Disponibles

| Endpoint | Módulo | Descripción |
|----------|--------|-------------|
| `/ITPM` | IT Portfolio Management | Applications, Funcionalidades, Owners, Procesos de Negocio |
| `/ITARC` | IT Architecture | Sistemas Aplicativos, Microservicios, IT Services, Depósitos, Entornos, Service Points |

### 3.3 Operaciones por Tipo de Objeto

#### Módulo ITPM (`/ITPM`)

| Objeto | Query (Leer) | Mutation (Crear) | Mutation (Actualizar) | Mutation (Eliminar) |
|--------|:---:|:---:|:---:|:---:|
| Application | ✅ | ✅ `createApplication` | ✅ `updateApplication` | ❌ |
| Functionality | ✅ | ✅ `createFunctionality` | ✅ | ❌ |
| Business Process | ✅ | — | vincular vía update | ❌ |
| Software Technology | ✅ | — | vincular vía update | ❌ |
| Person (Owners) | ✅ | — | asignar vía update | ❌ |

#### Módulo ITARC (`/ITARC`)

| Objeto | Query (Leer) | Mutation (Crear) | Mutation (Actualizar) | Mutation (Eliminar) |
|--------|:---:|:---:|:---:|:---:|
| ApplicationSystem | ✅ | ✅ `createApplicationSystem` | ✅ `updateApplicationSystem` | ❌ |
| MicroService | ✅ | ✅ `createMicroService` | ✅ | ❌ |
| ITService | ✅ | ✅ `createITService` | ✅ | ❌ |
| RelationalDataArea | ✅ | ✅ `createRelationalDataArea` | ✅ | ❌ |
| NoSQLDataArea | ✅ | ✅ `createNoSQLDataArea` | ✅ | ❌ |
| FileStructure | ✅ | ✅ `createFileStructure` | ✅ | ❌ |
| ApplicationSystemEnvironment | ✅ | ✅ `createApplicationSystemEnvironment` | ✅ | ❌ |
| ServicePoint | ✅ | ✅ `createServicePoint` | ✅ | ❌ |
| ScenarioOfApplicationSystemFlows | ✅ | ✅ `createScenarioOfApplicationSystemFlows` | ✅ | ❌ |

### 3.4 Filtros Disponibles para Queries

| Filtro | Ejemplo | Descripción |
|--------|---------|-------------|
| `name` | `filter: { name: "exacto" }` | Búsqueda por nombre exacto |
| `name_contains` | `filter: { name_contains: "parcial" }` | Búsqueda parcial (like) |
| `id` | `filter: { id: "abc123" }` | Búsqueda por ID |
| `applicationCode` | `filter: { applicationCode: "APP-001" }` | Búsqueda por código |

### 3.5 Campos de Auditoría Disponibles

```graphql
{
  creationDate        # Fecha de creación
  creator { id name } # Quién lo creó
  modificationDate    # Última modificación
  modifier { id name } # Quién lo modificó
}
```

---

## 4. Flujo Completo de Alta (11 Pasos)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE ALTA VÍA API                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. VALIDAR ──→ query { application(filter: {name_contains}) }  │
│       │                                                          │
│       ▼                                                          │
│  2. CREAR APP ──→ mutation { createApplication(...) }            │
│       │                        [ITPM]                            │
│       ▼                                                          │
│  3. CREAR SA ──→ mutation { createApplicationSystem(...) }       │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  4. CREAR MICROSERVICIOS ──→ mutation { createMicroService }×N   │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  5. CREAR IT SERVICES ──→ mutation { createITService }×N         │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  6. CREAR FUNCIONALIDADES ──→ mutation { createFunctionality }×N │
│       │                        [ITPM]                            │
│       ▼                                                          │
│  7. CREAR DEPÓSITOS ──→ mutation { createRelational/NoSQL/File } │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  8. CREAR ENTORNOS ──→ mutation { createAppSystemEnvironment }×3 │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  9. CREAR SERVICE POINTS ──→ mutation { createServicePoint }×N   │
│       │                        [ITARC]                           │
│       ▼                                                          │
│  10. VINCULAR TODO ──→ mutation { updateApplicationSystem }       │
│       │                mutation { updateApplication }             │
│       │                        [ITARC + ITPM]                    │
│       ▼                                                          │
│  11. ASIGNAR OWNERS ──→ mutation { updateApplication }           │
│                                [ITPM]                            │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════  │
│  TOTAL: ~25 llamadas API por sistema aplicativo completo         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Lo que SÍ se puede hacer con las APIs

### 5.1 Creación de Objetos

| # | Operación | Endpoint | Mutation |
|---|-----------|----------|----------|
| 1 | Crear Application | /ITPM | `createApplication` |
| 2 | Crear Sistema Aplicativo | /ITARC | `createApplicationSystem` |
| 3 | Crear Microservicios | /ITARC | `createMicroService` |
| 4 | Crear IT Services (PubSub, Functions, APIs) | /ITARC | `createITService` |
| 5 | Crear Funcionalidades | /ITPM | `createFunctionality` |
| 6 | Crear Depósitos Relacionales (Cloud SQL) | /ITARC | `createRelationalDataArea` |
| 7 | Crear Depósitos NoSQL (Redis, Firestore) | /ITARC | `createNoSQLDataArea` |
| 8 | Crear Depósitos de Archivos (Cloud Storage) | /ITARC | `createFileStructure` |
| 9 | Crear Entornos (QA, UAT, PRO) | /ITARC | `createApplicationSystemEnvironment` |
| 10 | Crear Service Points (endpoints API) | /ITARC | `createServicePoint` |
| 11 | Crear Escenarios de Flujos | /ITARC | `createScenarioOfApplicationSystemFlows` |

### 5.2 Vinculaciones (Relaciones entre objetos)

| # | Vinculación | Endpoint | Vía |
|---|-------------|----------|-----|
| 1 | Application → Sistema Aplicativo | /ITARC | `updateApplicationSystem` |
| 2 | Microservicios → Sistema Aplicativo | /ITARC | `updateApplicationSystem` |
| 3 | Entornos → Sistema Aplicativo | /ITARC | `updateApplicationSystem` |
| 4 | Depósitos → Sistema Aplicativo | /ITARC | `updateApplicationSystem` |
| 5 | Escenarios → Sistema Aplicativo | /ITARC | `updateApplicationSystem` |
| 6 | Funcionalidades → Application | /ITPM | `updateApplication` |
| 7 | Depósitos → Application | /ITPM | `updateApplication` |
| 8 | Tecnologías → Application | /ITPM | `updateApplication` |
| 9 | Stack Tecnológico → Application | /ITPM | `updateApplication` |
| 10 | Proceso de Negocio → Application | /ITPM | `updateApplication` |
| 11 | Application Owner → Application | /ITPM | `updateApplication` |
| 12 | IT Owner → Application | /ITPM | `updateApplication` |
| 13 | Business Owner → Application | /ITPM | `updateApplication` |

### 5.3 Consultas y Validaciones

- ✅ Buscar por nombre exacto o parcial (`name_contains`)
- ✅ Buscar por ID o código de aplicación
- ✅ Consultar quién creó un objeto (`creator { id name }`)
- ✅ Consultar quién modificó un objeto (`modifier { id name }`)
- ✅ Consultar fechas de creación y modificación
- ✅ Listar todos los objetos de un tipo

---

## 6. Lo que NO se puede hacer con las APIs

| # | Limitación | Impacto | Alternativa |
|---|-----------|---------|-------------|
| 1 | **Eliminar objetos** | No se pueden borrar registros erróneos vía API | Solicitar eliminación manual en UI admin |
| 2 | **Auditoría de eliminaciones** | No se sabe quién borró un objeto | Solo visible en Repository Log (UI admin) |
| 3 | **Gestionar permisos/roles** | No se pueden crear usuarios ni asignar permisos | Administración exclusiva en consola |
| 4 | **Acceder al Repository Log** | Historial completo de cambios no expuesto | Solo accesible desde UI de administración |
| 5 | **Generar diagramas/vistas** | Los diagramas de arquitectura no se generan vía API | Solo desde interfaz web de HOPEX |
| 6 | **Ejecutar workflows de aprobación** | El cambio de statusReview a "Approved" requiere UI | Proceso manual de aprobación |
| 7 | **Modificar el schema GraphQL** | El schema es definido por MEGA (proveedor) | No extensible |
| 8 | **Exportar reportes/dashboards** | Los reportes predefinidos no se exportan vía API | Solo desde UI web |
| 9 | **Promover entre ambientes** | Mover objetos de pprod → prod no es posible vía API | Proceso administrado por equipo HOPEX |
| 10 | **Subir archivos adjuntos** | No hay endpoint para attachments | Solo desde UI |

---

## 7. Propuesta de Automatización con Agentes

### 7.1 Visión

Crear un **portal web interno** que, combinado con **agentes de IA**, permita automatizar el proceso de documentación de aplicaciones en HOPEX. El portal sería el punto de entrada donde los equipos de desarrollo registran sus sistemas, y los agentes se encargan de:

1. Pre-llenar los formularios con información extraída de fuentes existentes
2. Validar nomenclatura y consistencia
3. Ejecutar las llamadas API a HOPEX
4. Generar el reporte de lo creado

### 7.2 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PORTAL WEB (GNP)                             │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │Formulario│  │Validación│  │ Creación │  │ Resumen/Estatus  │   │
│  │  de Alta │→ │Existencia│→ │  Objetos │→ │   + Vinculación  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│       ↑                                                              │
└───────┼──────────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────────────┐
│       │              CAPA DE AGENTES DE IA                            │
│       │                                                              │
│  ┌────▼─────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Agente  │  │   Agente    │  │   Agente    │  │   Agente    │  │
│  │Extractor │  │ Nomenclatura│  │  Validador  │  │  Orquestador│  │
│  │de Fuentes│  │  y Estándar │  │ de Duplicados│  │   de APIs   │  │
│  └──────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│       │                                                              │
│  Fuentes:                                                            │
│  • Gitlab (repos, CI/CD)                                             │
│  • GCP Console (proyectos, servicios)                                │
│  • Confluence/Wiki (documentación)                                   │
│  • Terraform/IaC (infraestructura)                                   │
│  • Swagger/OpenAPI (endpoints)                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    HOPEX GraphQL API                                   │
│                                                                       │
│  POST /ITPM    ←── queries + mutations (Application, Funcionalidades) │
│  POST /ITARC   ←── queries + mutations (SA, Microservicios, Infra)    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.3 Agentes Propuestos

| Agente | Función | Fuente de Datos | Output |
|--------|---------|-----------------|--------|
| **Extractor** | Obtiene info del sistema desde fuentes existentes | Gitlab, GCP, Terraform, Swagger | JSON con datos pre-llenados |
| **Nomenclatura** | Aplica estándares de nombres GNP | Catálogo de nomenclatura | Nombres normalizados |
| **Validador** | Verifica que no existan duplicados en HOPEX | API HOPEX (queries) | OK / Alerta de duplicado |
| **Orquestador** | Ejecuta el flujo de 11 pasos en orden | Portal + API HOPEX | Objetos creados + IDs |

### 7.4 Flujo con Agentes

```
1. Desarrollador ingresa al portal y proporciona:
   - Nombre del proyecto
   - Repo de Gitlab
   - Proyecto GCP

2. Agente Extractor analiza:
   - Gitlab → detecta microservicios, URLs, lenguajes
   - GCP → detecta Cloud Run, PubSub, Cloud SQL, Redis, Buckets
   - Swagger → detecta endpoints (Service Points)
   - Terraform → detecta entornos y configuración

3. Agente Nomenclatura normaliza:
   - Aplica prefijos (SA-, APP-, ms-)
   - Genera códigos según estándar GNP
   - Formatea comentarios con estructura esperada

4. Agente Validador consulta HOPEX:
   - Busca por nombre parcial si ya existe
   - Alerta si hay duplicados potenciales
   - Sugiere vincular a objetos existentes

5. Portal muestra formulario PRE-LLENADO:
   - El usuario solo revisa y ajusta
   - Aprueba con un clic

6. Agente Orquestador ejecuta:
   - Los 11 pasos en secuencia
   - Maneja errores y reintentos
   - Genera reporte final con IDs
```

### 7.5 Estimación de Automatización

| Paso | Manual (hoy) | Con Portal + Agentes | % Automatizado |
|------|:---:|:---:|:---:|
| 1. Validación | 10 min | Automático | **100%** |
| 2. Crear Application | 15 min | Pre-llenado, 1 clic | **90%** |
| 3. Crear SA | 10 min | Pre-llenado, 1 clic | **90%** |
| 4. Crear Microservicios | 20 min | Auto-detectado de Gitlab/GCP | **95%** |
| 5. Crear IT Services | 15 min | Auto-detectado de GCP | **95%** |
| 6. Crear Funcionalidades | 20 min | Sugerido por agente desde Swagger | **80%** |
| 7. Crear Depósitos | 15 min | Auto-detectado de GCP/Terraform | **95%** |
| 8. Crear Entornos | 10 min | Auto-detectado de GCP | **100%** |
| 9. Crear Service Points | 15 min | Auto-detectado de Swagger/OpenAPI | **100%** |
| 10. Vincular todo | 20 min | Automático | **100%** |
| 11. Asignar Owners | 10 min | Sugerido por agente | **70%** |
| **TOTAL** | **~2.5 horas** | **~15 minutos** | **~90%** |

### 7.6 Beneficios Esperados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo por alta | 2-4 horas | 10-15 minutos | **90% reducción** |
| Errores de captura | ~15% | <2% | **87% reducción** |
| Consistencia nomenclatura | Variable | Estandarizada | **100%** |
| Dependencia de personas | Alta | Baja | Autoservicio |
| Cobertura de documentación | ~60% | >95% | **+35%** |

---

## 8. Próximos Pasos

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Validar POC con equipo de arquitectura | Aaron Delgado | Semana 1 |
| 2 | Obtener API Key de Producción | Equipo HOPEX | Semana 2 |
| 3 | Desarrollar portal web v1 (sin agentes) | Equipo ITA | Semana 3-4 |
| 4 | Integrar agente extractor (Gitlab + GCP) | Equipo ITA | Semana 5-6 |
| 5 | Piloto con 3 sistemas reales | Equipos de desarrollo | Semana 7-8 |
| 6 | Rollout a todos los equipos | Coordinación | Semana 9-10 |

---

## 9. Conclusiones

1. **La API de HOPEX es funcional** para automatizar el 90% del proceso de alta de sistemas aplicativos.

2. **Las limitaciones principales** (no eliminar, no aprobar workflows) son manejables con procesos complementarios.

3. **El modelo de agentes** permite reducir el tiempo de alta de 2.5 horas a 15 minutos, con mayor calidad y consistencia.

4. **La inversión se justifica** considerando que GNP tiene cientos de sistemas por documentar y el proceso actual es un cuello de botella.

5. **La POC está validada** con el ejemplo de Cotizador Seguros (Mascotas → Vivienda) y lista para escalar.

---

## Anexo A — Ejemplo de Request/Response

### Crear Application

**Request:**
```json
{
  "query": "mutation { createApplication(application: { name: \"Cotizador Seguros Vivienda API\" applicationCode: \"APP-CSV-API-001\" cloudComputing: Cloud_PaaS applicationType: InHouseApplication statusReview: UpdateInProgress comment: \"API REST para cotización de seguros de vivienda\" }) { id name applicationCode } }",
  "variables": {}
}
```

**Response:**
```json
{
  "data": {
    "createApplication": {
      "id": "8pTZ8191g5EE",
      "name": "Cotizador Seguros Vivienda API",
      "applicationCode": "APP-CSV-API-001"
    }
  }
}
```

### Vincular Microservicios al SA

**Request:**
```json
{
  "query": "mutation { updateApplicationSystem(id: \"SA_ID\" applicationSystem: { microService_ReferencedMicroService_MicroServiceSystemComponent_OwnedSystemMicroServiceComponent: { action: ADD list: [{ id: \"MS_ID_1\" }, { id: \"MS_ID_2\" }] } }) { id name } }",
  "variables": {}
}
```

---

## Anexo B — Nomenclatura Estándar GNP

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Application | `[Nombre descriptivo] API/Front/BFF` | Cotizador Seguros Vivienda API |
| Código App | `APP-[SIGLAS]-[TIPO]-[NUM]` | APP-CSV-API-001 |
| Sistema Aplicativo | `SA [Nombre descriptivo]` | SA Cotizador Seguros Vivienda |
| Código SA | `SA-[SIGLAS]-[NUM]` | SA-CSV-001 |
| Microservicio | `ms-[proyecto]-[función]` | ms-cotizador-vivienda-pricing |
| IT Service | `[Servicio] (gnp-[proyecto])` | PubSub (gnp-vivienda) |
| Entorno | `[ENV] - [Nombre]` | QA - Cotizador Vivienda |
| Depósito | `[Nombre] - [Tecnología]` | Cotizador Vivienda - Cloud SQL |
| Service Point | `[MÉTODO] /api/v1/[recurso]` | POST /api/v1/cotizaciones/vivienda |

---

*Documento generado como parte de la POC de automatización HOPEX — GNP 2026*
