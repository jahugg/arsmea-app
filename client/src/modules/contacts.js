import * as request from "./serverRequests";

let contacts;

export default async function render() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "contact";
  module.innerHTML = `
    <div id="contact-control-section">
      <div>
        <form id="search-contact" role="search">
          <label id="search-contact__label" for="search-contact__input">Search</label>
          <input type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Contact Name..." autocomplete="off" required/>
        </form>

        <div id="archive-toggle-wrapper" class="checkbox-wrapper" hidden>
          <input type="checkbox" id="archive-toggle">
          <label for="archive-toggle">Archive</label>
        </div>
      </div>

      <button id="add-contact-btn" type="button">Add Contact</button>
    </div>
    <div id="contact-list-section">
      <div id="contact-list-wrapper">
      </div>
    </div>
    <div id="contact-detail-section">
    </div>`;

  const addButton = module.querySelector("#add-contact-btn");
  addButton.addEventListener("click", onPrepareNewContact);

  const searchInput = module.querySelector("#search-contact__input");
  searchInput.addEventListener("input", onSearchContact);

  const searchForm = module.querySelector("#search-contact");
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("reset search and select contact");
  });

  const archiveToggle = module.querySelector("#archive-toggle");
  archiveToggle.addEventListener("input", onToggleArchived);

  return module;
}

export async function init() {
  const searchInput = document.querySelector("#search-contact__input");
  searchInput.focus();

  await updateContactList();

  // get url parameters
  const url = new URL(window.location);
  let contactId = url.searchParams.get("id");
  selectContact(contactId);

  // handle key controls
  window.addEventListener("keydown", function (event) {
    switch (event.key) {
      case "ArrowDown":
        selectNextContact();
        break;
      case "ArrowUp":
        selectPreviousContact();
        break;
    }
  });
}

async function updateContactList(archived = false) {
  const contactListWrapper = document.querySelector("#contact-list-wrapper");
  const contactList = await getContactListEl(archived);
  contactListWrapper.replaceChildren(contactList);

  // save current contacts for later (search)
  contacts = await request.contacts(archived);

  updateArchivedContacts();
}

async function updateArchivedContacts() {
  const archivedContacts = await request.contacts(true);
  const archiveToggle = document.querySelector("#archive-toggle-wrapper");
  if (archivedContacts.length) {
    archiveToggle.removeAttribute("hidden");
    archiveToggle.querySelector("label").innerHTML = `Archive (${archivedContacts.length})`;
  } else archiveToggle.setAttribute("hidden", true);
}

async function selectContact(id) {
  const contactList = document.querySelector("#contact-list");
  let contactDetails = "";

  try {
    // get contact details
    contactDetails = await getContactAddressEl(id);
  } catch (error) {
    // select first child
    const firstChild = contactList.firstElementChild;
    if (firstChild) {
      contactDetails = await getContactAddressEl(firstChild.dataset.contactId);
      id = firstChild.dataset.contactId;
    }
  }

  const detailsWrapper = document.querySelector("#contact-detail-section");
  detailsWrapper.replaceChildren(contactDetails);

  if (contactDetails) {
    for (let item of contactList.children)
      if (item.dataset.contactId == id) item.dataset.selected = "";
      else delete item.dataset.selected;

    // add contact id to url
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    const state = { contact_id: id };
    window.history.replaceState(state, "", url);
  }
}

async function removeContact(id, archived = false) {
  selectNextContact();
  document.querySelector(`#contact-list li[data-contact-id="${id}"]`).remove();
  updateArchivedContacts();

  // if this was the last contact make sure to switch to unarchived list
  if (!document.getElementById("contact-list").hasChildNodes()) {
    document.getElementById("archive-toggle").checked = false;
    await updateContactList(false);
    contacts = await request.contacts(false);
    selectContact();
  } else contacts = await request.contacts(archived);
}

async function onToggleArchived(event) {
  const checked = event.target.checked;
  await updateContactList(checked);
  selectContact();
}

async function onEditContact(event) {
  const id = event.target.dataset.contactId;
  const contactDetailsWrapper = document.getElementById("contact-detail-section");
  const form = await getContactFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
  form.querySelector("#edit-contact__firstname").select();
}

