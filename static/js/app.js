/**
 * HOPEX Alta de Sistema - Frontend Logic
 * GNP Style | POC Cotizador Autos | 11 Pasos
 */

const API_BASE = "";
let currentStep = 0; // 0 = intro
let createdObjects = { app: null, sa: null, ms: [], its: [], func: [], dep: [], env: [], sp: [] };

// ─── NAVEGACIÓN ───────────────────────────────────────────

function goToStep(step) {
  document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');

  document.querySelectorAll('.step-circle').forEach(c => {
    const s = parseInt(c.dataset.step);
    c.classList.remove('active', 'completed');
    if (s < step) c.classList.add('completed');
    else if (s === step) c.classList.add('active');
  });

  document.querySelectorAll('.step-label').forEach((label, i) => {
    label.classList.remove('active', 'completed');
    if (i + 1 < step) label.classList.add('completed');
    else if (i + 1 === step) label.classList.add('active');
  });

  for (let i = 1; i <= 10; i++) {
    const conn = document.getElementById(`conn-${i}`);
    if (conn) conn.classList.toggle('completed', i < step);
  }

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function iniciarProceso() {
  document.getElementById('step-intro').classList.remove('active');
  goToStep(1);
  document.getElementById('stepper').style.display = 'flex';
}

// ─── PASO 1: VALIDACIÓN ───────────────────────────────────

function updateValidationPreview() {
  const tipo = document.getElementById('val-tipo').value;
  const nombre = document.getElementById('val-nombre').value || '...';
  const endpoint = (tipo === 'application' || tipo === 'functionality') ? 'ITPM' : 'ITARC';
  document.getElementById('val-endpoint-display').textContent = endpoint;
  document.getElementById('val-query-preview').textContent = `query {\n  ${tipo}(filter: { name_contains: "${nombre}" }) {\n    id\n    name\n    creationDate\n    creator { id name }\n  }\n}`;
}

async function ejecutarValidacion() {
  const tipo = document.getElementById('val-tipo').value;
  const nombre = document.getElementById('val-nombre').value;
  if (!nombre) { alert('Ingresa un nombre para buscar'); return; }

  showSpinner('val-spinner');
  try {
    const res = await fetch(`${API_BASE}/api/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tipo })
    });
    const data = await res.json();
    showResult('val', data);

    const items = data?.data?.[tipo] || [];
    const badge = document.getElementById('val-result-badge');
    if (items.length > 0) {
      badge.className = 'badge badge-warning';
      badge.textContent = '⚠️ Ya existe — Cuidado al crear';
    } else {
      badge.className = 'badge badge-success';
      badge.textContent = '✅ No existe — Puede crearse';
    }
    markTimelineSuccess(1, `Validación completada: ${items.length} resultado(s)`);
  } catch (e) {
    showResult('val', { error: e.message });
  }
  hideSpinner('val-spinner');
}

// ─── PASO 2: CREAR APPLICATION ────────────────────────────

async function crearApplication() {
  const name = document.getElementById('app-name').value;
  const code = document.getElementById('app-code').value;
  const cloud = document.getElementById('app-cloud').value;
  const comment = document.getElementById('app-comment').value;
  if (!name || !code) { alert('Nombre y Código son obligatorios'); return; }

  showSpinner('app-spinner');
  try {
    const res = await fetch(`${API_BASE}/api/crear-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, cloud, comment })
    });
    const data = await res.json();
    showResult('app', data);

    const created = data?.data?.data?.createApplication;
    if (created) {
      createdObjects.app = created;
      addToStatusTable('Application', created.name, created.id);
      markTimelineSuccess(2, `${created.name} (${created.id})`);
      // Auto-fill vincular
      const el = document.getElementById('vinc-app-id');
      if (el) el.value = created.id;
      const el2 = document.getElementById('owner-app-id');
      if (el2) el2.value = created.id;
    }
  } catch (e) { showResult('app', { error: e.message }); }
  hideSpinner('app-spinner');
}

