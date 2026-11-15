// Aplica el tema antes del primer pintado para evitar el destello blanco.
// Va como archivo aparte (no script en línea) para poder usar una CSP estricta.
(function () {
  try {
    var t = localStorage.getItem('tema') || 'sistema';
    var oscuro = t === 'oscuro' ||
      (t === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (oscuro) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oscuro ? '#0c151d' : '#0b5cab');
  } catch (e) {
    /* almacenamiento no disponible: se queda el tema por defecto */
  }
})();
