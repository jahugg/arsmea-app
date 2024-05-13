import { Database } from "bun:sqlite";
import { sortAndDeduplicateDiagnostics } from "typescript";

/* Notes:
all updates functions could probably be joined into single function */

export default class DBService {
  static db;
  constructor() {
    this.db = this.db ? this.db : new Database('./database.db');
  }

  // ==========
  // Contacts
  async insertContact(formData) {

    // delete empty or undefined entries
    const dataEntries = formData.entries();
    for (const [key, value] of dataEntries) {
      if (!value || value === undefined) {
        formData.delete(key);
      }
    }

    // convert keys and values into array
    const dataKeys = [...formData.keys()];
    const dataValues = [...formData.values()];

    // cunstruct query string
    let queryString = 'INSERT INTO contacts (date_added';
    dataKeys.forEach((key) => {
      queryString += `, ${key}`;
    });
    queryString += `) VALUES (date('now')`;
    dataKeys.forEach(() => {
      queryString += `, ?`;
    });
    queryString += `) RETURNING id`;

    try {
      const query = this.db.query(queryString);
      const result = await query.get(dataValues);
      const id = result.id;

      return id;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContactById(id) {
    try {
      const query = this.db.prepare('SELECT * FROM contacts WHERE id = ?');
      const contact = query.get(id);
      return contact;
    } catch (error) {
      console.log(error);
    }
  }

  async selectContacts(archived = false) {
    try {
      let query;
      if (archived) query = this.db.prepare('SELECT id, firstname, lastname, archived FROM contacts WHERE archived = 1 ORDER BY lastname COLLATE NOCASE');
      else query = this.db.prepare('SELECT id, firstname, lastname, archived FROM contacts WHERE archived = 0 ORDER BY lastname COLLATE NOCASE');
      const contactList = query.all();
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateContact(formData) {
    const id = formData.get("id");
    formData.delete("id");

    // convert keys and values into array
    const dataKeys = [...formData.keys()];
    const dataValues = [...formData.values()];

    // cunstruct query string
    let queryString = 'UPDATE contacts SET ';
    dataKeys.forEach((key, i) => {
      if (i !== 0) queryString += `, `;
      queryString += `${key} = ?`;
    });
    queryString += ` WHERE id = ${id}`;

    try {
      const query = this.db.prepare(queryString);
      const result = query.run(dataValues);
      return result;
    } catch (error) { throw error; }
  }

  async deleteContact(id) {
    try {
      const query = this.db.prepare('DELETE FROM contacts WHERE id = ?');
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async searchContactByName(string) {
    try {
      const query = this.db.prepare('SELECT * FROM contacts WHERE archived = 1 AND firstname LIKE ? OR lastname LIKE ?');
      const contactList = query.all(`%${string}%`, `%${string}%`);
      return contactList;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Inserts a new order into the database.
   * @async
   * @param {FormData} formData - The form data containing order details.
   * @returns {number} - The ID of the newly inserted order.
   */
  async insertOrder(formData) {
    try {
      // Validate form data
      if (!formData || !(formData instanceof FormData)) {
        throw new Error("Invalid form data provided");
      }

      // Extract form data
      const contactId = formData.get("contactId");
      const notes = formData.get("notes");
      const dueDatetime = formData.get("dueDatetime");
      const description = formData.getAll("description[]");
      let price = formData.getAll("price[]").map(value => Number(value, 10));

      // Validate form fields
      if (!contactId || !dueDatetime || !description || !price || description.length !== price.length) {
        throw new Error("Incomplete or invalid form data provided");
      }

      // combine description and price into a single array
      const orderItems = description.map((text, index) => ({
        description: text,
        price: price[index]
      }));

      // determine total price
      let totalPrice = 0;
      for (const value of price)
        totalPrice += value;

      // create transation for new order
      const orderTransaction = this.db.transaction(() => {

        // insert order
        const orderQuery = this.db.prepare(`
          INSERT INTO orders (contact_id, notes, datetime_placed)
          VALUES (?, ?, datetime('now')) RETURNING id;
        `);
        const result = orderQuery.get(contactId, notes);
        const orderId = result.id;

        // insert invoice
        const invoiceQuery = this.db.prepare(`
          INSERT INTO order_invoices (order_id, amount_total, status, date_issued, date_due)
          VALUES (?, ?, 'open', date('now'), date('now','+15 day'))
        `);
        invoiceQuery.run(orderId, totalPrice);

        // insert order items
        const itemQuery = this.db.prepare(`
          INSERT INTO order_items (order_id, type, description, price, status, datetime_due)
          VALUES (?, 'item', ?, ?, 'open', ?)
        `);

        for (const item of orderItems)
          itemQuery.run(orderId, item.description, item.price, dueDatetime);

        return orderId;
      });

      // run transation
      const orderId = orderTransaction();

      return orderId;
    } catch (error) { throw error; }


    // insert order items

  }

  async selectAllOrders() {
    try {
      const query = this.db.prepare(`
        SELECT order_items.*, 
               contacts.firstname, contacts.lastname
        FROM order_items
        INNER JOIN orders ON order_items.order_id = orders.id
        INNER JOIN contacts ON orders.contact_id = contacts.id
        ORDER BY order_items.datetime_due
      `);
      const list = query.all();
      return list;
    } catch (error) { throw error; }
  }


  /**
   * Select relevant orders.
   * Includes orders from two days ago up until two weeks. Selects the next 10 entries
   * to avoid empty lists if no orders are present in the next two weeks.
   * @async
   * @param {FormData} formData - The form data containing order details.
   * @returns {number} - The ID of the newly inserted order.
   */
  async selectRelevantOrders() {
    try {
      // set default date range
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 17);

      const query = this.db.prepare(`
        SELECT order_items.*,
               orders.id,
               contacts.firstname, contacts.lastname
        FROM order_items
        INNER JOIN orders ON order_items.order_id = orders.id
        INNER JOIN contacts ON orders.contact_id = contacts.id
        WHERE order_items.datetime_due BETWEEN ? AND ?

        UNION

        SELECT order_items.*,
               orders.id,
               contacts.firstname, contacts.lastname
        FROM order_items
        INNER JOIN orders ON order_items.order_id = orders.id
        INNER JOIN contacts ON orders.contact_id = contacts.id
        WHERE order_items.datetime_due >= ?
        ORDER BY order_items.datetime_due, orders.id
        LIMIT 20
      `);
      const list = query.all(startDate.toISOString(), endDate.toISOString(), today.toISOString());
      return list;
    } catch (error) { throw error; }
  }

  async insertMultipleOrders(data) {
    // data format: [{},{},{}]
    try {
      let orders = data.map((order) => [order.contact_id, order.invoice_id, order.datetime_due, order.description]);
      let placeholders = orders.map(() => '(?, ?, ?, ?)').join(', ');
      let query = this.db.prepare(`INSERT INTO orders (contact_id, invoice_id, datetime_due, description) VALUES ${placeholders}`);
      let result = query.run(...orders);
      return result.changes;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrderById(id) {
    try {
      const query = this.db.prepare(`SELECT * FROM orders 
        INNER JOIN contacts 
          ON orders.contact_id = contacts.id
        INNER JOIN invoices
          ON orders.invoice_id = invoices.id
        WHERE orders.id = ?`);
      const order = query.get(id);
      return order;
    } catch (error) {
      console.log(error);
    }
  }

  async updateOrder(data) {
    try {
      const { id, duedate, status, amount, invoiceId, description } = data;

      // update invoice
      let query = this.db.prepare(`UPDATE invoices
        SET amount = ?
        WHERE id = ?`);
      let result = query.run(amount, invoiceId);

      // update order
      query = this.db.prepare(`UPDATE orders
        SET datetime_due = ?, status = ?, description = ? 
        WHERE id = ?`);
      result = query.run(duedate, status, description, id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteOrder(id) {
    try {
      const orderData = await this.selectOrderById(id);

      // delete order entry
      const query = this.db.prepare('DELETE FROM orders WHERE id = ?');
      const result = query.run(id);

      // delete invoice entry
      await this.deleteInvoice(orderData.invoice_id);

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT orders.id, orders.datetime_due, orders.status, 
          contacts.firstname, contacts.lastname, invoices.amount
        FROM orders 
        INNER JOIN contacts 
          ON orders.contact_id = contacts.id 
        INNER JOIN invoices
          ON orders.invoice_id = invoices.id
        WHERE contacts.id = ?
        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersByInvoiceId(id) {
    try {
      const query = this.db.prepare(`SELECT * 
        FROM orders
        WHERE invoice_id = ?

        ORDER BY orders.datetime_due, orders.status`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOrdersWithinRange(startDate, endDate) {
    try {
      const query = this.db.prepare(`
        SELECT order_items.*, 
               contacts.firstname, contacts.lastname
        FROM order_items
        INNER JOIN orders ON order_items.order_id = orders.id
        INNER JOIN contacts ON orders.contact_id = contacts.id
        WHERE order_items.datetime_due BETWEEN ? AND ?
        ORDER BY order_items.datetime_due
      `);
      const list = query.all(startDate, endDate);
      return list;
    } catch (error) { throw error; }
  }

  // ==========
  // Subscriptions
  async insertSubscription(data) {
    try {
      // insert new invoice for subscription
      const { contactId, price } = data;
      let query = this.db.prepare(`INSERT INTO invoices (contact_id, amount, date_issue, date_due)
        VALUES (?, ?, date('now'), date('now','+15 day'))`);
      let result = query.run(contactId, price);
      const invoiceId = result.lastInsertRowid;

      // insert subscription
      const { dateStart, deliveryTime, frequency, interval, description } = data;
      query = this.db.prepare(`INSERT INTO subscriptions (invoice_id, datetime_placed, date_start, delivery_time, frequency, interval, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?)`);
      result = query.run(invoiceId, dateStart, deliveryTime, frequency, interval, description);
      const subscriptionId = result.lastInsertRowid;

      return { id: subscriptionId, invoiceId: invoiceId };
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllSubscriptions() {
    try {
      const query = this.db
        .prepare(`SELECT subscriptions.id, subscriptions.date_start, subscriptions.frequency, subscriptions.interval, subscriptions.delivery_time, contacts.firstname, contacts.lastname
        FROM subscriptions
        INNER JOIN invoices
          ON subscriptions.invoice_id = invoices.id
        INNER JOIN contacts 
          ON invoices.contact_id = contacts.id 
        ORDER BY subscriptions.date_start`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectSubscriptionById(id) {
    try {
      const query = this.db.prepare(`SELECT subscriptions.*, contacts.id AS contact_id, contacts.firstname, contacts.lastname, invoices.amount
        FROM subscriptions
        INNER JOIN invoices
          ON subscriptions.invoice_id = invoices.id
        INNER JOIN contacts 
          ON invoices.contact_id = contacts.id 
        WHERE subscriptions.id = ?
        ORDER BY subscriptions.date_start`);
      const subscription = query.get(id);
      return subscription;
    } catch (error) {
      console.log(error);
    }
  }

  async selectSubscriptionsByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT subscriptions.*, contacts.id AS contact_id, contacts.firstname, contacts.lastname, invoices.amount
      FROM subscriptions
        INNER JOIN invoices
          ON subscriptions.invoice_id = invoices.id
        INNER JOIN contacts 
          ON invoices.contact_id = contacts.id 
        WHERE contacts.id = ?
        ORDER BY subscriptions.date_start`);
      const result = query.all(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteSubscription(id) {
    try {
      // get invoice id
      let query = this.db.prepare(`SELECT invoice_id
        FROM subscriptions
        WHERE subscriptions.id = ?`);
      let result = query.get(id);
      const invoiceId = result.invoice_id;

      // delete orders
      query = this.db.prepare('DELETE FROM orders WHERE invoice_id = ?');
      query.run(invoiceId);

      // delete subscription
      query = this.db.prepare('DELETE FROM subscriptions WHERE id = ?');
      result = query.run(id);

      // delete invoices
      query = this.db.prepare('DELETE FROM invoices WHERE id = ?');
      query.run(invoiceId);

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // Invoices
  async insertInvoice(data) {
    try {
      const { contactId, issue, due, amount, description } = data;
      let query = this.db.prepare(`INSERT INTO invoices (contact_id, amount, date_issue, date_due, description)
      VALUES (?, ?, ?, ?, ?)`);
      let result = query.run(contactId, amount, issue, due, description);
      return result.lastInsertRowid;
    } catch (error) {
      console.log(error);
    }
  }

  async selectAllInvoices() {
    // Looking for a way to have conditional join cases?
    // SQL CASE probably is not doing the trick...
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        ORDER BY invoices.date_due`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectOpenInvoices() {
    // Looking for a way to have conditional join cases?
    // SQL CASE probably is not doing the trick...
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE invoices.status = 'open'
        ORDER BY invoices.date_due`);
      const list = query.all();
      return list;
    } catch (error) {
      console.log(error);
    }
  }

  async selectInvoiceById(id) {
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
          invoices.description, contacts.id AS contact_id, contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE invoices.id = ?
        ORDER BY invoices.date_due`);
      const invoice = query.get(id);
      return invoice;
    } catch (error) {
      console.log(error);
    }
  }

  async selectInvoicesByContactId(id) {
    try {
      const query = this.db.prepare(`SELECT invoices.id, invoices.status, invoices.amount, invoices.date_issue, invoices.date_paid, invoices.date_due,
      contacts.firstname, contacts.lastname
        FROM invoices
        INNER JOIN contacts
          ON invoices.contact_id = contacts.id
        WHERE contacts.id = ?
        ORDER BY invoices.date_due`);
      const orderList = query.all(id);
      return orderList;
    } catch (error) {
      console.log(error);
    }
  }

  async updateInvoice(data) {
    const id = data.id;
    delete data.id;

    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    // cunstruct query string
    let queryString = 'UPDATE invoices SET ';
    dataKeys.forEach((key, i) => {
      if (i !== 0) queryString += `, `;
      queryString += `${key} = ?`;
    });
    queryString += ` WHERE id = ${id}`;

    try {
      const query = this.db.prepare(queryString);
      const result = query.run(dataValues);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async updateInvoicePaidStatus(id) {
    try {
      // update invoice status
      let query = this.db.prepare(`UPDATE invoices
        SET status = 'paid',  date_paid = date('now')
        WHERE id = ?`);
      let result = query.run(id);

      return result;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteInvoice(id) {
    try {
      const query = this.db.prepare('DELETE FROM invoices WHERE id = ?');
      const result = query.run(id);
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // currently unused
  async deleteStandAloneInvoices() {
    try {
      const query = this.db.prepare(`DELETE FROM invoices
        WHERE NOT EXISTS (SELECT 1 FROM orders WHERE orders.invoice_id = invoices.id)
        AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.invoice_id = invoices.id);`);

      const result = query.run();
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // ==========
  // MORE GENERAL APPROACH
  async deleteEntryById(table, id) {
    try {
      const query = this.db.prepare(`DELETE FROM ${table} WHERE id = ${id}`);
      const result = query.run();
      return result;
    } catch (error) {
      console.log(error);
    }
  }
}
