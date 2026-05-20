"""
HOPEX Alta de Sistema Aplicativo - Backend API Completo
Estilo GNP | POC Mascotas | 11 Pasos
Autor: Aaron Delgado - 2026
"""
import os
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import requests as http_requests

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Configuración HOPEX — usar: export HOPEX_TOKEN="tu_api_key"
HOPEX_BASE = "https://pprod-gnp.hopexcloud.com/HOPEXGraphQL/api"
API_KEY = os.environ.get("HOPEX_TOKEN", "")

def get_headers():
    return {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }


def hopex_query(endpoint, query):
    """Ejecuta query/mutation GraphQL contra HOPEX."""
    url = f"{HOPEX_BASE}/{endpoint}"
    payload = {"query": query, "variables": {}}
    try:
        r = http_requests.post(url, json=payload, headers=get_headers(), timeout=30)
        if r.status_code == 401:
            return {"status": 401, "error": "API Key inválida o no proporcionada"}
        if not r.text.strip():
            return {"status": r.status_code, "error": "Respuesta vacía de HOPEX"}
        return {"status": r.status_code, "data": r.json()}
    except http_requests.exceptions.Timeout:
        return {"status": 408, "error": "Timeout — HOPEX no respondió en 30s"}
    except http_requests.exceptions.ConnectionError:
        return {"status": 503, "error": "No se pudo conectar a HOPEX"}
    except Exception as e:
        return {"status": 500, "error": str(e)}


# ─── RUTAS PRINCIPALES ───────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── PASO 1: VALIDACIÓN ──────────────────────────────────

@app.route("/api/validar", methods=["POST"])
def validar():
    """Validar si existe la aplicación, sistema, microservicio, etc."""
    body = request.json
    nombre = body.get("nombre", "")
    tipo = body.get("tipo", "application")

    query = f'''query {{
  {tipo}(filter: {{ name_contains: "{nombre}" }}) {{
    id
    name
    creationDate
    creator {{ id name }}
  }}
}}'''
    endpoint = "ITPM" if tipo in ("application", "functionality") else "ITARC"
    return jsonify(hopex_query(endpoint, query))


# ─── PASO 2: CREAR APPLICATION (ITPM) ────────────────────

@app.route("/api/crear-application", methods=["POST"])
def crear_application():
    body = request.json
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')
    query = f'''mutation {{
  createApplication(application: {{
    name: "{body['name']}"
    applicationCode: "{body['code']}"
    cloudComputing: {body.get('cloud', 'Cloud_PaaS')}
    applicationType: InHouseApplication
    statusReview: UpdateInProgress
    comment: "{comment}"
  }}) {{
    id
    name
    applicationCode
    cloudComputing
    applicationType
    statusReview
  }}
}}'''
    return jsonify(hopex_query("ITPM", query))


# ─── PASO 3: CREAR SISTEMA APLICATIVO (ITARC) ────────────