// ─── PASO 3: CREAR SISTEMA APLICATIVO ─────────────────────

async function crearSistema() {
  const name = document.getElementById('sa-name').value;
  const code = document.getElementById('sa-code').value;
  const cloud = document.getElementById('sa-cloud').value;
  const comment = document.getElementById('sa-comment').value;
  if (!name || !code) { alert('Nombre y Código son obligatorios'); return; }

  showSpinner('sa-spinner');
  try {
    const res = await fetch(`${API_BASE}/api/crear-sistema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, cloud, comment })
    });
    const data = await res.json();
    showResult('sa', data);

    const created = data?.data?.data?.createApplicationSystem;
    if (created) {
      createdObjects.sa = created;
      addToStatusTable('Sistema Aplicativo', created.name, created.id);
      markTimelineSuccess(3, `${created.name} (${created.id})`);
      const el = document.getElementById('vinc-sa-id');
      if (el) el.value = created.id;

      // AUTO-VINCULAR la App como componente del SA si ya existe
      if (createdObjects.app) {
        try {
          const vincRes = await fetch(`${API_BASE}/api/vincular-sa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sa_id: created.id, vinculacion: 'application', ids: [createdObjects.app.id] })
          });
          const vincData = await vincRes.json();
          showResult('sa', { ...data, vinculacion: vincData });
        } catch (e) { /* silencioso */ }
      }
    }
  } catch (e) { showResult('sa', { error: e.message }); }
  hideSpinner('sa-spinner');
}

// ─── PASO 4: CREAR MICROSERVICIOS ─────────────────────────

