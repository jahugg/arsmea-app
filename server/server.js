import dbService from './sqliteService.js';
const db = new dbService();

// CORS Headers
// Change scope for production
const CORS_HEADERS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  },
};

const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // Respond to OPTIONS preflight request
    if (req.method === "OPTIONS") {
      return Response(null, { ...CORS_HEADERS, status: 204 });
    }

    // CONTACTS: get list of contacts
    if (method === 'GET' && path === '/api/contacts') {
      const archived = url.searchParams.get('archived');
      const contactList = await db.selectContacts(archived);
      return Response.json(contactList, { ...CORS_HEADERS, status: 200 });
    }

    // CONTACTS: create contact
    if (method === "POST" && path === '/api/contact') {
      const formData = await req.formData();
      const contactId = await db.insertContact(formData);
      return Response.json({ id: contactId }, { ...CORS_HEADERS, status: 200 });
    }

    // CONTACTS: get contact details
    if (method === 'GET' && path === '/api/contact') {
      const id = url.searchParams.get('id');
      const contact = await db.selectContactById(id);
      return Response.json(contact, { ...CORS_HEADERS, status: 200 });
    }

    // CONTACTS: update existing contact
    if (method === 'PUT' && path === '/api/contact') {
      const id = url.searchParams.get('id');
      const formData = await req.formData();
      const contact = await db.updateContact(formData);
      return Response.json(contact, { ...CORS_HEADERS, status: 200 });
    }

    // CONTACTS: delete contact
    if (method === "DELETE" && path === '/api/contact') {
      const id = url.searchParams.get('id');
      const result = await db.deleteContact(id);
      return Response(null, { ...CORS_HEADERS, status: 200 });

      // check if contact has open orders
      // const orderList = await db.selectOrdersByContactId(id);
      // if (orderList.length) {
      //   return new Response("Contact with orders", { status: 404 });
      // } else {
      //   const result = await db.deleteContact(id);
      //   return new Response("Item deleted", { status: 200 });
      // }
    }

    // CONTACTS: search contact
    if (method === "GET" && path === '/api/contact/search') {
      const string = url.searchParams.get('string');
      const contactList = await db.searchContactByName(string);
      return Response.json(contactList, { ...CORS_HEADERS });
    }

    // Handle other paths or methods
    return Response("Page not found", { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);


// app.get('/api/searchContacts/:string', async (request, response) => {
//   const { string } = request.params;
//   const contactList = await db.searchContacts(string);
//   response.json(contactList);
// });

// // orders
// app.post('/api/order', async (request, response) => {
//   const data = request.body;
//   const { contactName, contactId } = data;
//   // optionally create new contact
//   if (contactId == 0) {
//     let nameParts = contactName.split(' ');
//     let userData = { firstname: nameParts[0] };
//     if (nameParts.length > 1) {
//       userData.lastname = nameParts[1];
//     }
//     const newContactId = await db.insertContact(userData);
//     data.contactId = newContactId;
//   }
//   const orderId = await db.insertOrder(data);
//   response.json({ id: orderId });
// });

// app.get('/api/orderList', async (request, response) => {
//   const list = await db.selectAllOrders();
//   response.json(list);
// });

// app.get('/api/order/:id', async (request, response) => {
//   const { id } = request.params;
//   const order = await db.selectOrderById(id);
//   response.json(order);
// });

// app.post('/api/updateOrder/:id', async (request, response) => {
//   const data = request.body;
//   const result = await db.updateOrder(data);
//   response.json(result);
// });

// app.delete('/api/order/:id', async (request, response) => {
//   const { id } = request.params;
//   const result = await db.deleteOrder(id);
//   response.json({ success: result });
// });

// app.get('/api/ordersByContact/:id', async (request, response) => {
//   const { id } = request.params;
//   const orderList = await db.selectOrdersByContactId(id);
//   response.json(orderList);
// });

// app.get('/api/ordersByInvoice/:id', async (request, response) => {
//   const { id } = request.params;
//   const orderList = await db.selectOrdersByInvoiceId(id);
//   response.json(orderList);
// });

// app.get('/api/ordersWithinRange/', async (request, response) => {
//   const start = request.query.start;
//   const end = request.query.end;
//   const ordersList = await db.selectOrdersWithinRange(start, end);
//   response.json(ordersList);
// });

// // subscriptions
// app.post('/api/subscription', async (request, response) => {
//   const data = request.body;

//   // create new contact if not exists
//   if (data.contactId == 0) {
//     let nameParts = data.contactName.split(' ');
//     let userData = { firstname: nameParts[0] };
//     if (nameParts.length > 1) userData.lastname = nameParts[1];
//     const newContactId = await db.insertContact(userData);
//     data.contactId = newContactId;
//   }

//   data.price = data.pricePerOrder * data.frequency; // calculate full price
//   const subscription = await db.insertSubscription(data); // insert subscription

//   // generate orders for subscription
//   let frequency = Number(data.frequency);
//   let startDate = new Date(data.dateStart);
//   let timeParts = data.deliveryTime.split(':'); // split time string into [HH, MM]
//   let orders = [];

//   // create Orders
//   for (let i = 0; i < frequency; i++) {
//     // calculate order date
//     let date = new Date();
//     date.setDate(startDate.getDate() + i * Number(data.interval));
//     date.setUTCHours(timeParts[0], timeParts[1], 0, 0); // add delivery time to date

//     let orderObj = {
//       contact_id: data.contactId,
//       invoice_id: subscription.invoiceId,
//       datetime_due: date.toISOString().split('.')[0], //remove milliseconds and "Z" for UTC
//       description: data.description,
//     };

//     orders.push(orderObj);
//   }

//   // insert orders
//   const ordersCount = await db.insertMultipleOrders(orders); // insert subscription
//   subscription.ordersCount = ordersCount;

//   response.json(subscription);
// });

// app.delete('/api/subscription/:id', async (request, response) => {
//   const { id } = request.params;
//   // delete subscription, orders and invoice
//   const result = await db.deleteSubscription(id);
//   // const result = await db.deleteEntry('invoices', id);
//   response.json({ success: result });
// });

// app.get('/api/subscriptionList', async (request, response) => {
//   const list = await db.selectAllSubscriptions();
//   response.json(list);
// });

// app.get('/api/subscription/:id', async (request, response) => {
//   const { id } = request.params;
//   const invoice = await db.selectSubscriptionById(id);
//   response.json(invoice);
// });

// app.get('/api/subscriptionsByContact/:id', async (request, response) => {
//   const { id } = request.params;
//   const list = await db.selectSubscriptionsByContactId(id);
//   response.json(list);
// });

// // invoices
// app.post('/api/invoice', async (request, response) => {
//   const data = request.body;
//   const { contactName, contactId } = data;
//   // optionally create new contact
//   if (contactId == 0) {
//     let nameParts = contactName.split(' ');
//     let userData = { firstname: nameParts[0] };
//     if (nameParts.length > 1) {
//       userData.lastname = nameParts[1];
//     }
//     const newContactId = await db.insertContact(userData);
//     data.contactId = newContactId;
//   }
//   const invoiceId = await db.insertInvoice(data);
//   response.json({ id: invoiceId });
// });

// app.get('/api/invoiceList', async (request, response) => {
//   const list = await db.selectAllInvoices();
//   response.json(list);
// });

// app.delete('/api/invoice/:id', async (request, response) => {
//   const { id } = request.params;
//   const result = await db.deleteInvoice(id);
//   // const result = await db.deleteEntry('invoices', id);
//   response.json({ success: result });
// });

// app.get('/api/invoiceListOpen', async (request, response) => {
//   const list = await db.selectOpenInvoices();
//   response.json(list);
// });

// app.get('/api/invoice/:id', async (request, response) => {
//   const { id } = request.params;
//   const invoice = await db.selectInvoiceById(id);
//   response.json(invoice);
// });

// app.post('/api/updateInvoice/:id', async (request, response) => {
//   const data = request.body;
//   const result = await db.updateInvoice(data);
//   response.json(result);
// });

// app.get('/api/invoicesByContact/:id', async (request, response) => {
//   const { id } = request.params;
//   const invoiceList = await db.selectInvoicesByContactId(id);
//   response.json(invoiceList);
// });

// app.post('/api/invoiceSetPaid/:id', async (request, response) => {
//   const { id } = request.params;
//   console.log(id);
//   const result = await db.updateInvoicePaidStatus(id);
//   response.json(result);
// });

// app.listen(process.env.PORT);
