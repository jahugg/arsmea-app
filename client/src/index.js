const defaultPage = "dashboard";
const pages = {
  dashboard: {
    title: "Dashboard",
    slug: "/",
    module: import("./modules/dashboard.js"),
  },
  orders: {
    title: "Orders",
    slug: "/orders",
    module: import("./modules/orders.js"),
  },
  contacts: {
    title: "Contacts",
    slug: "/contacts",
    module: import("./modules/contacts.js"),
  },
};

function init() {
  document.addEventListener("DOMContentLoaded", function () {
    navigateToCurrentURL();
  });

  window.addEventListener("popstate", (event) => {
    let stateObj = { pageKey: event.state.pageKey };
    buildPage(stateObj, false);
  });
}

function navigateToCurrentURL() {
  let urlSlug = window.location.pathname;
  let pageKey = defaultPage;
  for (let key in pages) if (pages[key].slug === urlSlug) pageKey = key;
  let stateObj = { pageKey: pageKey };
  buildPage(stateObj, true);
}

async function buildPage(stateObj, addToHistory) {
  let pageKey = stateObj.pageKey;
  let page = pages[pageKey];
  document.title = "Vlowers | " + page.title;

  // push page to browser history
  // if (addToHistory) window.history.pushState(stateObj, page.title, page.slug);

  // load page module
  const target = document.getElementsByTagName("MAIN")[0];
  const module = await page.module;
  const content = await module.default(); // render
  target.appendChild(content);
  module.init?.();  // only run if function exists

  // add title
  const header = document.getElementsByTagName("HEADER")[0];
  const title = document.createElement("h2");
  title.id = "module-title";
  title.innerHTML = page.title;
  
  header.appendChild(title);
}

init();
