import * as request from "./serverRequests";

export default async function () {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "contact";
  module.innerHTML = `
    <div id="contact-list-section">
      <button id="add-contact-btn" type="button">Add Contact</button>
      <form action="${process.env.SERVER}/api/searchContacts" method="POST" id="search-contact">
        <label for="search-contact__input">Search</label>
        <input type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Search"/>
      </form>
      <div id="contact-list-wrapper">
      </div>
    </div>
    <div id="contact-detail-section">
    </div>`;

  const addButton = module.querySelector("#add-contact-btn");
  addButton.addEventListener("click", onAddContact);

  const searchInput = module.querySelector("#search-contact__input");
  searchInput.addEventListener("input", onSearchContact);

  const contactListWrapper = module.querySelector("#contact-list-wrapper");
  const contactList = await getContactListEl();
  contactListWrapper.appendChild(contactList);

  const url = new URL(window.location);
  let contactId = url.searchParams.get("id");
  selectContact(contactId, module);

  return module;
}

async function selectContact(id, node) {
  const list = node.querySelector("#contact-list");
  let contactDetails = "";

  try {
    // get contact details
    contactDetails = await getContactAddressEl(id);
  } catch (error) {
    // select first list item if any
    if (list.firstChild) {
      const firstItem = list.firstChild;
      id = firstItem.dataset.contactId;
      contactDetails = await getContactAddressEl(id);
    }
  }

  if (contactDetails) {
    const detailsWrapper = node.querySelector("#contact-detail-section");
    detailsWrapper.replaceChildren(contactDetails);

    for (let item of list.children)
      if (item.dataset.contactId == id) item.dataset.selected = "";
      else delete item.dataset.selected;

    // add contact id to url
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    const state = { contact_id: id };
    window.history.replaceState(state, "", url);
  }
}

async function onEditContact(event) {
  const id = event.target.dataset.contactId;
  const contactDetailsWrapper = document.getElementById("contact-detail-section");
  const form = await getContactFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
  form.querySelector("#edit-contact__firstname").select();
}

async function onAddContact(event) {
  const response = await request.newContact();
  const id = response.id;

  const contactListWrapper = document.getElementById("contact-list-wrapper");
  const contactList = await getContactListEl();
  contactListWrapper.replaceChildren(contactList);

  const item = document.querySelector(`#contact-list li[data-contact-id="${id}"`);
  item.dataset.selected = "";

  const contactDetailsWrapper = document.getElementById("contact-detail-section");
  const form = await getContactFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
  form.querySelector("#edit-contact__firstname").select();
}

async function onDeleteContact(event) {
  const contactId = event.target.dataset.contactId;
  const result = await request.deleteContact(contactId);

  // implement confirm contact deletion

  const contactList = document.getElementById("contact-list");
  const contactItem = contactList.querySelector(`li[data-contact-id="${contactId}"]`);
  const previousSibling = contactItem.previousSibling;
  contactItem.remove();

  // select previous, first or no contact
  if (contactList.childNodes.length) {
    let selectContactId;
    if (previousSibling) {
      selectContactId = previousSibling.dataset.contactId;
      previousSibling.dataset.selected = "";
    } else if (contactList.firstChild) {
      selectContactId = contactList.firstChild.dataset.contactId;
      contactList.firstChild.dataset.selected = "";
    }
    const contactDetailsWrapper = document.getElementById("contact-detail-section");
    const contactDetails = await getContactAddressEl(selectContactId);
    contactDetailsWrapper.replaceChildren(contactDetails);
  } else {
    const contactDetailsWrapper = document.getElementById("contact-detail-section");
    contactDetailsWrapper.innerHTML = "";
  }
}

async function onSearchContact(event) {
  const searchString = event.target.value;

  const contactListWrapper = document.getElementById("contact-list-wrapper");
  const contactList = await getContactListEl(searchString);
  contactListWrapper.replaceChildren(contactList);

  const firstChild = contactList.firstChild;
  if (firstChild) {
    firstChild.dataset.selected = "";

    const contactDetailsWrapper = document.getElementById("contact-detail-section");
    const address = await getContactAddressEl(firstChild.dataset.contactId);
    contactDetailsWrapper.replaceChildren(address);
  }
}

async function onUpdateContact(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const contactId = data.get("id");
  // pass as FORM DATA directly...?
  // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#body
  let response = await request.updateContact(contactId, data);

  const contactListWrapper = document.getElementById("contact-list-wrapper");
  const contactList = await getContactListEl();
  contactListWrapper.replaceChildren(contactList);

  const item = document.querySelector(`#contact-list li[data-contact-id="${contactId}"`);
  item.dataset.selected = "";

  const contactDetailsWrapper = document.getElementById("contact-detail-section");
  const address = await getContactAddressEl(contactId);
  contactDetailsWrapper.replaceChildren(address);
}

async function getContactListEl(searchString) {
  let contacts = await request.contacts(searchString);
  const list = document.createElement("ul");
  list.id = "contact-list";

  for (let data of contacts) {
    const { id, firstname, lastname } = data;
    let el = document.createElement("li");
    el.dataset.contactId = id;
    el.innerHTML = `${firstname ? firstname : ""} ${lastname ? lastname : ""}`;
    el.addEventListener("click", (event) => selectContact(event.target.dataset.contactId, document));
    // el.addEventListener("click", onSelectContact);
    list.appendChild(el);
  }

  return list;
}

async function getContactAddressEl(id) {
  let data = await request.contactDetails(id);
  const { firstname, lastname, company, address, email, phone, notes } = data;

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

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "edit-btn";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.contactId = id;
  editBtn.addEventListener("click", onEditContact);

  contactDetails.appendChild(addressNode);
  contactDetails.appendChild(editBtn);
  wrapper.appendChild(contactDetails);

  // display orders of contact
  const orders = await request.ordersByContact(id);
  if (orders) {
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
      <input required type="text" pattern="[^0-9]*" name="firstname" id="edit-contact__firstname" placeholder="First name" value="${
        firstname ? firstname : ""
      }" />
    </div>
    <div>
      <label for="edit-contact__lastname">Last name</label>
      <input required type="text" pattern="[^0-9]*" name="lastname" id="edit-contact__lastname" placeholder="Last name" value="${
        lastname ? lastname : ""
      }" />
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
      <textarea name="notes" id="edit-contact__notes" placeholder="Notes">${notes ? notes : ""}</textarea>
    </div>
    <input type="submit" value="Done"/>`;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete Contact";
  deleteBtn.id = "delete-contact-btn";
  deleteBtn.dataset.contactId = id;
  deleteBtn.addEventListener("click", onDeleteContact);

  wrapper.appendChild(form);
  wrapper.appendChild(deleteBtn);

  return wrapper;
}