function agregarMicroservicio() {
  const container = document.getElementById('ms-container');
  const entry = document.createElement('div');
  entry.className = 'ms-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `
    <div class="form-row"><div class="form-group"><label>Nombre *</label><input type="text" class="ms-name" placeholder="ms-cotizador-autos-..."></div><div class="form-group"><label>Cloud Run</label><input type="text" class="ms-service" placeholder="nombre-service"></div></div>
    <div class="form-row"><div class="form-group"><label>URL QA</label><input type="text" class="ms-url-qa" placeholder="https://qa.gnp.com.mx/..."></div><div class="form-group"><label>URL PRO</label><input type="text" class="ms-url-pro" placeholder="https://app.gnp.com.mx/..."></div></div>
    <div class="form-group"><label>Gitlab</label><input type="text" class="ms-gitlab" placeholder="https://gitlab.gnp.com.mx/..."></div>
    <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️ Eliminar</button>`;
  container.appendChild(entry);
}

async function crearMicroservicios() {
  const entries = document.querySelectorAll('.ms-entry');
  showSpinner('ms-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.ms-name').value;
    if (!name) continue;
    const service = entry.querySelector('.ms-service').value;
    const urlQa = entry.querySelector('.ms-url-qa').value;
    const urlPro = entry.querySelector('.ms-url-pro').value;
    const gitlab = entry.querySelector('.ms-gitlab').value;
    const comment = `Microservicio: ${name}\nCloud Run: ${service}\nGitlab: ${gitlab}\nURL QA: ${urlQa}\nURL PRO: ${urlPro}`;

    try {
      const res = await fetch(`${API_BASE}/api/crear-microservicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const created = data?.data?.data?.createMicroService;
      if (created) {
        createdObjects.ms.push(created);
        addToStatusTable('Microservicio', created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  // AUTO-VINCULAR microservicios al SA si ya existe
  if (createdObjects.sa && createdObjects.ms.length > 0) {
    const ids = createdObjects.ms.map(m => m.id);
    try {
      const res = await fetch(`${API_BASE}/api/vincular-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sa_id: createdObjects.sa.id, vinculacion: 'microservicio', ids })
      });
      const vincData = await res.json();
      results.push({ name: '🔗 Vinculación MS → SA', response: vincData });
    } catch (e) { results.push({ name: '🔗 Vinculación MS → SA', error: e.message }); }
  }

  showResult('ms', results);
  if (createdObjects.ms.length > 0) markTimelineSuccess(4, `${createdObjects.ms.length} microservicio(s) creados y vinculados al SA`);
  hideSpinner('ms-spinner');
}

// ─── PASO 5: CREAR IT SERVICES ────────────────────────────

function agregarITService() {
  const container = document.getElementById('its-container');
  const entry = document.createElement('div');
  entry.className = 'its-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `<div class="form-group"><label>Nombre *</label><input type="text" class="its-name" placeholder="Nombre del servicio"></div><div class="form-group"><label>Comentario</label><textarea class="its-comment" placeholder="Detalle..."></textarea></div><button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️</button>`;
  container.appendChild(entry);
}

async function crearITServices() {
  const entries = document.querySelectorAll('.its-entry');
  showSpinner('its-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.its-name').value;
    if (!name) continue;
    const comment = entry.querySelector('.its-comment').value;

    try {
      const res = await fetch(`${API_BASE}/api/crear-itservice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const created = data?.data?.data?.createITService;
      if (created) {
        createdObjects.its.push(created);
        addToStatusTable('IT Service', created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  showResult('its', results);
  if (createdObjects.its.length > 0) markTimelineSuccess(5, `${createdObjects.its.length} IT Service(s) creados`);
  hideSpinner('its-spinner');
}

// ─── PASO 6: CREAR FUNCIONALIDADES ────────────────────────

function agregarFuncionalidad() {
  const container = document.getElementById('func-container');
  const entry = document.createElement('div');
  entry.className = 'func-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `<div class="form-row"><div class="form-group"><label>Funcionalidad *</label><input type="text" class="func-name" placeholder="Nombre"></div><div class="form-group"><label>Descripción</label><input type="text" class="func-comment" placeholder="Descripción"></div></div><button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️</button>`;
  container.appendChild(entry);
}

async function crearFuncionalidades() {
  const entries = document.querySelectorAll('.func-entry');
  showSpinner('func-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.func-name').value;
    if (!name) continue;
    const comment = entry.querySelector('.func-comment').value;

    try {
      const res = await fetch(`${API_BASE}/api/crear-funcionalidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const created = data?.data?.data?.createFunctionality;
      if (created) {
        createdObjects.func.push(created);
        addToStatusTable('Funcionalidad', created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  // AUTO-VINCULAR funcionalidades a la App Y al SA
  if (createdObjects.func.length > 0) {
    const ids = createdObjects.func.map(f => f.id);
    
    // Vincular a la Application
    if (createdObjects.app) {
      try {
        const res = await fetch(`${API_BASE}/api/vincular-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: createdObjects.app.id, vinculacion: 'funcionalidad', ids })
        });
        const vincData = await res.json();
        results.push({ name: '🔗 Funcionalidades → App', response: vincData });
      } catch (e) { results.push({ name: '🔗 Funcionalidades → App', error: e.message }); }
    }

    // Vincular al SA (funcionalidades del perímetro funcional)
    if (createdObjects.sa) {
      try {
        const res = await fetch(`${API_BASE}/api/vincular-sa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sa_id: createdObjects.sa.id, vinculacion: 'funcionalidad', ids })
        });
        const vincData = await res.json();
        results.push({ name: '🔗 Funcionalidades → SA', response: vincData });
      } catch (e) { results.push({ name: '🔗 Funcionalidades → SA', error: e.message }); }
    }
  }

  showResult('func', results);
  if (createdObjects.func.length > 0) markTimelineSuccess(6, `${createdObjects.func.length} funcionalidad(es) creadas y vinculadas`);
  hideSpinner('func-spinner');
}

// ─── PASO 7: CREAR DEPÓSITOS ──────────────────────────────

function agregarDeposito() {
  const container = document.getElementById('dep-container');
  const entry = document.createElement('div');
  entry.className = 'dep-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `<div class="form-row"><div class="form-group"><label>Nombre *</label><input type="text" class="dep-name" placeholder="Nombre"></div><div class="form-group"><label>Tipo *</label><select class="dep-tipo"><option value="relational">Relacional</option><option value="nosql">NoSQL</option><option value="file">Archivos</option></select></div></div><div class="form-group"><label>Detalle</label><textarea class="dep-comment" placeholder="Conexión..."></textarea></div><button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️</button>`;
  container.appendChild(entry);
}

async function crearDepositos() {
  const entries = document.querySelectorAll('.dep-entry');
  showSpinner('dep-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.dep-name').value;
    if (!name) continue;
    const tipo = entry.querySelector('.dep-tipo').value;
    const comment = entry.querySelector('.dep-comment').value;

    try {
      const res = await fetch(`${API_BASE}/api/crear-deposito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tipo, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const mutName = tipo === 'relational' ? 'createRelationalDataArea' : tipo === 'nosql' ? 'createNoSQLDataArea' : 'createFileStructure';
      const created = data?.data?.data?.[mutName];
      if (created) {
        createdObjects.dep.push({ ...created, tipo });
        addToStatusTable(`Depósito (${tipo})`, created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  // AUTO-VINCULAR depósitos al SA por tipo
  if (createdObjects.sa && createdObjects.dep.length > 0) {
    for (const dep of createdObjects.dep) {
      const tipoVinc = dep.tipo === 'relational' ? 'deposito_relacional' : dep.tipo === 'nosql' ? 'deposito_nosql' : 'deposito_file';
      try {
        const res = await fetch(`${API_BASE}/api/vincular-sa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sa_id: createdObjects.sa.id, vinculacion: tipoVinc, ids: [dep.id] })
        });
        const vincData = await res.json();
        results.push({ name: `🔗 ${dep.name} → SA`, response: vincData });
      } catch (e) { results.push({ name: `🔗 ${dep.name} → SA`, error: e.message }); }
    }

    // También vincular a la App (como applicationDataArea genérico)
    if (createdObjects.app) {
      const ids = createdObjects.dep.map(d => d.id);
      try {
        const res = await fetch(`${API_BASE}/api/vincular-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: createdObjects.app.id, vinculacion: 'deposito', ids })
        });
        const vincData = await res.json();
        results.push({ name: '🔗 Depósitos → App', response: vincData });
      } catch (e) { results.push({ name: '🔗 Depósitos → App', error: e.message }); }
    }
  }

  showResult('dep', results);
  if (createdObjects.dep.length > 0) markTimelineSuccess(7, `${createdObjects.dep.length} depósito(s) creados y vinculados`);
  hideSpinner('dep-spinner');
}

// ─── PASO 8: CREAR ENTORNOS ──────────────────────────────

function agregarEntorno() {
  const container = document.getElementById('env-container');
  const entry = document.createElement('div');
  entry.className = 'env-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `<div class="form-row"><div class="form-group"><label>Nombre *</label><input type="text" class="env-name" placeholder="ENV - Nombre"></div><div class="form-group"><label>Proyecto GCP</label><input type="text" class="env-gcp" placeholder="gnp-proyecto-env"></div></div><button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️</button>`;
  container.appendChild(entry);
}

async function crearEntornos() {
  const entries = document.querySelectorAll('.env-entry');
  showSpinner('env-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.env-name').value;
    if (!name) continue;
    const gcp = entry.querySelector('.env-gcp').value;
    const comment = `Ambiente: ${name}\nProyecto GCP: ${gcp}`;

    try {
      const res = await fetch(`${API_BASE}/api/crear-entorno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const created = data?.data?.data?.createApplicationSystemEnvironment;
      if (created) {
        createdObjects.env.push(created);
        addToStatusTable('Entorno', created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  // AUTO-VINCULAR entornos al SA
  if (createdObjects.sa && createdObjects.env.length > 0) {
    const ids = createdObjects.env.map(e => e.id);
    try {
      const res = await fetch(`${API_BASE}/api/vincular-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sa_id: createdObjects.sa.id, vinculacion: 'entorno', ids })
      });
      const vincData = await res.json();
      results.push({ name: '🔗 Entornos → SA', response: vincData });
    } catch (e) { results.push({ name: '🔗 Entornos → SA', error: e.message }); }
  }

  showResult('env', results);
  if (createdObjects.env.length > 0) markTimelineSuccess(8, `${createdObjects.env.length} entorno(s) creados y vinculados al SA`);
  hideSpinner('env-spinner');
}

// ─── PASO 9: CREAR SERVICE POINTS ─────────────────────────

function agregarServicePoint() {
  const container = document.getElementById('sp-container');
  const entry = document.createElement('div');
  entry.className = 'sp-entry';
  entry.style.cssText = 'border:1px solid #E8E8F0; border-radius:8px; padding:20px; margin-bottom:16px;';
  entry.innerHTML = `<div class="form-row"><div class="form-group"><label>Endpoint *</label><input type="text" class="sp-name" placeholder="GET /api/v1/..."></div><div class="form-group"><label>Descripción</label><input type="text" class="sp-comment" placeholder="Descripción"></div></div><button class="btn btn-secondary" onclick="this.parentElement.remove()" style="font-size:12px;">🗑️</button>`;
  container.appendChild(entry);
}

async function crearServicePoints() {
  const entries = document.querySelectorAll('.sp-entry');
  showSpinner('sp-spinner');
  const results = [];

  for (const entry of entries) {
    const name = entry.querySelector('.sp-name').value;
    if (!name) continue;
    const comment = entry.querySelector('.sp-comment').value;

    try {
      const res = await fetch(`${API_BASE}/api/crear-servicepoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, comment })
      });
      const data = await res.json();
      results.push({ name, response: data });
      const created = data?.data?.data?.createServicePoint;
      if (created) {
        createdObjects.sp.push(created);
        addToStatusTable('Service Point', created.name, created.id);
      }
    } catch (e) { results.push({ name, error: e.message }); }
  }

  showResult('sp', results);
  if (createdObjects.sp.length > 0) markTimelineSuccess(9, `${createdObjects.sp.length} service point(s) creados`);
  hideSpinner('sp-spinner');
}

// ─── PASO 10: VINCULAR ────────────────────────────────────

async function vincularAlSA() {
  const sa_id = document.getElementById('vinc-sa-id').value;
  const vinculacion = document.getElementById('vinc-sa-tipo').value;
  const idsRaw = document.getElementById('vinc-sa-ids').value;
  if (!sa_id || !idsRaw) { alert('ID del SA e IDs a vincular son obligatorios'); return; }

  const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean);
  showSpinner('vinc-sa-spinner');

  try {
    const res = await fetch(`${API_BASE}/api/vincular-sa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sa_id, vinculacion, ids })
    });
    const data = await res.json();
    showResult('vinc-sa', data);
  } catch (e) { showResult('vinc-sa', { error: e.message }); }
  hideSpinner('vinc-sa-spinner');
}

