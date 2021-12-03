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

function buildPage(stateObj, addToHistory) {
  let pageKey = stateObj.pageKey;
  let page = pages[pageKey];
  document.title = "Vlowers | " + page.title;

  // push page to browser history
  // if (addToHistory) window.history.pushState(stateObj, page.title, page.slug);

  // load page module
  page.module
    .then((module) => {
      module.render();
    })
    .catch((err) => {
      console.log("Cannot load module:" + err.message);
    });
}

init();

// ------------------------------------
// ------------------------------------
// TUTORIAL STUFF

// updateBtn.addEventListener("click", () => {
//   const updateNameInput = document.querySelector("#update-name-input");
//   fetch(`${process.env.SERVER}/update`, {
//     method: "PATCH",
//     headers: {
//       "Content-type": "application/json",
//     },
//     body: JSON.stringify({
//       id: updateNameInput.dataset.id,
//       firstname: updateNameInput.value,
//     }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.success) {
//         location.reload();
//       }
//     });
// });
