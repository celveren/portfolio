(() => {
  const buttons = document.querySelectorAll('[data-card]');
  const allowed = ['soft', 'split', 'minimal'];
  function select(style) {
    document.body.dataset.cardStyle = allowed.includes(style) ? style : 'soft';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.card === document.body.dataset.cardStyle)));
  }
  select(new URLSearchParams(location.search).get('style'));
  buttons.forEach(button => button.addEventListener('click', () => {
    select(button.dataset.card);
    const url = new URL(location.href);
    url.searchParams.set('style', button.dataset.card);
    history.replaceState(null, '', url);
    document.querySelector('.tools-services').scrollIntoView({block:'start'});
  }));
  const bar = document.querySelector('.udb-preview-bar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--preview-offset', `${bar.offsetHeight + 24}px`)).observe(bar);
})();
