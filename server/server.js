import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
const db = new Database("./database.db");
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/api/contact", async (request, response) => {
  const data = request.body;
  const { firstname } = data;
  const query = db.prepare(`INSERT INTO contacts (firstname, date_added) VALUES (?, date('now'))`);
  const result = query.run(firstname);

  response.json({ id: result.lastInsertRowid });
});

app.get("/api/contact/:id", async (request, response) => {
  const { id } = request.params;
  const query = db.prepare("SELECT * FROM contacts WHERE id = ?");
  const contact = query.get(id);
  response.json(contact);
});

app.get("/api/contactList", async (request, response) => {
  const query = db.prepare("SELECT id, firstname, lastname FROM contacts ORDER BY lastname");
  const contactList = query.all();
  response.json(contactList);
});

app.post("/api/updateContact/:id", async (request, response) => {
  const { id } = request.params;
  const data = request.body;
  delete data.id;
  const { firstname, lastname, company, address, email, phone, notes } = data;
  const query = db.prepare("UPDATE contacts SET firstname = ?, lastname = ?, company = ?, address = ?, email = ?, phone = ?, notes = ? WHERE id = ?");
  const result = query.run(firstname, lastname, company, address, email, phone, notes, id);
  response.json(result);
});

app.delete("/api/contact/:id", async (request, response) => {
  const { id } = request.params;
  const query = db.prepare("DELETE FROM contacts WHERE id = ?");
  const result = query.run(id);
  response.json({ success: result });
});

app.get("/api/searchContacts/:string", async (request, response) => {
  const { string } = request.params;
  const query = db.prepare("SELECT * FROM contacts WHERE firstname LIKE ? OR lastname LIKE ?");
  const contactList = query.all(`%${string}%`, `%${string}%`);
  response.json(contactList);
});

app.post("/api/order", async (request, response) => {
  const data = request.body;
  const { contact, contactId, due, price, description } = data;
  if (contactId == 0) {
    console.log("create a new contact before proceeding");
  }
  const query = db.prepare(
    `INSERT INTO orders (contact_id, datetime_placed, datetime_due, price, description, status)
    VALUES (?, datetime('now'), ?, ?, ?, 'open')`
  );
  const result = query.run(contactId, due, price, description);
  response.json({ id: result.lastInsertRowid });
});

app.get("/api/order/:id", async (request, response) => {
  const { id } = request.params;
  const query = db.prepare(`SELECT * FROM orders INNER JOIN contacts ON orders.contact_id=contacts.id WHERE orders.id = ?`);
  const contact = query.get(id);
  response.json(contact);
});

app.get("/api/orderList", async (request, response) => {
  const query = db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, contacts.firstname, contacts.lastname
  FROM orders 
  INNER JOIN contacts 
  ON orders.contact_id=contacts.id 
  ORDER BY orders.datetime_due, orders.status`);
  const contactList = query.all();
  response.json(contactList);
});

app.post("/api/updateOrder/:id", async (request, response) => {
  const { id } = request.params;
  const data = request.body;
  delete data.id;
  const { duedate, status, price, description } = data;
  const query = db.prepare(
    "UPDATE orders SET datetime_placed = datetime('now'), datetime_due = ?, status = ?, price = ?, description = ? WHERE id = ?"
  );
  const result = query.run(duedate, status, price, description, id);
  response.json(result);
});

app.delete("/api/order/:id", async (request, response) => {
  const { id } = request.params;
  const query = db.prepare("DELETE FROM orders WHERE id = ?");
  const result = query.run(id);
  response.json({ success: result });
});

app.listen(process.env.PORT);
