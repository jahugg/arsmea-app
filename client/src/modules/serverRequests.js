export async function contacts(archived = false) {
  let response;
  if (archived) response = await fetch(`${process.env.SERVER}/api/contactListArchived`);
  else response = await fetch(`${process.env.SERVER}/api/contactList`);
  return await response.json();
}

export async function contactDetails(id) {
  const response = await fetch(`${process.env.SERVER}/api/contact/${id}`);
  return await response.json();
}

export async function deleteContact(id) {
  try {
    const response = await fetch(`${process.env.SERVER}/api/contact/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.log(err);
  }
}

export async function newContact(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${process.env.SERVER}/api/contact`, {
    method: "POST",
    body: searchParams,
  });
  return await response.json();
}

export async function updateContact(id, data) {
  const response = await fetch(`${process.env.SERVER}/api/updateContact/${id}`, {
    method: "POST",
    body: data,
  });
  return await response.json();
}

export async function newOrder(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${process.env.SERVER}/api/order`, {
    method: "POST",
    body: searchParams,
  });
  return await response.json();
}

export async function orders(contactId) {
  let response;
  if (contactId) response = await fetch(`${process.env.SERVER}/api/searchOrdersByContactId/${contactId}`);
  else response = await fetch(`${process.env.SERVER}/api/orderList`);
  return await response.json();
}

export async function ordersByContact(contactId) {
  let response;
  response = await fetch(`${process.env.SERVER}/api/ordersByContact/${contactId}`);
  return await response.json();
}

export async function orderDetails(id) {
  const response = await fetch(`${process.env.SERVER}/api/order/${id}`);
  return await response.json();
}

export async function updateOrder(id, data) {
  const response = await fetch(`${process.env.SERVER}/api/updateOrder/${id}`, {
    method: "POST",
    body: data,
  });
  return await response.json();
}

export async function deleteOrder(id) {
  try {
    const response = await fetch(`${process.env.SERVER}/api/order/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.log(err);
  }
}
