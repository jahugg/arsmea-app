export function render() {
  const main = document.getElementsByTagName("MAIN")[0];
  const params = new URLSearchParams(window.location.search);
  main.innerHTML = `
    <h1>Contacts</h1>
    <form action="${process.env.SERVER}/api/searchContactByName" method="POST" id="search-contact" class="form">
    <div>
        <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Name" required/>
        <datalist id="search-contact__list"></datalist>
    </div>
    <input type="submit" value="Search"/>
    </form>`;

  fetch(`${process.env.SERVER}/api/getAll`)
    .then((response) => response.json())
    .then((contacts) => buildContactsList(contacts))
    .catch((error) => console.log(error));

  // const form = document.getElementById("search-contact");
  // form.addEventListener("submit", searchContact);

  // const searchInput = document.getElementById("search-contact__input");
  // searchInput.addEventListener("input", searchContact);

  function buildContactsList(contacts) {
    let table = document.createElement("table");
    let tbody = document.createElement("tbody");
    table.id = "contacts-list";

    for (let contact of contacts) {
      let row = document.createElement("tr");
      row.dataset.id = contact.id;
      row.innerHTML = `<td>${contact.firstname} ${contact.lastname}</td>
      <td><a href="tel:${contact.phone}">${contact.phone ? contact.phone : ""}</a></td>
      <td><a href="mailto:${contact.email}">${contact.email ? contact.email : ""}</a></td>`;
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    main.appendChild(table);

    const buttons = table.getElementsByTagName("BUTTON");
    for (let btn of buttons) btn.addEventListener("click", handleContactActions);
  }

  function handleContactActions(event) {
    const dataset = event.target.dataset;
    const contactId = event.target.closest("tr").dataset.id;
    if (dataset.action === "delete") deleteContactById(contactId);
    else if (dataset.action === "edit") console.log("edit " + contactId);
  }

  function deleteContactById(id) {
    fetch(`${process.env.SERVER}/api/deleteContactById/${id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const row = document.querySelector('tr[data-id="'+id+'"');
          row.remove();
        }
      });
  }
}

function searchContact(event) {
  event.preventDefault();
  const form = document.getElementById("search-contact");
  const searchString = document.getElementById("search-contact__input").value;

  if (searchString)
    fetch(`${form.action}/${searchString}`)
      .then((response) => response.json())
      .then((data) => updateDataList(data));
}

function updateDataList(data) {
  const dataList = document.getElementById("search-contact__list");
  dataList.innerHTML = "";

  for (user of data) dataList.innerHTML += `<option value="${user.firstname} ${user.lastname}">`;
}
