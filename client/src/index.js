const defaultPage = "dashboard";
const pages = {
  dashboard: {
    title: "Dashboard",
    slug: "/",
    module: import("./modules/dashboard.js"),
  },
  contact: {
    title: "Contact",
    slug: "/contact",
    module: import("./modules/contact.js"),
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
  const content = await module.render();
  target.appendChild(content);
}

init();
