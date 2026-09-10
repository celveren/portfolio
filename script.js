const sayings = [
  "You know what, I am now French.",
  "Periodt",
  "My superpower is getting people to laugh.",
  "I do have a pretty sunny disposition!",
  "I still think about the people that said I had leader qualities. I keep proving that to myself every time!",
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
  const current = window.location.hash || "#home";
  document.querySelectorAll('.header nav a').forEach(link => {
    if (link.getAttribute('href') === current) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}
window.addEventListener('hashchange', updateNavigation);
updateNavigation();
