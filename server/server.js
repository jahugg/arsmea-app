import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dbService from "./sqliteService.js";
dotenv.config();
const app = express();
const db = new dbService();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/api/contact", async (request, response) => {
  const data = request.body;
  const contactId = await db.insertContact(data);
  response.json({ id: contactId });
});

app.get("/api/contact/:id", async (request, response) => {
  const { id } = request.params;
  const contact = await db.selectContactById(id);
  response.json(contact);
});

app.get("/api/contactList", async (request, response) => {
  const contactList = await db.selectContacts();
  response.json(contactList);
});

app.get("/api/contactListArchived", async (request, response) => {
  const contactList = await db.selectArchivedContacts();
  response.json(contactList);
});

app.post("/api/updateContact/:id", async (request, response) => {
  const data = request.body;
  const result = await db.updateContact(data);
  response.json(result);
});

app.delete("/api/contact/:id", async (request, response) => {
  const { id } = request.params;
  // check if contact has open orders
  const orderList = await db.selectOrdersByContactId(id);
  if (orderList.length) {
    console.log("Deletion aborted. Contact with orders.");
    response.json({ success: "failed" });
  } else {
    const result = await db.deleteContact(id);
    response.json({ success: result });
  }
});

app.get("/api/searchContacts/:string", async (request, response) => {
  const { string } = request.params;
  const contactList = await db.searchContacts(string);
  response.json(contactList);
});

app.post("/api/order", async (request, response) => {
  const data = request.body;
  const { contactName, contactId } = data;
  // optionally create new contact
  if (contactId == 0) {
    let nameParts = contactName.split(" ");
    let userData = { firstname: nameParts[0] };
    if (nameParts.length > 1) {
      userData.lastname = nameParts[1];
    }
    const newContactId = await db.insertContact(userData);
    data.contactId = newContactId;
  }
  const orderId = await db.insertOrder(data);
  response.json({ id: orderId });
});

app.get("/api/order/:id", async (request, response) => {
  const { id } = request.params;
  const order = await db.selectOrderById(id);
  response.json(order);
});

app.get("/api/orderList", async (request, response) => {
  const orderList = await db.selectAllOrders();
  response.json(orderList);
});

app.post("/api/updateOrder/:id", async (request, response) => {
  const data = request.body;
  const result = await db.updateOrder(data);
  response.json(result);
});

app.delete("/api/order/:id", async (request, response) => {
  const { id } = request.params;
  const result = await db.deleteOrder(id);
  response.json({ success: result });
});

app.get("/api/ordersByContact/:id", async (request, response) => {
  const { id } = request.params;
  const contactList = await db.selectOrdersByContactId(id);
  response.json(contactList);
});

app.listen(process.env.PORT);
