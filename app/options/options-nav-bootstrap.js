(() => {
  const nav = [...document.querySelectorAll("#settings-nav button[data-section]")];
  const pages = [...document.querySelectorAll(".page[data-page]")];
  if (!nav.length || !pages.length) return;

  const sections = new Set(nav.map(button => button.dataset.section).filter(Boolean));
  const show = id => {
    if (!sections.has(id)) return;
    for (const button of nav) button.classList.toggle("active", button.dataset.section === id);
    for (const page of pages) page.classList.toggle("active", page.dataset.page === id);

    const hash = `#${id}`;
    if (location.hash !== hash) history.replaceState(history.state, "", hash);
  };

  for (const button of nav) {
    button.addEventListener("click", () => show(button.dataset.section));
  }

  const initial = location.hash.slice(1);
  if (sections.has(initial)) show(initial);
  document.documentElement.dataset.optionsNavReady = "1";
})();
