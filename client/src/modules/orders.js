import * as request from "./serverRequests";
import { Calendar, DateExt } from "./calendar";

const calendar = new Calendar();

export default async function render() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "order";
  module.innerHTML = `
    <div id="order-list-section">
        <button id="add-order-btn" type="button">Add Order</button>
        <div id="order-list-wrapper"></div>
    </div>
    <div id="order-detail-section">
    </div>`;

  module.prepend(await calendar.getHTML());

  // populate calendar with orders
  const orderOfView = await request.ordersWithinRange(calendar.firstDayOfView, calendar.lastDayOfView);

  for (const order of orderOfView) {
    const thisDate = new DateExt(order.datetime_due);
    const date = thisDate.getDateString();

    // add event to calendar
    const selector = `.calendar__day[data-date="${date}"] .calendar__day__events`;
    const ordersEl = module.querySelector(selector);
    if (ordersEl) ordersEl.innerHTML += "\u{1F98A}";
  }

  const calendarDays = module.getElementsByClassName("calendar__day");
  for (const day of calendarDays) {
    day.addEventListener("click", onClickCalendarDay);
  }

  const addButton = module.querySelector("#add-order-btn");
  addButton.addEventListener("click", onPrepareNewOrder);

  const orderListWrapper = module.querySelector("#order-list-wrapper");
  const orderList = await getOrderListEl();
  orderListWrapper.appendChild(orderList);

  return module;
}

async function onClickCalendarDay(event) {
  const target = event.target.closest(".calendar__day");
  const selectedDate = new DateExt(target.dataset.date);
  const ordersOfDay = await request.ordersWithinRange(selectedDate, selectedDate);
  renderOrdersList(ordersOfDay);
}

function updateCalendar() {}

export function init() {
  const url = new URL(window.location);
  let orderId = url.searchParams.get("id");
  selectOrder(orderId);
}

async function selectOrder(id) {
  const list = document.querySelector("#order-list");
  let orderDetails = "";

  try {
    // get order details
    orderDetails = await getOrderDetailsEl(id);
  } catch (error) {
    // select first list item if any
    if (list.firstChild) {
      const firstOrder = list.firstChild;
      id = firstOrder.dataset.orderId;
      orderDetails = await getOrderDetailsEl(id);
    }
  }

  if (orderDetails) {
    const detailsWrapper = document.querySelector("#order-detail-section");
    detailsWrapper.replaceChildren(orderDetails);

    for (let item of list.children)
      if (item.dataset.orderId == id) item.dataset.selected = "";
      else delete item.dataset.selected;

    // add order id to url
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    const state = { order_id: id };
    window.history.replaceState(state, "", url);
  }
}

async function onPrepareNewOrder(event) {
  const orderDetailsWrapper = document.getElementById("order-detail-section");
  const wrapper = document.createElement("div");
  wrapper.id = "order-details";
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/order`;
  form.method = "POST";
  form.id = "new-order";
  form.addEventListener("submit", onCreateNewOrder);
  form.innerHTML = `
    <div>
      <label for="new-order__contact">Client</label>
      <input list="contact-list" name="contactName" id="new-order__contact" autocomplete="off" required />
      <datalist id="contact-list"></datalist>
      <input type="hidden" name="contactId" id="contact-id" value="0">
    </div>
    <div>
      <label for="new-order__due">Due Date</label>
      <input type="datetime-local" name="due" id="new-order__due" required />
    </div>
    <div>
        <label for="new-order__price">Price</label>
        <input id="new-order__price" name="price" type="number" min="0.00" max="10000.00" step="0.1" required />CHF
    </div>
    <div>
      <label for="new-order__description">Description</label>
      <textarea name="description" id="new-order__description" placeholder="Notes"></textarea>
    </div>
    <input type="submit" value="Create Order"/>`;

  const discardBtn = document.createElement("button");
  discardBtn.type = "button";
  discardBtn.innerHTML = "Discard Order";
  discardBtn.id = "discard-order-btn";
  discardBtn.addEventListener("click", () => selectOrder(0));

  wrapper.appendChild(form);
  wrapper.appendChild(discardBtn);
  orderDetailsWrapper.replaceChildren(wrapper);

  const orderListItems = document.querySelectorAll("#order-list li");
  for (const item of orderListItems) delete item.dataset.selected;

  const datalist = wrapper.querySelector("#contact-list");
  datalist.addEventListener("input", (e) => console.log("now"));
  const contacts = await request.contacts();
  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement("option");
    option.dataset.contactId = id;
    option.value = `${firstname} ${lastname}`;
    datalist.appendChild(option);
  }

  // check if given contact is new
  const contactInput = wrapper.querySelector("#new-order__contact");
  const contactIdInput = wrapper.querySelector("#contact-id");
  contactInput.addEventListener("input", (event) => {
    const value = event.target.value;
    let contactId = 0;
    for (const item of datalist.children) {
      if (item.value === value) contactId = item.dataset.contactId;
    }
    contactIdInput.value = contactId;
    if (contactIdInput.value == 0 && contactInput.value !== "") {
      contactInput.parentNode.dataset.newContact = "";
    } else {
      delete contactInput.parentNode.dataset.newContact;
    }
  });
}

async function onCreateNewOrder(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const response = await request.newOrder(data);
  const id = response.id;

  const orderListWrapper = document.getElementById("order-list-wrapper");
  const orderList = await getOrderListEl();
  orderListWrapper.replaceChildren(orderList);

  selectOrder(id);
}

async function onEditOrder(event) {
  const id = event.target.dataset.orderId;
  const contactDetailsWrapper = document.getElementById("order-detail-section");
  const form = await getOrderFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
}

async function onUpdateOrder(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const orderId = data.get("id");
  let response = await request.updateOrder(orderId, data);

  const orderListWrapper = document.getElementById("order-list-wrapper");
  const orderList = await getOrderListEl();
  orderListWrapper.replaceChildren(orderList);

  const item = document.querySelector(`#order-list li[data-order-id="${orderId}"`);
  item.dataset.selected = "";

  const orderDetailsWrapper = document.getElementById("order-detail-section");
  const orderDetails = await getOrderDetailsEl(orderId);
  orderDetailsWrapper.replaceChildren(orderDetails);
}

