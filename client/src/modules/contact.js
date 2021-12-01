export function render() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("id")) {
    const userId = params.get("id");

    fetch(`${process.env.SERVER}/api/getContactById/${userId}`)
      .then((response) => response.json())
      .then((data) => displayUserData(data[0]))
      .catch((error) => console.log(error));
  } else window.location.replace('/contacts');
}

function displayUserData(data) {
  let address = document.createElement("address");
  address.innerHTML = `<h1>${data.firstname} ${data.lastname}</h1>`;
  if (data.company) address.innerHTML += `<p>${data.company}</p>`;
  if (data.address) address.innerHTML += `<p>${data.address}</p>`;
  if (data.notes) address.innerHTML += `<p>${data.notes}</p>`;
  if (data.phone) address.innerHTML += `<a href="tel:${data.phone}">${data.phone}</a>`;
  if (data.email) address.innerHTML += `<a href="mailto:${data.email}">${data.email}</a>`;

  const main = document.getElementsByTagName("MAIN")[0];
  main.innerHTML = "";
  main.appendChild(address);
}
