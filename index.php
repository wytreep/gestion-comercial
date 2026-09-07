<!DOCTYPE html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0f4c75">
  <meta name="description" content="Sistema de gestión comercial para pescado, queso y carne serrana">
  <title>GestiónComercial</title>

  <!-- PWA manifest -->
  <link rel="manifest" href="manifest.json">

  <!-- Favicon SVG inline -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f4c75'/><text y='22' x='4' font-size='20'>🐟</text></svg>">

  <!-- Estilos -->
  <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>

<!-- ══════════════════════════════════════════════════
     HEADER
══════════════════════════════════════════════════ -->
<header class="app-header">
  <div class="header-brand">
    <span class="brand-icon">🐟</span>
    <div>
      <div>GestiónComercial</div>
      <div class="brand-sub">Pescado · Queso · Carne Serrana</div>
    </div>
  </div>
  <div class="header-actions">
    <button id="btn-instalar" class="btn-instalar hidden"
            onclick="instalarPWA()">⬇ Instalar app</button>
    <span id="indicador-db" class="badge badge-gris" title="Estado de conexión">⏳ Conectando…</span>
  </div>
</header>

<!-- ══════════════════════════════════════════════════
     SIDEBAR
══════════════════════════════════════════════════ -->
<nav class="app-nav">

  <div class="nav-section">
    <div class="nav-section-label">Principal</div>
    <a class="nav-link" data-page="dashboard" onclick="navigate('dashboard')">
      <span class="nav-icon">📊</span> Dashboard
    </a>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Ventas</div>
    <a class="nav-link" data-page="nueva-venta" onclick="navigate('nueva-venta')">
      <span class="nav-icon">➕</span> Nueva venta
    </a>
    <a class="nav-link" data-page="ventas" onclick="navigate('ventas')">
      <span class="nav-icon">🧾</span> Historial ventas
    </a>
    <a class="nav-link" data-page="cartera" onclick="navigate('cartera')">
      <span class="nav-icon">💳</span> Cartera / Cobros
    </a>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Compras</div>
    <a class="nav-link" data-page="nueva-compra" onclick="navigate('nueva-compra')">
      <span class="nav-icon">🛒</span> Nueva compra
    </a>
    <a class="nav-link" data-page="compras" onclick="navigate('compras')">
      <span class="nav-icon">📦</span> Historial compras
    </a>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Contabilidad</div>
    <a class="nav-link" data-page="caja" onclick="navigate('caja')">
      <span class="nav-icon">💰</span> Caja y flujo
    </a>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Configuración</div>
    <a class="nav-link" data-page="clientes" onclick="navigate('clientes')">
      <span class="nav-icon">👥</span> Clientes
    </a>
    <a class="nav-link" data-page="productos" onclick="navigate('productos')">
      <span class="nav-icon">🏷️</span> Productos y precios
    </a>
  </div>

</nav>

<!-- ══════════════════════════════════════════════════
     CONTENIDO PRINCIPAL
══════════════════════════════════════════════════ -->
<main class="app-main" id="main-content">
  <div class="loading-spinner"><span></span></div>
</main>

<!-- ══════════════════════════════════════════════════
     TOAST CONTAINER
══════════════════════════════════════════════════ -->
<div id="toast-container"></div>

<!-- ══════════════════════════════════════════════════
     SCRIPTS
══════════════════════════════════════════════════ -->
<script src="assets/js/utils.js"></script>
<script src="assets/js/api.js"></script>
<script src="assets/js/app.js"></script>

<script>
  // ── Instalación PWA ────────────────────────────────
  function instalarPWA() {
    if (window._pwaPrompt) {
      window._pwaPrompt.prompt();
      window._pwaPrompt.userChoice.then(r => {
        if (r.outcome === 'accepted') {
          document.getElementById('btn-instalar').classList.add('hidden');
          Utils.toast('¡App instalada! Ya puedes abrirla desde el escritorio.', 'ok', 5000);
        }
        window._pwaPrompt = null;
      });
    }
  }

  // ── Verificar conexión a la BD ─────────────────────
  (async function checkDB() {
    const badge = document.getElementById('indicador-db');
    try {
      await API.categorias();
      badge.className  = 'badge badge-verde';
      badge.textContent = '● BD conectada';
    } catch {
      badge.className  = 'badge badge-rojo';
      badge.textContent = '✕ Sin BD — Inicia XAMPP';
    }
  })();
</script>

</body>
</html>
