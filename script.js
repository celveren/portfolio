// Scatter the artwork glints once per load; percentages adapt to resizing.
// Give each one a vertical band so they don't all bunch together.
const artSparkles = document.querySelectorAll('.hero-art .art-sparkle');
artSparkles.forEach((sparkle, index) => {
        const x = 35 + Math.random() * 60;
        const y = 12 + ((index + Math.random()) / artSparkles.length) * 76;
        sparkle.style.setProperty('--spark-x', `${x.toFixed(2)}%`);
        sparkle.style.setProperty('--spark-y', `${y.toFixed(2)}%`);
});

const sayings = [
    "You know what, I am now French.",
    "Periodt",
    "My superpower is getting people to laugh.",
    "I do have a pretty sunny disposition!",
    "I still think about the people that said I had leader qualities. I keep proving that to myself every time",
    "EXPERIENCE!!!!!",
    "People can surprise you, even I surprise myself.",
    "I'm bringing the cool stuff back. It's not my fault.",
    "I wear many hats and I do it in style!",
    "I think I nerded out and I'm okay with that.",
    "I've been all over the place, but I'm back.",
];

const quote = document.getElementById("random-quote");
if (quote) {
    const saying = sayings[Math.floor(Math.random() * sayings.length)];
    quote.textContent = `“${saying}”`;
}

// Keep the navigation underline in sync with the selected section.
function updateNavigation() {
    const current = new URL(window.location.href);
    const currentPage = current.pathname.replace(/\/index\.html$/, '/');
    document.querySelectorAll('.header nav a').forEach(link => {
            const target = new URL(link.getAttribute('href'), current);
            const targetPage = target.pathname.replace(/\/index\.html$/, '/');
            if (targetPage === currentPage && (!target.hash || target.hash === (current.hash || '#home'))) {
                link.setAttribute('aria-current', target.hash ? 'location' : 'page');
            } else {
                link.removeAttribute('aria-current');
            }
    });
}
window.addEventListener('hashchange', updateNavigation);
updateNavigation();

// Old links can opt into the announcement; dismissal wins on later visits.
const rebrandBanner = document.getElementById('rebrand-banner');
const rebrandDismissalKey = 'celveren-rebrand-dismissed-v1';
let rebrandDismissed = false;
try {
    rebrandDismissed = localStorage.getItem(rebrandDismissalKey) === 'true';
} catch {
    // The banner still works when browser storage is unavailable.
}
if (rebrandBanner && new URLSearchParams(window.location.search).get('from') === 'lightsage' && !rebrandDismissed) {
    rebrandBanner.hidden = false;
}
document.getElementById('dismiss-rebrand')?.addEventListener('click', () => {
    rebrandBanner.hidden = true;
    try {
        localStorage.setItem(rebrandDismissalKey, 'true');
    } catch {
        // Without storage, dismissal lasts for this page view.
    }
    document.querySelector('.site-shell header .brand')?.focus();
});
