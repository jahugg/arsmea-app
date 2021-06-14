export function render() {
  const serverURL = "http://localhost:5000";
  const params = new URLSearchParams(window.location.search);

  if (params.has("id")) {
    const userId = params.get("id");

    fetch(`${serverURL}/api/getContactById/${userId}`)
      .then((response) => response.json())
      .then((userData) => displayUserData(userData))
      .catch((error) => console.log(error));
  }
}

function displayUserData(userData) {
  const user = userData.user[0];
  let main = document.getElementById("main");
  main.innerHTML = `
    <h1>${user.firstname} ${user.lastname}</h1>
    <p>Address: ${user.address}</p>
    <p>Phone: ${user.phone}</p>
    <p>Email: ${user.email}</p>
  `;
}