async function onPrepareNewContact(event) {
  const contactDetailsWrapper = document.getElementById("contact-detail-section");
  const wrapper = document.createElement("div");
  wrapper.id = "contact-details";
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/contact`;
  form.method = "POST";
  form.id = "new-contact";
  form.addEventListener("submit", onCreateNewContact);
  form.innerHTML = `
  <section class="content-controls">
    <input type="submit" class="button-small" value="Create"/>
    <button type="button" class="button-small" id="discard-contact-btn">Discard</button>
  </section>

  <label for="new-contact__firstname">First name</label>
  <input required type="text" pattern="[^0-9]*" name="firstname" id="new-contact__firstname" placeholder="Hanna" />

  <label for="new-contact__lastname">Last name</label>
  <input type="text" pattern="[^0-9]*" name="lastname" id="new-contact__lastname" placeholder="Muster" />

  <label for="new-contact__phone">Phone</label>
  <input type="tel" name="phone" id="new-contact__phone" placeholder="+41 XXX XX XX" />

  <details>
    <summary class="button-small">More fields</summary>

    <label for="new-contact__email">Email</label>
    <input type="email" name="email" id="new-contact__email" placeholder="hanna.muster@email.com" />

    <label for="new-contact__address">Address</label>
    <textarea name="address" form="new-contact" name="address" id="new-contact__address" placeholder="Musterweg 34&#10;4321 Moon"></textarea>

    <label for="new-contact__company">Company</label>
    <input type="text" name="company" id="new-contact__company" placeholder="Fantasy Inc."/>

    <label for="new-contact__notes">Notes</label>
    <textarea name="notes" id="new-contact__notes" placeholder="Write something..."></textarea>
  </details>`;

  const discardBtn = form.querySelector("#discard-contact-btn");
  discardBtn.addEventListener("click", selectContact);

  wrapper.appendChild(form);
  contactDetailsWrapper.replaceChildren(wrapper);

  form.querySelector("#new-contact__firstname").focus();

  const contactListItems = document.querySelectorAll("#contact-list li");
  for (const item of contactListItems) delete item.dataset.selected;
}

async function onCreateNewContact(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const response = await request.newContact(data);
  const id = response.id;

  await updateContactList();
  selectContact(id);
}

async function onDeleteContact(event) {
  const contactId = event.target.dataset.contactId;

  if (window.confirm("Delete Contact?")) {
    const result = await request.deleteContact(contactId);
    removeContact(contactId, false);
  }
}

async function onArchiveContact(event) {
  const id = event.target.dataset.contactId;
  const data = new URLSearchParams({ id: id, archived: 1 });
  let response = await request.updateContact(id, data);
  removeContact(id, false);
}

async function onRestoreContact(event) {
  const id = event.target.dataset.contactId;
  const data = new URLSearchParams({ id: id, archived: 0 });
  let response = await request.updateContact(id, data);
  removeContact(id, true);
}

async function onSearchContact(event) {
  const contactListItems = document.querySelectorAll("#contact-list li");
  for (const item of contactListItems) item.dataset.filtered = "";

  const searchString = event.target.value.toLowerCase();
  const searchResults = contacts.filter((item) => `${item.firstname.toLowerCase()} ${item.lastname.toLowerCase()}`.includes(searchString));
  for (const item of searchResults) {
    const contactListItem = document.querySelector(`#contact-list li[data-contact-id="${item.id}"]`);
    if (contactListItem) delete contactListItem.dataset.filtered;
  }

  const firstResult = document.querySelector(`#contact-list li:not([data-filtered])`);
  firstResult ? selectContact(firstResult.dataset.contactId) : "";
}

async function onUpdateContact(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const contactId = data.get("id");
  let response = await request.updateContact(contactId, data);

  await updateContactList();

  const item = document.querySelector(`#contact-list li[data-contact-id="${contactId}"`);
  item.dataset.selected = "";

  selectContact(contactId);
}

async function getContactListEl(archived = false) {
  const contacts = await request.contacts(archived);
  const contactList = document.createElement("ul");
  contactList.id = "contact-list";

  let orderLetter;

  for (let data of contacts) {
    const { id, firstname, lastname } = data;
    let el = document.createElement("li");
    el.dataset.contactId = id;
    el.innerHTML = `${firstname ? firstname : ""} ${lastname ? lastname : ""}`;
    el.addEventListener("click", (event) => selectContact(event.target.dataset.contactId));
    contactList.appendChild(el);

    // check order letter
    const firstLetter = lastname.charAt(0).toLowerCase();
    if (orderLetter !== firstLetter) {
      orderLetter = firstLetter;
      el.dataset.orderLetter = firstLetter.toUpperCase();
    }
  }

  return contactList;
}

