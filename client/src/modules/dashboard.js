export default function() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "contact";
  module.innerHTML = `<ul>
    <li><a href="/contacts">Contacts</a></li>
    <li><a href="/orders">Orders</a></li>
    <li><a href="/">Subscriptions (coming soon)</a></li>
    <li><a href="/">Invoices (coming soon)</a></li>
  </ul>`;

  return module;
};
