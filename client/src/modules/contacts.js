import * as request from "./serverRequests";

let contacts;

export default async function render() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "contact";
  module.innerHTML = `
    <div id="contact-list-section">

      <button id="add-contact-btn" type="button">Add Contact</button>

      <label for="search-contact__input">Search</label>
      <input type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Mustafa"/>

      <div id="archive-toggle-wrapper" hidden>
        <input type="checkbox" id="archive-toggle">
        <label for="archive-toggle">Archived</label>
      </div>

      <div id="contact-list-wrapper">
      </div>
    </div>
    <div id="contact-detail-section">
    </div>`;

  const addButton = module.querySelector("#add-contact-btn");
  addButton.addEventListener("click", onPrepareNewContact);

  const searchInput = module.querySelector("#search-contact__input");
  searchInput.addEventListener("input", onSearchContact);

  const archiveToggle = module.querySelector("#archive-toggle");
  archiveToggle.addEventListener("input", onShowArchived);

  return module;
}

export async function init() {
  await refreshContactList();

  const url = new URL(window.location);
  let contactId = url.searchParams.get("id");
  selectContact(contactId);
}

async function selectContact(id) {
  const list = document.querySelector("#contact-list");
  let contactDetails = "";

  try {
    // get contact details
    contactDetails = await getContactAddressEl(id);
  } catch (error) {
    // select first visible list item if any
    const items = list.querySelectorAll("li");
    let firstVisibleItem;
    for (const item of items) {
      if (item.offsetParent !== null) {
        firstVisibleItem = item;
        break;
      }
    }
    if (firstVisibleItem) {
      id = firstVisibleItem.dataset.contactId;
      contactDetails = await getContactAddressEl(id);
    }
  }

  const detailsWrapper = document.querySelector("#contact-detail-section");

  if (contactDetails) {
    detailsWrapper.replaceChildren(contactDetails);

    for (let item of list.children)
      if (item.dataset.contactId == id) item.dataset.selected = "";
      else delete item.dataset.selected;

    // add contact id to url
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    const state = { contact_id: id };
    window.history.replaceState(state, "", url);
  } else detailsWrapper.innerHTML = "";
}

async function hideContact(id) {
  const contactList = document.getElementById("contact-list");
  const contactItem = contactList.querySelector(`li[data-contact-id="${id}"]`);
  contactItem.dataset.archived = "true";

  // select previous, first or no contact
  let selectContactId;
  if (contactList.childNodes.length) {
    const previousSibling = contactItem.previousSibling;
    if (previousSibling) selectContactId = previousSibling.dataset.contactId;
    else if (contactList.firstChild) selectContactId = contactList.firstChild.dataset.contactId;
  }
  selectContact(selectContactId);
}

async function refreshContactList() {
  contacts = await request.contacts();

  const contactListWrapper = document.querySelector("#contact-list-wrapper");
  const contactList = document.createElement("ul");
  contactList.id = "contact-list";

  let archiveCount = 0;

  for (let data of contacts) {
    const { id, firstname, lastname, archived } = data;
    let el = document.createElement("li");
    el.dataset.contactId = id;
    if (archived) {
      el.dataset.archived = true;
      archiveCount ++;
    }
    el.innerHTML = `${firstname ? firstname : ""} ${lastname ? lastname : ""}`;
    el.addEventListener("click", (event) => selectContact(event.target.dataset.contactId));
    contactList.appendChild(el);
  }

  contactListWrapper.replaceChildren(contactList);

  let archiveToggle = document.getElementById("archive-toggle-wrapper");
  if (archiveCount) {
    archiveToggle.removeAttribute("hidden");
    archiveToggle.querySelector("label").innerHTML = `Archive (${archiveCount})`
  } else {
    delete contactListWrapper.dataset.archive;
    archiveToggle.setAttribute("hidden", true);
  }
}

