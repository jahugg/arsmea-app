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

app.listen(process.env.PORT);
