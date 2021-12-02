export function render() {
  const main = document.getElementsByTagName("MAIN")[0];
  const params = new URLSearchParams(window.location.search);
  main.innerHTML = `
    <h1>Contacts</h1>
    <form action="${process.env.SERVER}/api/searchContacts" method="POST" id="search-contact" class="form">
        <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Name"/>
    </form>
    <div id="contact-list">
    </div>`;

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
    el.innerHTML = `${contact.firstname} ${contact.lastname}`;
    list.appendChild(el);
  }
}