async function vincularAlaApp() {
  const app_id = document.getElementById('vinc-app-id').value;
  const vinculacion = document.getElementById('vinc-app-tipo').value;
  const idsRaw = document.getElementById('vinc-app-ids').value;
  if (!app_id || !idsRaw) { alert('ID de la App e IDs a vincular son obligatorios'); return; }

  const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean);
  showSpinner('vinc-app-spinner');

  try {
    const res = await fetch(`${API_BASE}/api/vincular-app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id, vinculacion, ids })
    });
    const data = await res.json();
    showResult('vinc-app', data);
  } catch (e) { showResult('vinc-app', { error: e.message }); }
  hideSpinner('vinc-app-spinner');
}

async function asignarOwners() {
  const app_id = document.getElementById('owner-app-id').value;
  const app_owner_id = document.getElementById('owner-app').value;
  const it_owner_id = document.getElementById('owner-it').value;
  const biz_owner_id = document.getElementById('owner-biz').value;
  if (!app_id) { alert('ID de la Application es obligatorio'); return; }

  showSpinner('owner-spinner');
  try {
    const res = await fetch(`${API_BASE}/api/asignar-owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id, app_owner_id, it_owner_id, biz_owner_id })
    });
    const data = await res.json();
    showResult('owner', data);
    markTimelineSuccess(10, 'Vinculaciones y owners asignados');
  } catch (e) { showResult('owner', { error: e.message }); }
  hideSpinner('owner-spinner');
}

