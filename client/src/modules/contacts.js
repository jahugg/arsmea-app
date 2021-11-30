const serverURL = "http://localhost:5123";

export function render() {
  const params = new URLSearchParams(window.location.search);
  main.innerHTML = `
    <h1>Contacts</h1>
    <form action="${serverURL}/api/searchContactByName" method="POST" id="search-contact" class="form">
    <div>
        <input list="search-contact__list" type="text" pattern="[^0-9]*" name="input" id="search-contact__input" placeholder="Name" required/>
        <datalist id="search-contact__list"></datalist>
    </div>
    <input type="submit" value="Search"/>
    </form>`;

  const form = document.getElementById("search-contact");
  form.addEventListener("submit", searchContact);

  const searchInput = document.getElementById("search-contact__input");
  searchInput.addEventListener("input", searchContact);
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
