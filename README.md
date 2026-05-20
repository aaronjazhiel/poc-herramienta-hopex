# POC Herramienta HOPEX — Alta de Sistema Aplicativo vía API GraphQL

## GNP Seguros — Dirección de Sistemas / Oficina de Arquitectura

Portal web interactivo que demuestra paso a paso cómo registrar un Sistema Aplicativo completo en HOPEX ITA utilizando las APIs GraphQL.

## Ejecución

```bash
pip3 install -r requirements.txt
export HOPEX_TOKEN="<tu_api_key>"
python3 app.py
# Abrir http://localhost:8080
```

## APIs Utilizadas

| API | Endpoint | Función |
|---|---|---|
| ITPM | `/HOPEXGraphQL/api/ITPM` | Portfolio: aplicaciones, owners, procesos, tecnologías |
| ITARC | `/HOPEXGraphQL/api/ITARC` | Arquitectura: sistemas aplicativos, microservicios, servicios TI, entornos |

## Flujo de 11 Pasos

1. Validar existencia
2. Crear Application (ITPM)
3. Crear Sistema Aplicativo (ITARC) + auto-vincula App
4. Crear Microservicios (ITARC) + auto-vincula al SA
5. Crear IT Services (ITARC)
6. Crear Funcionalidades (ITPM) + auto-vincula a App y SA
7. Crear Depósitos de Datos (ITARC) + auto-vincula al SA y App
8. Crear Entornos (ITARC) + auto-vincula al SA
9. Crear Service Points (ITARC)
10. Vincular componentes (manual si se requiere)
11. Estatus final y resumen

## Cobertura

- **~90%** del lineamiento GNP cubierto vía API
- **< 5 minutos** por aplicación (vs 2-4 horas manual)
- **36 objetos** creados por POC

## Estructura

```
├── app.py                  # Backend Flask (13 rutas API)
├── requirements.txt        # flask, flask-cors, requests
├── static/
│   ├── css/gnp-style.css   # Estilos GNP
│   └── js/app.js           # Lógica frontend + auto-vinculación
├── templates/              # 11 pasos + intro + base
└── docs/                   # Documentación técnica
```

## Autor

Aaron Delgado — Arquitecto de Integraciones — 2026
