// contacts
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
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

export async function newContact(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${process.env.SERVER}/api/contact`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function updateContact(id, data) {
  const response = await fetch(`${process.env.SERVER}/api/updateContact/${id}`, {
    method: 'POST',
    body: data,
  });
  return await response.json();
}

// orders
export async function newOrder(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${process.env.SERVER}/api/order`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function ordersByContact(contactId) {
  let response = await fetch(`${process.env.SERVER}/api/ordersByContact/${contactId}`);
  return await response.json();
}

export async function orderDetails(id) {
  const response = await fetch(`${process.env.SERVER}/api/order/${id}`);
  return await response.json();
}

export async function updateOrder(id, data) {
  const response = await fetch(`${process.env.SERVER}/api/updateOrder/${id}`, {
    method: 'POST',
    body: data,
  });
  return await response.json();
}

export async function deleteOrder(id) {
  try {
    const response = await fetch(`${process.env.SERVER}/api/order/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

export async function ordersWithinRange(start, end) {
  // get String and set Time
  const startDateString = start.getDateString() + 'T00:00';
  const endDateString = end.getDateString() + 'T23:59';

  try {
    let response;
    response = await fetch(`${process.env.SERVER}/api/ordersWithinRange/?start=${startDateString}&end=${endDateString}`);
    return await response.json();
  } catch (err) {
    console.log(err);
  }
}

// subscriptions
export async function subscriptions() {
  let response = await fetch(`${process.env.SERVER}/api/subscriptionList`);
  return await response.json();
}

export async function newSubscription(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${process.env.SERVER}/api/subscription`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

