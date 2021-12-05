export function render() {
  const main = document.getElementsByTagName("MAIN")[0];
  const params = new URLSearchParams(window.location.search);
  main.innerHTML = `
    <h1>Contacts</h1>
    <div id="contacts-wrapper">
      <div>
        <button id="addButton" type="button" data-action="add">Add Contact</button>
        <form action="${process.env.SERVER}/api/searchContacts" method="POST" id="search-contact" class="form">
            <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Search"/>
        </form>
        <div id="contact-list">
        </div>
      </div>
      <div id="contact-details">
      </div>
    </div>`;

  const searchInput = document.getElementById("search-contact__input");
  searchInput.addEventListener("input", searchContact);

  const addButton = document.getElementById("addButton");
  addButton.addEventListener("click", displayNewUserForm);

  displayAllContacts();

  // fetchContactDetails(contacts[0].id);
}

function displayNewUserForm(event) {
  const contactDetails = document.getElementById("contact-details");
  const data = { data_added: new Date() };

  fetch(`${process.env.SERVER}/api/insertContact`, {
    method: "POST",
    body: data,
  })
    .then((response) => response.json())
    .then((body) => {
      fetchContactDetails(body.id);
      displayAllContacts();
      contactDetails.dataset.editing = "true";
    })
    .catch((error) => console.log(error));
}

function searchContact(event) {
  const form = document.getElementById("search-contact");
  const searchString = document.getElementById("search-contact__input").value;

  if (searchString)
    fetch(`${form.action}/${searchString}`)
      .then((response) => response.json())
      .then((contacts) => updateContactList(contacts))
      .catch((error) => console.log(error));
  else displayAllContacts();
}

function displayAllContacts() {
  fetch(`${process.env.SERVER}/api/getAll`)
    .then((response) => response.json())
    .then((contacts) => updateContactList(contacts))
    .catch((error) => console.log(error));
}

function updateContactList(contacts) {
  const contactList = document.getElementById("contact-list");
  contactList.innerHTML = "";
  const list = document.createElement("ul");
  contactList.appendChild(list);

  for (let data of contacts) {
    let el = document.createElement("li");
    el.dataset.contactId = data.id;
    el.innerHTML = `${data.firstname} ${data.lastname}`;
    el.addEventListener("click", onContactSelected);
    list.appendChild(el);
    lastId = data.id;
  }
}

function onContactSelected(event) {
  const target = event.target;
  const id = target.dataset.contactId;
  const siblings = target.parentNode.childNodes;
  for (let el of siblings) el.removeAttribute("data-selected");
  target.dataset.selected = "";

  fetchContactDetails(id);
}

function fetchContactDetails(contactId) {
  fetch(`${process.env.SERVER}/api/getContactById/${contactId}`)
    .then((response) => response.json())
    .then((data) => displayContactDetails(data[0]))
    .catch((error) => console.log(error));
}

function displayContactDetails(data) {
  const { id, firstname, lastname, company, address, email, phone, notes } = data;
  const contactDetails = document.getElementById("contact-details");
  contactDetails.innerHTML = "";
  let addressNode = document.createElement("address");

  addressNode.dataset.contactId = id;
  addressNode.innerHTML = `<h1>${firstname} ${lastname}</h1>`;
  if (company) addressNode.innerHTML += `<p>${company}</p>`;
  if (address) addressNode.innerHTML += `<p>${address}</p>`;
  if (phone) addressNode.innerHTML += `<a href="tel:${phone}">${phone}</a>`;
  if (email) addressNode.innerHTML += `<a href="mailto:${email}">${email}</a>`;
  if (notes) addressNode.innerHTML += `<p>${notes}</p>`;

  contactDetails.appendChild(addressNode);

  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateContact`;
  form.method = "POST";
  form.id = "edit-contact";
  form.addEventListener("submit", submitContactUpdate);
  form.innerHTML = `<input type="hidden" id="edit-contact__id" name="id" value="${id}">
    <div>
      <label for="edit-contact__firstname">First name</label>
      <input type="text" pattern="[^0-9]*" name="firstname" id="edit-contact__firstname" placeholder="First name" value="${
        firstname ? firstname : ""
      }" required/>
    </div>
    <div>
      <label for="edit-contact__lastname">Last name</label>
      <input type="text" pattern="[^0-9]*" name="lastname" id="edit-contact__lastname" placeholder="Last name" value="${
        lastname ? lastname : ""
      }" required/>
    </div>
    <div>
      <label for="edit-contact__company">Company name</label>
      <input type="text" name="company" id="edit-contact__company" placeholder="Company" value="${company ? company : ""}" />
    </div>
    <div>
      <label for="edit-contact__address">Address</label>
      <textarea name="address" form="edit-contact" name="address" id="edit-contact__address" placeholder="Address">${
        address ? address : ""
      }</textarea>
    </div>
    <div>
      <label for="edit-contact__email">Email</label>
      <input type="email" name="email" id="edit-contact__email" placeholder="Email" value="${email ? email : ""}" />
    </div>
    <div>
      <label for="edit-contact__phone">Phone</label>
      <input type="tel" name="phone" id="edit-contact__phone" placeholder="Phone" value="${phone ? phone : ""}" />
    </div>
    <div>
      <label for="edit-contact__notes">Notes</label>
      <textarea form="edit-contact" name="notes" id="edit-contact__notes" placeholder="Notes">${notes ? notes : ""}</textarea>
    </div>
    <input type="submit" value="Done"/>`;

  contactDetails.appendChild(form);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete";
  deleteBtn.dataset.contactId = id;
  deleteBtn.addEventListener("click", onDeleteContact);
  contactDetails.appendChild(deleteBtn);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "edit-btn";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.contactId = id;
  editBtn.addEventListener("click", toggleEditMode);
  contactDetails.appendChild(editBtn);
}

function submitContactUpdate(event) {
  event.preventDefault();
  fetch(event.target.action, {
    method: event.target.method,
    body: new URLSearchParams(new FormData(event.target)),
  })
    .then((response) => response.json())
    .then((body) => {
      toggleEditMode();
      fetchContactDetails(body.id);
      // displayAllContacts();
    })
    .catch((error) => console.log(error));
}

function onDeleteContact(event) {
  const dataset = event.target.dataset;
  const contactId = event.target.dataset.contactId;
  deleteContactById(contactId);
}

function toggleEditMode() {
  let contactDetails = document.getElementById("contact-details");
  if (contactDetails.dataset.editing) delete contactDetails.dataset.editing;
  else contactDetails.dataset.editing = "true";
}

function deleteContactById(id) {
  fetch(`${process.env.SERVER}/api/deleteContactById/${id}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => displayAllContacts())
    .catch((error) => console.log(error));
}