async function getContactAddressEl(id) {
  let data = await request.contactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes, archived } = data;

  const wrapper = document.createElement("div");
  const contactDetails = document.createElement("div");
  contactDetails.id = "contact-details";

  const controls = document.createElement("section");
  controls.classList.add("content-controls");
  contactDetails.appendChild(controls);

  if (archived) {
    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.innerHTML = "Restore Contact";
    restoreBtn.id = "restore-contact-btn";
    restoreBtn.dataset.contactId = id;
    restoreBtn.classList.add("button-small");
    restoreBtn.addEventListener("click", onRestoreContact);
    controls.appendChild(restoreBtn);
  } else {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.id = "edit-btn";
    editBtn.innerHTML = "Edit";
    editBtn.dataset.contactId = id;
    editBtn.classList.add("button-small");
    editBtn.addEventListener("click", onEditContact);
    controls.appendChild(editBtn);
  }

  let addressNode = document.createElement("address");
  addressNode.dataset.contactId = id;
  addressNode.innerHTML = `<div class="address__name">${firstname ? firstname : ""} ${lastname ? lastname : ""}</div>`;
  if (company) addressNode.innerHTML += `<div class="address__company">${company}</div>`;
  if (address) addressNode.innerHTML += `<div class="address__address">${address}</div>`;
  if (phone) addressNode.innerHTML += `<div class="address__tel"><a href="tel:${phone}">${phone}</a></div>`;
  if (email) addressNode.innerHTML += `<div class="address__email"><a href="mailto:${email}">${email}</a></div>`;
  if (notes) addressNode.innerHTML += `<div class="address__notes">${notes}</div>`;

  contactDetails.appendChild(addressNode);
  wrapper.appendChild(contactDetails);

  // display orders of contact
  const orders = await request.ordersByContact(id);
  if (orders.length) {
    const orderTitle = document.createElement("h2");
    orderTitle.innerHTML = "Orders";
    wrapper.appendChild(orderTitle);

    const orderList = document.createElement("ul");
    orderList.id = "contact-orders";
    for (let order of orders) {
      const { id, datetime_due, price, status } = order;
      let item = document.createElement("li");
      item.dataset.orderId = id;
      item.innerHTML = `<a href="/orders?id=${id}">${datetime_due} ${price}CHF ${status}</a>`;
      orderList.appendChild(item);
    }
    wrapper.appendChild(orderList);
  }

  return wrapper;
}

async function getContactFormEl(id) {
  const data = await request.contactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes } = data;

  const wrapper = document.createElement("div");
  wrapper.id = "contact-details";
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateContact`;
  form.method = "POST";
  form.id = "edit-contact";
  form.addEventListener("submit", onUpdateContact);
  form.innerHTML = `
    <section class="content-controls">

      <input type="submit" class="button-small" value="Save Changes"/>
      <button type="button" id="discard-contact-btn" class="button-small">Discard Changes</button>

      <button type="button" id="delete-contact-btn" class="button-small" data-contact-id="${id}">Delete Contact</button>
      <button type="button" id="archive-contact-btn" class="button-small" data-contact-id="${id}">Archive Contact</button>
    </section>
      <input type="hidden" id="edit-contact__id" name="id" value="${id}">

    <label for="edit-contact__firstname">First name</label>
    <input required type="text" pattern="[^0-9]*" name="firstname" autocapitalize="words" id="edit-contact__firstname" placeholder="Hanna" value="${
      firstname ? firstname : ""
    }" />
    <label for="edit-contact__lastname">Last name</label>
    <input type="text" pattern="[^0-9]*" name="lastname" autocapitalize="words" id="edit-contact__lastname" placeholder="Muster" value="${
      lastname ? lastname : ""
    }" />
    <label for="edit-contact__phone">Phone</label>
    <input type="tel" name="phone" id="edit-contact__phone" placeholder="+41 XXX XX XX" value="${phone ? phone : ""}" />

    <label for="edit-contact__email">Email</label>
    <input type="email" name="email" id="edit-contact__email" placeholder="hanna.muster@email.com" value="${email ? email : ""}" />

    <label for="edit-contact__address">Address</label>
    <textarea name="address" form="edit-contact" name="address" id="edit-contact__address" placeholder="Musterweg 34&#10;4321 Moon">${
      address ? address : ""
    }</textarea>

    <label for="edit-contact__company">Company</label>
    <input type="text" name="company" id="edit-contact__company" placeholder="Fantasy Inc." value="${company ? company : ""}" />

    <label for="edit-contact__notes">Notes</label>
    <textarea name="notes" id="edit-contact__notes" placeholder="Write something...">${notes ? notes : ""}</textarea>`;

  const discardBtn = form.querySelector("#discard-contact-btn");
  discardBtn.addEventListener("click", () => selectContact(id));

  const deleteBtn = form.querySelector("#delete-contact-btn");
  deleteBtn.addEventListener("click", onDeleteContact);
  const orders = await request.ordersByContact(id);
  if (orders.length) deleteBtn.setAttribute("disabled", "true");

  const archiveBtn = form.querySelector("#archive-contact-btn");
  archiveBtn.addEventListener("click", onArchiveContact);

  wrapper.appendChild(form);

  return wrapper;
}

function selectNextContact() {
  const contactList = document.getElementById("contact-list");
  const currentContact = contactList.querySelector("li[data-selected]");

  if (contactList.hasChildNodes()) {
    let nextContact = currentContact.nextElementSibling;

    while (nextContact && nextContact.offsetParent === null) {
      nextContact = nextContact.nextElementSibling;
    }

    if (nextContact) selectContact(nextContact.dataset.contactId);
    else selectContact();
  }
}

function selectPreviousContact() {
  const contactList = document.getElementById("contact-list");
  const currentContact = contactList.querySelector("li[data-selected]");

  if (contactList.hasChildNodes()) {
    let previousContact = currentContact.previousElementSibling;

    while (previousContact && previousContact.offsetParent === null) {
      previousContact = previousContact.previousElementSibling;
    }

    if (previousContact) selectContact(previousContact.dataset.contactId);
    else selectContact(contactList.lastChild.dataset.contactId);
  }
}
