// API url (use process.env.SERVER for prod)
const apiUrl = window.appConfig.apiUrl;

// contacts
export async function contacts(archived = false) {
  let response;
  if (archived) response = await fetch(`${apiUrl}/api/contactListArchived`);
  else response = await fetch(`${apiUrl}/api/contactList`);
  return await response.json();
}

export async function contactDetails(id) {
  const response = await fetch(`${apiUrl}/api/contact/${id}`);
  return await response.json();
}

export async function deleteContact(id) {
  try {
    const response = await fetch(`${apiUrl}/api/contact/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

export async function newContact(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${apiUrl}/api/contact`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function updateContact(id, data) {
  const response = await fetch(`${apiUrl}/api/updateContact/${id}`, {
    method: 'POST',
    body: data,
  });
  return await response.json();
}

// orders
export async function newOrder(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${apiUrl}/api/order`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function orders() {
  let response = await fetch(`${apiUrl}/api/orderList`);
  return await response.json();
}

export async function ordersByContact(contactId) {
  let response = await fetch(`${apiUrl}/api/ordersByContact/${contactId}`);
  return await response.json();
}

export async function ordersByInvoice(invoiceId) {
  let response = await fetch(`${apiUrl}/api/ordersByInvoice/${invoiceId}`);
  return await response.json();
}

export async function ordersWithinRange(start, end) {
  // get String and set Time
  const startDateString = start.getDateString() + 'T00:00';
  const endDateString = end.getDateString() + 'T23:59';

  try {
    let response;
    response = await fetch(`${apiUrl}/api/ordersWithinRange/?start=${startDateString}&end=${endDateString}`);
    return await response.json();
  } catch (err) {
    console.log(err);
  }
}

export async function orderDetails(id) {
  const response = await fetch(`${apiUrl}/api/order/${id}`);
  return await response.json();
}

export async function updateOrder(id, data) {
  const response = await fetch(`${apiUrl}/api/updateOrder/${id}`, {
    method: 'POST',
    body: data,
  });
  return await response.json();
}

export async function deleteOrder(id) {
  try {
    const response = await fetch(`${apiUrl}/api/order/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

// subscriptions
export async function subscriptions() {
  let response = await fetch(`${apiUrl}/api/subscriptionList`);
  return await response.json();
}

export async function newSubscription(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${apiUrl}/api/subscription`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function subscriptionDetails(id) {
  const response = await fetch(`${apiUrl}/api/subscription/${id}`);
  return await response.json();
}

export async function subscriptionsByContact(contactId) {
  let response = await fetch(`${apiUrl}/api/subscriptionsByContact/${contactId}`);
  return await response.json();
}

export async function deleteSubscription(id) {
  try {
    const response = await fetch(`${apiUrl}/api/subscription/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

// invoices
export async function invoices() {
  const response = await fetch(`${apiUrl}/api/invoiceList`);
  return await response.json();
}

export async function newInvoice(data) {
  let searchParams = new URLSearchParams(data);
  const response = await fetch(`${apiUrl}/api/invoice`, {
    method: 'POST',
    body: searchParams,
  });
  return await response.json();
}

export async function invoicesByContact(contactId) {
  let response = await fetch(`${apiUrl}/api/invoicesByContact/${contactId}`);
  return await response.json();
}

export async function updateInvoice(id, data) {
  const response = await fetch(`${apiUrl}/api/updateInvoice/${id}`, {
    method: 'POST',
    body: data,
  });
  return await response.json();
}

export async function invoicesOpen() {
  const response = await fetch(`${apiUrl}/api/invoiceListOpen`);
  return await response.json();
}

export async function deleteInvoice(id) {
  try {
    const response = await fetch(`${apiUrl}/api/invoice/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.log(err);
  }
}

export async function invoiceDetails(id) {
  const response = await fetch(`${apiUrl}/api/invoice/${id}`);
  return await response.json();
}

export async function setInvoicePaid(id) {
  const response = await fetch(`${apiUrl}/api/invoiceSetPaid/${id}`, {
    method: 'POST',
  });
  return await response.json();
}

export async function setInvoiceOpen(id) {
  console.log("set open");
  // const response = await fetch(`${apiUrl}/api/invoiceSetOpen/${id}`);
  // return await response.json();
}