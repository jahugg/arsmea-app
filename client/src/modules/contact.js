export function render() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("id")) {
    const contactId = params.get("id");

    fetch(`${process.env.SERVER}/api/getContactById/${contactId}`)
      .then((response) => response.json())
      .then((data) => displayContactData(data[0]))
      .catch((error) => console.log(error));
  } else window.location.replace("/contacts");
}

function displayContactData(data) {
  const { id, firstname, lastname, company, address, email, phone, notes } = data;
  const main = document.getElementsByTagName("MAIN")[0];
  main.innerHTML = "";

  let addressNode = document.createElement("address");
  addressNode.dataset.contactId = id;
  addressNode.innerHTML = `<h1>${firstname} ${lastname}</h1>`;
  if (company) addressNode.innerHTML += `<p>${company}</p>`;
  if (address) addressNode.innerHTML += `<p>${address}</p>`;
  if (notes) addressNode.innerHTML += `<p>${notes}</p>`;
  if (phone) addressNode.innerHTML += `<a href="tel:${phone}">${phone}</a>`;
  if (email) addressNode.innerHTML += `<a href="mailto:${email}">${email}</a>`;

  main.appendChild(addressNode);

  let form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateContact`;
  form.method = "POST";
  form.id = "edit-contact";
  form.classList.add("form");
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
    <textarea name="address" form="edit-contact" name="address" id="edit-contact__address" placeholder="Address">
    ${address ? address : ""}
    </textarea>
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
    <textarea form="edit-contact" name="notes" id="edit-contact__notes" placeholder="Notes">
      ${notes ? notes : ""}
    </textarea>
  </div>
  <input type="submit" value="Save Changes"/>`;
  main.appendChild(form);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.contactId = id;
  deleteBtn.addEventListener("click", handleContactActions);
  main.appendChild(deleteBtn);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.contactId = id;
  editBtn.addEventListener("click", handleContactActions);
  main.appendChild(editBtn);
}

function handleContactActions(event) {
  const dataset = event.target.dataset;
  const contactId = event.target.dataset.contactId;
  if (dataset.action === "delete") deleteContactById(contactId);
  else if (dataset.action === "edit") console.log("edit " + contactId);
}

function deleteContactById(id) {
  fetch(`${process.env.SERVER}/api/deleteContactById/${id}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => { if (data.success) window.location.href = `/contacts`})
    .catch((error) => console.log(error));
}

function submitContactUpdate(event) {
  event.preventDefault();
  fetch(event.target.action, {
    method: event.target.method,
    body: new URLSearchParams(new FormData(event.target)),
  })
    .then((response) => response.json())
    .then((body) => (window.location.href = `/contact?id=${body.id}`))
    .catch((error) => console.log(error));
}