// ─── PASO 10: AUTO-VINCULAR ───────────────────────────────

async function autoVincularTodo() {
  if (!createdObjects.sa || !createdObjects.app) {
    alert('Necesitas haber creado al menos la Application (paso 2) y el SA (paso 3)');
    return;
  }

  showSpinner('autovinc-spinner');
  const results = [];
  const sa_id = createdObjects.sa.id;
  const app_id = createdObjects.app.id;

  // 1. Vincular App al SA
  try {
    const res = await fetch(`${API_BASE}/api/vincular-sa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sa_id, vinculacion: 'application', ids: [app_id] })
    });
    results.push({ paso: 'App → SA', response: await res.json() });
  } catch (e) { results.push({ paso: 'App → SA', error: e.message }); }

  // 2. Vincular Microservicios al SA
  if (createdObjects.ms.length > 0) {
    try {
      const ids = createdObjects.ms.map(m => m.id);
      const res = await fetch(`${API_BASE}/api/vincular-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sa_id, vinculacion: 'microservicio', ids })
      });
      results.push({ paso: 'Microservicios → SA', response: await res.json() });
    } catch (e) { results.push({ paso: 'Microservicios → SA', error: e.message }); }
  }

  // 3. Vincular Entornos al SA
  if (createdObjects.env.length > 0) {
    try {
      const ids = createdObjects.env.map(e => e.id);
      const res = await fetch(`${API_BASE}/api/vincular-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sa_id, vinculacion: 'entorno', ids })
      });
      results.push({ paso: 'Entornos → SA', response: await res.json() });
    } catch (e) { results.push({ paso: 'Entornos → SA', error: e.message }); }
  }

  // 4. Vincular Depósitos al SA (por tipo)
  for (const dep of createdObjects.dep) {
    const tipoVinc = dep.tipo === 'relational' ? 'deposito_relacional' : dep.tipo === 'nosql' ? 'deposito_nosql' : 'deposito_file';
    try {
      const res = await fetch(`${API_BASE}/api/vincular-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sa_id, vinculacion: tipoVinc, ids: [dep.id] })
      });
      results.push({ paso: `Depósito ${dep.name} → SA`, response: await res.json() });
    } catch (e) { results.push({ paso: `Depósito ${dep.name} → SA`, error: e.message }); }
  }

  // 5. Vincular Funcionalidades a la App
  if (createdObjects.func.length > 0) {
    try {
      const ids = createdObjects.func.map(f => f.id);
      const res = await fetch(`${API_BASE}/api/vincular-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id, vinculacion: 'funcionalidad', ids })
      });
      results.push({ paso: 'Funcionalidades → App', response: await res.json() });
    } catch (e) { results.push({ paso: 'Funcionalidades → App', error: e.message }); }
  }

  // 6. Vincular Depósitos a la App
  if (createdObjects.dep.length > 0) {
    try {
      const ids = createdObjects.dep.map(d => d.id);
      const res = await fetch(`${API_BASE}/api/vincular-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id, vinculacion: 'deposito', ids })
      });
      results.push({ paso: 'Depósitos → App', response: await res.json() });
    } catch (e) { results.push({ paso: 'Depósitos → App', error: e.message }); }
  }

  showResult('autovinc', results);
  markTimelineSuccess(10, `${results.length} vinculaciones ejecutadas`);
  updateCounters();
  hideSpinner('autovinc-spinner');
}

