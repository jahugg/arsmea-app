export function render() {
  const main = document.getElementsByTagName("MAIN")[0];
  const params = new URLSearchParams(window.location.search);
  main.innerHTML = `
    <h1>Contacts</h1>
    <div>
      <form action="${process.env.SERVER}/api/searchContacts" method="POST" id="search-contact" class="form">
          <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Search"/>
      </form>
      <div id="contact-list">
      </div>
    <div>
    <div id="contact-details">
    <div>`;

  const searchInput = document.getElementById("search-contact__input");
  searchInput.addEventListener("input", searchContact);

  displayAllContacts();
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

  for (let contact of contacts) {
    let el = document.createElement("li");
    el.dataset.contactId = contact.id;
    el.innerHTML = `${contact.firstname} ${contact.lastname}`;
    el.addEventListener("click", showContactDetails);
    list.appendChild(el);
    lastId = contact.id;
  }

  // display details of first contact
  fetch(`${process.env.SERVER}/api/getContactById/${contacts[0].id}`)
    .then((response) => response.json())
    .then((data) => showContactDetails(data[0]))
    .catch((error) => console.log(error));
}

function showContactDetails(data) {
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
}
