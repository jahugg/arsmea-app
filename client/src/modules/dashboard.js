export function render() {
  main.innerHTML = `
  <h1>Create New Contact</h1>
    <form action="http://localhost:5123/api/insertContact" method="POST" id="new-contact" class="form">
    <div>
        <label for="new-contact__firstname">First name</label>
        <input type="text" pattern="[^0-9]*" name="firstname" id="new-contact__firstname" placeholder="First name" required/>
    </div>
    <div>
        <label for="new-contact__lastname">Last name</label>
        <input type="text" pattern="[^0-9]*" name="lastname" id="new-contact__lastname" placeholder="Last name" required/>
    </div>
    <div>
        <label for="new-contact__company">Company name</label>
        <input type="text" name="company" id="new-contact__company" placeholder="Company" />
    </div>
    <div>
        <label for="new-contact__address">Address</label>
        <textarea name="address" form="new-contact" name="address" id="new-contact__address" placeholder="Address"></textarea>
    </div>
    <div>
        <label for="new-contact__email">Email</label>
        <input type="email" name="email" id="new-contact__email" placeholder="Email" />
    </div>
    <div>
        <label for="new-contact__phone">Phone</label>
        <input type="tel" name="phone" id="new-contact__phone" placeholder="Phone" />
    </div>
    <div>
        <label for="new-contact__notes">Notes</label>
        <textarea form="new-contact" name="notes" id="new-contact__notes" placeholder="Notes"></textarea>
    </div>
    <input type="submit" value="Create Contact"/>
    </form>
  `;

  let form = document.getElementById("new-contact");
  form.addEventListener("submit", submitNewContact);
}

function submitNewContact(event) {
  event.preventDefault();
  fetch(event.target.action, {
    method: event.target.method,
    body: new URLSearchParams(new FormData(event.target)),
  })
    .then((response) => response.json())
    .then((body) => (window.location.href = `/contact?id=${body.id}`))
    .catch((error) => console.log(error));
}