// ─── PASO 11: ESTATUS Y RESUMEN ──────────────────────────

async function consultarEstatus() {
  if (!createdObjects.app) { alert('No se ha creado ningún objeto aún'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/estatus/${createdObjects.app.id}?tipo=application`);
    const data = await res.json();
    showResult('estatus-consulta', data);
  } catch (e) { alert('Error: ' + e.message); }
}

async function consultarSA() {
  if (!createdObjects.sa) { alert('No se ha creado el SA aún'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/estatus/${createdObjects.sa.id}?tipo=applicationSystem`);
    const data = await res.json();
    showResult('estatus-consulta', data);
  } catch (e) { alert('Error: ' + e.message); }
}

function exportarJSON() {
  const data = {
    fecha: new Date().toISOString(),
    proyecto: 'Gastos Médicos Mayores',
    objetos: createdObjects
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hopex_gmm_ids.json';
  a.click();
}

function updateCounters() {
  const total = (createdObjects.app ? 1 : 0) + (createdObjects.sa ? 1 : 0) +
    createdObjects.ms.length + createdObjects.its.length + createdObjects.func.length +
    createdObjects.dep.length + createdObjects.env.length + createdObjects.sp.length;
  
  document.getElementById('count-total').textContent = total;
  document.getElementById('count-apis').textContent = total + 1; // +1 por validación
  
  // Contar vinculaciones hechas
  const vinc = (createdObjects.ms.length > 0 ? 1 : 0) + (createdObjects.env.length > 0 ? 1 : 0) +
    createdObjects.dep.length + (createdObjects.func.length > 0 ? 1 : 0) + (createdObjects.app ? 1 : 0);
  document.getElementById('count-vinc').textContent = vinc;
}

// ─── UTILIDADES ───────────────────────────────────────────

function showSpinner(id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
function hideSpinner(id) { const el = document.getElementById(id); if (el) el.classList.remove('active'); }

function showResult(prefix, data) {
  const panel = document.getElementById(`${prefix}-result`);
  const json = document.getElementById(`${prefix}-result-json`);
  if (panel) panel.classList.add('visible');
  if (json) json.textContent = JSON.stringify(data, null, 2);
}

function markTimelineSuccess(step, text) {
  const items = document.querySelectorAll('#status-timeline .timeline-item');
  if (items[step - 1]) {
    items[step - 1].className = 'timeline-item success';
    items[step - 1].querySelector('p').textContent = text;
  }
}

let rowCounter = 0;
function addToStatusTable(tipo, name, id) {
  const table = document.getElementById('status-table');
  if (!table) return;
  rowCounter++;
  const modulo = (tipo === 'Application' || tipo === 'Funcionalidad') ? 'ITPM' : 'ITARC';
  const row = document.createElement('tr');
  row.style.borderBottom = '1px solid #f0f0f0';
  row.innerHTML = `<td style="padding:10px; color:#999;">${rowCounter}</td><td style="padding:10px; font-weight:600;">${tipo}</td><td style="padding:10px;">${name}</td><td style="padding:10px; font-family:monospace; font-size:11px; color:var(--gnp-orange);">${id}</td><td style="padding:10px;"><span class="badge badge-info">${modulo}</span></td><td style="padding:10px;"><span class="badge badge-success">✅ Creado</span></td>`;
  table.appendChild(row);
  updateCounters();
}

// ─── HEALTH CHECK AL CARGAR ───────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Ocultar stepper al inicio (mostrar intro)
  document.getElementById('stepper').style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    const badge = document.getElementById('health-badge');
    if (data.status === 'ok') {
      badge.className = 'badge badge-success';
      badge.textContent = '✅ Conectado a HOPEX';
    } else {
      badge.className = 'badge badge-error';
      badge.textContent = '❌ ' + (data.message || 'Sin conexión');
    }
  } catch (e) {
    const badge = document.getElementById('health-badge');
    badge.className = 'badge badge-error';
    badge.textContent = '❌ Backend no disponible';
  }
});
