// Pick a matching scene for the visitor's local calendar day. Hashing the date
// keeps refreshes and page navigation consistent without cookies or storage.
(() => {
  const scenes = [
    ['assets/hero-reference.png', 'assets/footer-reference.png'],
    ['assets/stellar-blade-hero.png', 'assets/stellar-blade-landscape.png'],
  ];

  function updateArtwork() {
    const now = new Date();
    const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let hash = 2166136261;
    for (const character of day) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }
    // Mix the hash so consecutive dates don't simply alternate scenes.
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x45d9f3b);
    hash ^= hash >>> 16;
    const [hero, landscape] = scenes[(hash >>> 0) % scenes.length];
    document.documentElement.style.setProperty('--daily-hero', `url("${hero}")`);
    document.documentElement.style.setProperty('--daily-landscape', `url("${landscape}")`);

    // Refresh even when a visitor leaves the page open overnight.
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    window.setTimeout(updateArtwork, midnight - now + 100);
  }

  updateArtwork();
})();