@app.route("/api/crear-sistema", methods=["POST"])
def crear_sistema():
    body = request.json
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')
    query = f'''mutation {{
  createApplicationSystem(applicationSystem: {{
    name: "{body['name']}"
    applicationCode: "{body['code']}"
    cloudComputing: {body.get('cloud', 'Cloud_PaaS')}
    statusReview: UpdateInProgress
    comment: "{comment}"
  }}) {{
    id
    name
    applicationCode
    cloudComputing
    statusReview
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 4: CREAR MICROSERVICIOS (ITARC) ────────────────

@app.route("/api/crear-microservicio", methods=["POST"])
def crear_microservicio():
    body = request.json
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')
    query = f'''mutation {{
  createMicroService(microService: {{
    name: "{body['name']}"
    comment: "{comment}"
  }}) {{
    id
    name
    comment
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 5: CREAR IT SERVICES (ITARC) ───────────────────

@app.route("/api/crear-itservice", methods=["POST"])
def crear_itservice():
    body = request.json
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')
    query = f'''mutation {{
  createITService(iTService: {{
    name: "{body['name']}"
    comment: "{comment}"
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 6: CREAR FUNCIONALIDADES (ITPM) ────────────────

@app.route("/api/crear-funcionalidad", methods=["POST"])
def crear_funcionalidad():
    body = request.json
    query = f'''mutation {{
  createFunctionality(functionality: {{
    name: "{body['name']}"
    comment: "{body.get('comment', '').replace('"', '\\"')}"
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITPM", query))


# ─── PASO 7: CREAR DEPÓSITOS DE DATOS (ITARC) ────────────

@app.route("/api/crear-deposito", methods=["POST"])
def crear_deposito():
    body = request.json
    tipo = body.get("tipo", "relational")  # relational | nosql | file
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')

    mutations = {
        "relational": f'''mutation {{
  createRelationalDataArea(relationalDataArea: {{
    name: "{body['name']}"
    comment: "{comment}"
  }}) {{
    id
    name
  }}
}}''',
        "nosql": f'''mutation {{
  createNoSQLDataArea(noSQLDataArea: {{
    name: "{body['name']}"
    comment: "{comment}"
  }}) {{
    id
    name
  }}
}}''',
        "file": f'''mutation {{
  createFileStructure(fileStructure: {{
    name: "{body['name']}"
    comment: "{comment}"
  }}) {{
    id
    name
  }}
}}'''
    }
    query = mutations.get(tipo, mutations["relational"])
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 8: CREAR ENTORNOS (ITARC) ──────────────────────

@app.route("/api/crear-entorno", methods=["POST"])
def crear_entorno():
    body = request.json
    comment = body.get('comment', '').replace('"', '\\"').replace('\n', '\\n')
    query = f'''mutation {{
  createApplicationSystemEnvironment(applicationSystemEnvironment: {{
    name: "{body['name']}"
    statusReview: UpdateInProgress
    comment: "{comment}"
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 9: CREAR SERVICE POINTS (ITARC) ────────────────

@app.route("/api/crear-servicepoint", methods=["POST"])
def crear_servicepoint():
    body = request.json
    query = f'''mutation {{
  createServicePoint(servicePoint: {{
    name: "{body['name']}"
    comment: "{body.get('comment', '').replace('"', '\\"')}"
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 10: CREAR ESCENARIO DE FLUJOS (ITARC) ──────────

@app.route("/api/crear-escenario", methods=["POST"])
def crear_escenario():
    body = request.json
    query = f'''mutation {{
  createScenarioOfApplicationSystemFlows(scenarioOfApplicationSystemFlows: {{
    name: "{body['name']}"
    comment: "{body.get('comment', '').replace('"', '\\"')}"
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 11: VINCULAR COMPONENTES AL SA (ITARC) ─────────

@app.route("/api/vincular-sa", methods=["POST"])
def vincular_sa():
    """Vincular objetos al Sistema Aplicativo."""
    body = request.json
    sa_id = body["sa_id"]
    vinculacion = body["vinculacion"]  # tipo de vinculación
    ids = body["ids"]  # lista de IDs a vincular

    id_list = ", ".join([f'{{ id: "{i}" }}' for i in ids])

    relaciones = {
        "application": "application_ApplicationUsed_ApplicationComponent_OwnedApplicationComponent",
        "microservicio": "microService_ReferencedMicroService_MicroServiceSystemComponent_OwnedSystemMicroServiceComponent",
        "entorno": "applicationSystemEnvironment_OwnerApplicationSystem_ApplicationSystemUse_ApplicationSystemUse",
        "deposito_relacional": "relationalDataArea_ReferencedPhysicalDataArea_PhysicalLocalDataStore_OwnedPhysicalLocalStore",
        "deposito_nosql": "noSQLDataArea_ReferencedPhysicalDataArea_PhysicalLocalDataStore_OwnedPhysicalLocalStore",
        "deposito_file": "fileStructure_ReferencedPhysicalDataArea_PhysicalLocalDataStore_OwnedPhysicalLocalStore",
        "escenario": "scenarioOfApplicationSystemFlows_OwnerApplicationSystemScenario_ApplicationSystemParticipant_ApplicationSystemParticipant",
        "funcionalidad": "functionality",
    }

    rel = relaciones.get(vinculacion)
    if not rel:
        return jsonify({"status": 400, "error": f"Vinculación '{vinculacion}' no válida. Opciones: {list(relaciones.keys())}"})

    query = f'''mutation {{
  updateApplicationSystem(id: "{sa_id}" applicationSystem: {{
    {rel}: {{
      action: ADD
      list: [{id_list}]
    }}
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITARC", query))


# ─── PASO 12: VINCULAR RELACIONES A LA APP (ITPM) ────────

@app.route("/api/vincular-app", methods=["POST"])
def vincular_app():
    """Vincular objetos a la Application."""
    body = request.json
    app_id = body["app_id"]
    vinculacion = body["vinculacion"]
    ids = body["ids"]

    id_list = ", ".join([f'{{ id: "{i}" }}' for i in ids])

    relaciones = {
        "proceso_negocio": "businessProcess",
        "stack": "softwareTechnologyStack",
        "tecnologia": "softwareTechnology_UsedTechnology",
        "funcionalidad": "functionality",
        "deposito": "applicationDataArea",
    }

    rel = relaciones.get(vinculacion)
    if not rel:
        return jsonify({"status": 400, "error": f"Vinculación '{vinculacion}' no válida. Opciones: {list(relaciones.keys())}"})

    query = f'''mutation {{
  updateApplication(id: "{app_id}" application: {{
    {rel}: {{
      action: ADD
      list: [{id_list}]
    }}
  }}) {{
    id
    name
  }}
}}'''
    return jsonify(hopex_query("ITPM", query))


# ─── PASO 13: ASIGNAR OWNERS (ITPM) ──────────────────────

@app.route("/api/asignar-owners", methods=["POST"])
def asignar_owners():
    """Asignar Application Owner, IT Owner y Business Owner."""
    body = request.json
    app_id = body["app_id"]

    parts = []
    if body.get("app_owner_id"):
        parts.append(f'applicationOwner_PersonSystem: {{ action: ADD, list: [{{ id: "{body["app_owner_id"]}" }}] }}')
    if body.get("it_owner_id"):
        parts.append(f'iTOwner_PersonSystem: {{ action: ADD, list: [{{ id: "{body["it_owner_id"]}" }}] }}')
    if body.get("biz_owner_id"):
        parts.append(f'businessOwner_PersonSystem: {{ action: ADD, list: [{{ id: "{body["biz_owner_id"]}" }}] }}')

    if not parts:
        return jsonify({"status": 400, "error": "Debes proporcionar al menos un owner"})

    query = f'''mutation {{
  updateApplication(id: "{app_id}" application: {{
    {chr(10).join(parts)}
  }}) {{
    id
    name
    applicationOwner_PersonSystem {{ id name }}
    iTOwner_PersonSystem {{ id name }}
    businessOwner_PersonSystem {{ id name }}
  }}
}}'''
    return jsonify(hopex_query("ITPM", query))


# ─── CONSULTAR ESTATUS ────────────────────────────────────

@app.route("/api/estatus/<objeto_id>", methods=["GET"])
def estatus(objeto_id):
    tipo = request.args.get("tipo", "application")
    query = f'''query {{
  {tipo}(filter: {{ id: "{objeto_id}" }}) {{
    id
    name
    statusReview
    creationDate
    creator {{ id name }}
    modificationDate
    modifier {{ id name }}
  }}
}}'''
    endpoint = "ITPM" if tipo in ("application", "functionality") else "ITARC"
    return jsonify(hopex_query(endpoint, query))


# ─── HEALTH CHECK ─────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    """Verificar conexión con HOPEX."""
    has_key = bool(API_KEY)
    if not has_key:
        return jsonify({"status": "error", "message": "HOPEX_TOKEN no configurado. Ejecuta: export HOPEX_TOKEN='tu_key'"})

    # Test rápido
    result = hopex_query("ITPM", "query { application(filter: { name: \"__test__\" }) { id } }")
    if result.get("error"):
        return jsonify({"status": "error", "message": result["error"]})
    return jsonify({"status": "ok", "message": "Conexión exitosa con HOPEX", "api_key_configured": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    if not API_KEY:
        print("\n⚠️  HOPEX_TOKEN no está configurado!")
        print("   Ejecuta: export HOPEX_TOKEN='tu_api_key'")
        print("   Luego vuelve a correr: python3 app.py\n")
    else:
        print(f"\n✅ HOPEX_TOKEN configurado ({API_KEY[:8]}...)")
    print(f"🚀 Servidor en http://localhost:{port}\n")
    app.run(debug=False, host='0.0.0.0', port=port)
