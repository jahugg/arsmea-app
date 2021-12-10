export function render() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "contact";
  module.innerHTML = `<p><a href="/contacts">Contacts</a></p>`;

  return module;
}
