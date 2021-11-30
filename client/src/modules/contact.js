const serverURL = "http://localhost:5123";

export function render() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("id")) {
    const userId = params.get("id");

    fetch(`${serverURL}/api/getContactById/${userId}`)
      .then((response) => response.json())
      .then((data) => displayUserData(data[0]))
      .catch((error) => console.log(error));
  } else window.location.replace('/contacts');
}

function displayUserData(data) {
  main.innerHTML = `<h1>${data.firstname} ${data.lastname}</h1>`;
  if (data.company) main.innerHTML += `<p>${data.company}</p>`;
  if (data.phone) main.innerHTML += `<p>${data.phone}</p>`;
  if (data.email) main.innerHTML += `<p>${data.email}</p>`;
  if (data.address) main.innerHTML += `<p>${data.address}</p>`;
  if (data.notes) main.innerHTML += `<p>${data.notes}</p>`;
}