async function onShowArchived(event) {
  const checked = event.target.checked;
  const wrapper = document.getElementById("contact-list-wrapper").dataset;
  checked ? (wrapper.archive = "") : delete wrapper.archive;

  selectContact(0);
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
  <div>
    <label for="new-contact__firstname">First name</label>
    <input required type="text" pattern="[^0-9]*" name="firstname" id="new-contact__firstname" placeholder="Mustafa" />
  </div>
  <div>
    <label for="new-contact__lastname">Last name</label>
    <input type="text" pattern="[^0-9]*" name="lastname" id="new-contact__lastname" placeholder="Smith" />
  </div>
  <div>
    <label for="new-contact__company">Company</label>
    <input type="text" name="company" id="new-contact__company" placeholder="Märchen Inc."/>
  </div>
  <div>
    <label for="new-contact__address">Address</label>
    <textarea name="address" form="new-contact" name="address" id="new-contact__address" placeholder="Musterweg 34&#10;1234 Moon"></textarea>
  </div>
  <div>
    <label for="new-contact__email">Email</label>
    <input type="email" name="email" id="new-contact__email" placeholder="my@email.com" />
  </div>
  <div>
    <label for="new-contact__phone">Phone</label>
    <input type="tel" name="phone" id="new-contact__phone" placeholder="+41 XXX XX XX" />
  </div>
  <div>
    <label for="new-contact__notes">Notes</label>
    <textarea name="notes" id="new-contact__notes" placeholder="Lives abroad"></textarea>
  </div>
  <input type="submit" value="Create Contact"/>`;

  const discardBtn = document.createElement("button");
  discardBtn.type = "button";
  discardBtn.innerHTML = "Discard Contact";
  discardBtn.id = "discard-contact-btn";
  discardBtn.addEventListener("click", () => selectContact(0));

  wrapper.appendChild(form);
  wrapper.appendChild(discardBtn);
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

  await refreshContactList();
  selectContact(id);
}

async function onDeleteContact(event) {
  const contactId = event.target.dataset.contactId;

  if (window.confirm("Delete Contact?")) {
    const result = await request.deleteContact(contactId);
    hideContact(contactId);
  }
}

async function onArchiveContact(event) {
  const id = event.target.dataset.contactId;
  const data = new URLSearchParams({ id: id, archived: 1 });
  let response = await request.updateContact(id, data);

  hideContact(id);
}

async function onRestoreContact(event) {
  const id = event.target.dataset.contactId;
  const data = new URLSearchParams({ id: id, archived: 0 });
  let response = await request.updateContact(id, data);

  const contactListItem = document.querySelector(`#contact-list li[data-contact-id="${id}"]`);
  delete contactListItem.dataset.archived;

  await refreshContactList();

  selectContact(0);
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

  selectContact(0);
}

async function onUpdateContact(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const contactId = data.get("id");
  let response = await request.updateContact(contactId, data);

  await refreshContactList();

  const item = document.querySelector(`#contact-list li[data-contact-id="${contactId}"`);
  item.dataset.selected = "";

  selectContact(contactId);
}

async function getContactAddressEl(id) {
  let data = await request.contactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes, archived } = data;

  const wrapper = document.createElement("div");
  const contactDetails = document.createElement("div");
  contactDetails.id = "contact-details";
  let addressNode = document.createElement("address");
  addressNode.dataset.contactId = id;
  addressNode.innerHTML = `<div class="address__name">${firstname ? firstname : ""} ${lastname ? lastname : ""}</div>`;
  if (company) addressNode.innerHTML += `<div class="address__company">${company}</div>`;
  if (address) addressNode.innerHTML += `<div class="address__address">${address}</div>`;
  if (phone) addressNode.innerHTML += `<div class="address__tel"><a href="tel:${phone}">${phone}</a></div>`;
  if (email) addressNode.innerHTML += `<div class="address__email"<a href="mailto:${email}">${email}</a></div>`;
  if (notes) addressNode.innerHTML += `<div class="address__notes">${notes}</div>`;

  contactDetails.appendChild(addressNode);
  wrapper.appendChild(contactDetails);

  if (archived) {
    contactDetails.dataset.archived = "true";

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.innerHTML = "Restore Contact";
    restoreBtn.id = "restore-contact-btn";
    restoreBtn.dataset.contactId = id;
    restoreBtn.addEventListener("click", onRestoreContact);
    contactDetails.appendChild(restoreBtn);
  } else {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.id = "edit-btn";
    editBtn.innerHTML = "Edit";
    editBtn.dataset.contactId = id;
    editBtn.addEventListener("click", onEditContact);
    contactDetails.appendChild(editBtn);
  }

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
  form.innerHTML = `<input type="hidden" id="edit-contact__id" name="id" value="${id}">
    <div>
      <label for="edit-contact__firstname">First name</label>
      <input required type="text" pattern="[^0-9]*" name="firstname" autocapitalize="words" id="edit-contact__firstname" placeholder="Mustafa" value="${
        firstname ? firstname : ""
      }" />
    </div>
    <div>
      <label for="edit-contact__lastname">Last name</label>
      <input type="text" pattern="[^0-9]*" name="lastname" autocapitalize="words" id="edit-contact__lastname" placeholder="Schmied" value="${
        lastname ? lastname : ""
      }" />
    </div>
    <div>
      <label for="edit-contact__company">Company</label>
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
      <textarea name="notes" id="edit-contact__notes" placeholder="Notes">${notes ? notes : ""}</textarea>
    </div>
    <input type="submit" value="Save Changes"/>`;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete Contact";
  deleteBtn.id = "delete-contact-btn";
  deleteBtn.dataset.contactId = id;
  deleteBtn.addEventListener("click", onDeleteContact);

  const orders = await request.ordersByContact(id);
  if (orders.length) deleteBtn.setAttribute("disabled", "true");

  const archiveBtn = document.createElement("button");
  archiveBtn.type = "button";
  archiveBtn.innerHTML = "Archive Contact";
  archiveBtn.id = "archive-contact-btn";
  archiveBtn.dataset.contactId = id;
  archiveBtn.addEventListener("click", onArchiveContact);

  wrapper.appendChild(form);
  wrapper.appendChild(deleteBtn);
  wrapper.appendChild(archiveBtn);

  return wrapper;
}