async function onDeleteOrder(event) {
  const orderId = event.target.dataset.orderId;

  if (window.confirm("Delete Order?")) {
    const result = await request.deleteOrder(orderId);

    const orderList = document.getElementById("order-list");
    const orderItem = orderList.querySelector(`li[data-order-id="${orderId}"]`);
    const previousSibling = orderItem.previousSibling;
    orderItem.remove();

    // select previous, first or no order
    if (orderList.childNodes.length) {
      let selectOrderId;
      if (previousSibling) {
        selectOrderId = previousSibling.dataset.orderId;
        previousSibling.dataset.selected = "";
      } else if (orderList.firstChild) {
        selectOrderId = orderList.firstChild.dataset.orderId;
        orderList.firstChild.dataset.selected = "";
      }
      const orderDetailsWrapper = document.getElementById("order-detail-section");
      const orderDetails = await getOrderDetailsEl(selectOrderId);
      orderDetailsWrapper.replaceChildren(orderDetails);
    } else {
      const orderDetailsWrapper = document.getElementById("order-detail-section");
      orderDetailsWrapper.innerHTML = "";
    }
  }
}

async function getOrderListEl(searchString) {
  let orders = await request.orders(searchString);
  const list = document.createElement("ul");
  list.id = "order-list";

  for (let item of orders) {
    const { id, datetime_due, status, firstname, lastname } = item;
    let el = document.createElement("li");
    el.dataset.orderId = id;
    el.innerHTML = `${datetime_due} ${firstname} ${lastname ? lastname : ""} ${status}`;
    el.addEventListener("click", (event) => selectOrder(event.target.dataset.orderId));
    list.appendChild(el);
  }

  return list;
}

async function getOrderDetailsEl(id) {
  let { datetime_placed, datetime_due, price, description, status, contact_id, firstname, lastname } = await request.orderDetails(id);
  const wrapper = document.createElement("div");
  wrapper.id = "order-details";
  wrapper.innerHTML = `<a href="/contacts?id=${contact_id}">${firstname} ${lastname ? lastname : ""}</a><br>
  Placed: ${datetime_placed}<br>
  Due: ${datetime_due}<br>
  ${price ? price + " CHF<br>" : ""}
  ${description ? description + "<br>" : ""}
  Status: ${status}`;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "edit-btn";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.orderId = id;
  editBtn.addEventListener("click", onEditOrder);

  wrapper.appendChild(editBtn);

  return wrapper;
}

async function getOrderFormEl(id) {
  const data = await request.orderDetails(id);
  const { datetime_due, status, price, description } = data;

  const wrapper = document.createElement("div");
  wrapper.id = "order-details";
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateOrder`;
  form.method = "POST";
  form.id = "edit-order";
  form.addEventListener("submit", onUpdateOrder);
  form.innerHTML = `<input type="hidden" id="edit-order__id" name="id" value="${id}">
    <div>
      <label for="edit-order__due">Due Date</label>
      <input type="datetime-local" name="duedate" id="edit-order__due" value="${datetime_due ? datetime_due : ""}" />
    </div>
    <div>
        <label for="edit-order__status">Status</label>
        <select id="edit-order__status" name="status">
            <option value="open">Open</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
        </select>
    </div>
    <div>
        <label for="edit-order__price">Price</label>
        <input id="edit-order__price" name="price" type="number" min="0.00" max="10000.00" step="0.1" value="${price}"/>CHF
    </div>
    <div>
      <label for="edit-order__description">Description</label>
      <textarea name="description" id="edit-order__description" placeholder="Notes">${description ? description : ""}</textarea>
    </div>
    <input type="submit" value="Done"/>`;

  // select current status
  const statusOptions = form.querySelectorAll("#edit-order__status option");
  for (let option of statusOptions) {
    if (option.value === status) option.setAttribute("selected", "true");
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete Order";
  deleteBtn.id = "delete-order-btn";
  deleteBtn.dataset.orderId = id;
  deleteBtn.addEventListener("click", onDeleteOrder);

  wrapper.appendChild(form);
  wrapper.appendChild(deleteBtn);

  return wrapper;
}

function renderOrdersList(orderList) {
  const orderListWrapper = document.getElementById("order-list-wrapper");

  const listEl = document.createElement("ul");
  listEl.id = "order-list";

  for (const order of orderList) {
    const { id, datetime_due, status, price, firstname, lastname } = order;
    let itemEl = document.createElement("li");
    itemEl.dataset.orderId = id;
    itemEl.addEventListener("click", (event) => selectOrder(event.target.dataset.orderId));

    let dueDate = new DateExt(datetime_due);
    let dateString = dueDate.toLocaleDateString().replace(/\//g, ".");
    let timeString = `${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`;
    itemEl.innerHTML = `${timeString} ${firstname} ${lastname ? lastname : ""} ${price}CHF ${status}`;

    itemEl.addEventListener("click", (event) => selectOrder(event.target.dataset.orderId));
    listEl.appendChild(itemEl);
  }

  orderListWrapper.replaceChildren(listEl);
}
