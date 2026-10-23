/* Recuperação independente da navegação da CEB. */
(function () {
  function activate(button) {
    var key = button.getAttribute('data-view');
    if (!key) return;
    var target = document.getElementById('view-' + key);
    if (!target) return;
    document.querySelectorAll('button.tab[data-view]').forEach(function (tab) {
      tab.classList.toggle('active', tab === button);
      tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
    });
    document.querySelectorAll('.view').forEach(function (view) {
      view.classList.toggle('hidden', view !== target);
    });
    if (key === 'biblioteca' && typeof window.render === 'function') {
      try { window.render(); } catch (err) { console.error('Erro ao abrir Biblioteca:', err); }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('button.tab[data-view]');
    if (button) {
      event.preventDefault();
      activate(button);
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    var active = document.querySelector('button.tab[data-view].active') ||
      document.querySelector('button.tab[data-view]');
    if (active) activate(active);
  });
})();