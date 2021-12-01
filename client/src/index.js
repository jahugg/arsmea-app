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

    // fetch("http://localhost:5123/getAll")  // Wrong URL
    //   .then((response) => response.json())
    //   .then((data) => loadHTMLTable(data["data"]));
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

// const addBtn = document.querySelector("#add-name-btn");
// document.querySelector("table tbody").addEventListener("click", function (event) {
//   if (event.target.className === "delete-row-btn") {
//     deleteRowById(event.target.dataset.id);
//   }
//   if (event.target.className === "edit-row-btn") {
//     handleEditRow(event.target.dataset.id);
//   }
// });

// const updateBtn = document.querySelector("#update-row-btn");
// const searchBtn = document.querySelector("#search-btn");

// searchBtn.addEventListener("click", () => {
//   const searchValue = document.querySelector("#search-input").value;

//   fetch(`${serverURL}/search/${searchValue}`)
//     .then((response) => response.json())
//     .then((data) => loadHTMLTable(data["data"]));
// });

// function deleteRowById(id) {
//   fetch(`${serverURL}/delete/${id}`, {
//     method: "DELETE",
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.success) {
//         location.reload();
//       }
//     });
// }

// function handleEditRow(id) {
//   const updateSection = document.querySelector("#update-row");
//   updateSection.hidden = false;
//   document.querySelector("#update-name-input").dataset.id = id;
// }

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

// addBtn.addEventListener("click", () => {
//   const nameInput = document.querySelector("#name-input");
//   const name = nameInput.value;
//   nameInput.value = "";

//   fetch(`${serverURL}/insert`, {
//     headers: {
//       "Content-type": "application/json",
//     },
//     method: "POST",
//     body: JSON.stringify({ name: name }),
//   })
//     .then((response) => response.json())
//     .then((data) => insertRowIntoTable(data["data"]));
// });

// function insertRowIntoTable(data) {
//   const table = document.querySelector("table tbody");
//   const isTableData = table.querySelector(".no-data");

//   let tableHtml = "<tr>";

//   for (let key in data) {
//     if (data.hasOwnProperty(key)) {
//       if (key === "dateAdded") {
//         data[key] = new Date(data[key]).toLocaleString();
//       }
//       tableHtml += `<td>${data[key]}</td>`;
//     }
//   }

//   tableHtml += `<td><button class="delete-row-btn" data-id="${data.id}">Delete</button></td>
//   <td><button class="edit-row-btn" data-id="${data.id}">Edit</button></td>
//   </tr>`;

//   if (isTableData) {
//     table.innerHTml = tableHtml;
//   } else {
//     const newRow = table.insertRow();
//     newRow.innerHTML = tableHtml;
//   }
// }

// function loadHTMLTable(data) {
//   const table = document.querySelector("table tbody");
//   if (data.length === 0) {
//     table.innerHTML = "<tr><td class='no-data' colspan='5'>No Data</td</tr>";
//   } else {
//     let tableHtml = "";
//     data.forEach(function ({ id, firstname, date_added }) {
//       tableHtml += `<tr>
//         <td>${id}</td>
//         <td>${firstname}</td>
//         <td>${new Date(date_added).toLocaleString()}</td>
//         <td><button class="delete-row-btn" data-id="${id}">Delete</button></td>
//         <td><button class="edit-row-btn" data-id="${id}">Edit</button></td>
//         </tr>`;
//     });

//     table.innerHTML = tableHtml;
//   }
// }
