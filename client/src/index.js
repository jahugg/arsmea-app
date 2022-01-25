const defaultPage = "dashboard";
const pages = {
  dashboard: {
    title: "Dashboard",
    slug: "/",
    module: import("./modules/dashboard.js"),
  },
  contacts: {
    title: "Contacts",
    slug: "/contacts",
    module: import("./modules/contacts.js"),
  },
  orders: {
    title: "Orders",
    slug: "/orders",
    module: import("./modules/orders.js"),
  }
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
  module.init?.(); // only run if function exists

  updateNavigation(pageKey);
}

function updateNavigation(activePageKey) {
  const navigation = document.getElementById("app-navigation");
  const list = document.createElement("ul");

  for (const key in pages) {
    const listItem = document.createElement("li");
    if (activePageKey === key) listItem.dataset.active = '';
    const link = document.createElement("a");
    link.href = pages[key].slug;
    link.innerHTML = pages[key].title;
    listItem.appendChild(link);
    list.appendChild(listItem);
  }
  navigation.replaceChildren(list);
}

init();
