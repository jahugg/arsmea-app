export async function render() {
  const main = document.getElementsByTagName("MAIN")[0];
  main.innerHTML = `
    <h1>Contacts</h1>
    <div id="contacts-wrapper">
      <div>
        <button id="addButton" type="button" data-action="add">Add Contact</button>
        <form action="${process.env.SERVER}/api/searchContacts" method="POST" id="search-contact" class="form">
            <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Search"/>
        </form>
        <div id="contact-list"></div>
      </div>
      <div id="contact-details"></div>
    </div>`;

  const searchInput = document.getElementById("search-contact__input");
  searchInput.addEventListener("input", (event) => insertContactList(event.target.value));

  const addButton = document.getElementById("addButton");
  addButton.addEventListener("click", insertNewContact);

  insertContactList();
}

async function insertContactList(searchString) {
  const contactList = await getContactListEl(searchString);
  const contactListWrapper = document.getElementById("contact-list");
  let firstIteration = false;
  if (!contactListWrapper.childNodes.length) firstIteration = true;

  contactListWrapper.innerHTML = "";
  contactListWrapper.appendChild(contactList);

  if (firstIteration || searchString && contactList.childNodes.length) selectFirstContact();
}

async function insertContactDetails(contactId, mode) {
  let el;
  if (mode === "view") el = await getContactAddressEl(contactId);
  else if (mode === "edit") el = await getContactFormEl(contactId);

  const wrapper = document.getElementById("contact-details");
  wrapper.innerHTML = "";
  wrapper.appendChild(el);

  if (mode === "edit") document.getElementById("edit-contact__firstname").select();

  const contactItems = document.querySelectorAll("#contact-list ul li");
  for (let el of contactItems)
    if (el.dataset.contactId != contactId) el.removeAttribute("data-selected");
    else el.dataset.selected = "";
}

async function insertNewContact() {
  let response = await requestNewContact();
  insertContactList();
  insertContactDetails(response.id, "edit");
}

async function getContactListEl(searchString) {
  let contacts = await requestContacts(searchString);
  const list = document.createElement("ul");
  for (let data of contacts) {
    let el = document.createElement("li");
    el.dataset.contactId = data.id;
    el.innerHTML = `${data.firstname} ${data.lastname}`;
    el.addEventListener("click", () => insertContactDetails(data.id, "view"));
    list.appendChild(el);
    lastId = data.id;
  }

  return list;
}

async function getContactAddressEl(id) {
  let data = await requestContactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes } = data;

  const wrapper = document.createElement("div");
  let addressNode = document.createElement("address");
  addressNode.dataset.contactId = id;
  addressNode.innerHTML = `<h1>${firstname} ${lastname}</h1>`;
  if (company) addressNode.innerHTML += `<p>${company}</p>`;
  if (address) addressNode.innerHTML += `<p>${address}</p>`;
  if (phone) addressNode.innerHTML += `<a href="tel:${phone}">${phone}</a>`;
  if (email) addressNode.innerHTML += `<a href="mailto:${email}">${email}</a>`;
  if (notes) addressNode.innerHTML += `<p>${notes}</p>`;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "edit-btn";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.contactId = id;
  editBtn.addEventListener("click", () => insertContactDetails(id, "edit"));
  wrapper.appendChild(editBtn);

  wrapper.appendChild(addressNode);
  wrapper.appendChild(editBtn);

  return wrapper;
}

async function getContactFormEl(id) {
  let data = await requestContactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes } = data;

  const wrapper = document.createElement("div");
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateContact`;
  form.method = "POST";
  form.id = "edit-contact";
  form.addEventListener("submit", submitUpdateContactForm);
  form.innerHTML = `<input type="hidden" id="edit-contact__id" name="id" value="${id}">
    <div>
      <label for="edit-contact__firstname">First name</label>
      <input type="text" pattern="[^0-9]*" name="firstname" id="edit-contact__firstname" placeholder="First name" value="${
        firstname ? firstname : ""
      }" />
    </div>
    <div>
      <label for="edit-contact__lastname">Last name</label>
      <input type="text" pattern="[^0-9]*" name="lastname" id="edit-contact__lastname" placeholder="Last name" value="${lastname ? lastname : ""}" />
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

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete Contact";
  deleteBtn.id = "delete-btn";
  deleteBtn.dataset.contactId = id;
  deleteBtn.addEventListener("click", () => requestDeleteContact(id));

  wrapper.appendChild(form);
  wrapper.appendChild(deleteBtn);

  return wrapper;
}

async function requestContacts(searchString) {
  let response;
  if (searchString) response = await fetch(`${process.env.SERVER}/api/searchContacts/${searchString}`);
  else response = await fetch(`${process.env.SERVER}/api/getAllContacts`);
  return await response.json();
}

async function requestContactDetails(id) {
  const response = await fetch(`${process.env.SERVER}/api/getContactById/${id}`);
  return await response.json();
}

async function requestDeleteContact(id) {
  try {
    const response = await fetch(`${process.env.SERVER}/api/contact/${id}`, {
      method: "DELETE",
    });
    insertContactList();
    selectFirstContact();
  } catch (err) {
    console.log(err);
  }
}

async function requestUpdateContact(data) {
  const response = await fetch(`${process.env.SERVER}/api/updateContact`, {
    method: "POST",
    body: data,
  });
  return await response.json();
}

async function requestNewContact() {
  let defaultData = { firstname: "New", lastname: "Contact" };
  let searchParams = new URLSearchParams(defaultData);
  const response = await fetch(`${process.env.SERVER}/api/contact`, {
    method: "POST",
    body: searchParams,
  });
  return await response.json();
}

async function submitUpdateContactForm(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  // might be passed as FORM DATA directly...
  // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#body
  let response = await requestUpdateContact(data);
  insertContactList();
  insertContactDetails(response.id, "view");
}

function selectFirstContact() {
  const contactList = document.querySelector("#contact-list ul");
  const firstContact = contactList.firstChild;
  if (firstContact) {
    const firstContactId = Number(firstContact.dataset.contactId);
    insertContactDetails(firstContactId, "view");
  }
}
