import * as request from './serverRequests';
import { Calendar, DateExt } from './calendar';

const calendar = new Calendar();

export default async function render() {
  const module = document.createElement('div');
  module.classList.add('module');
  module.id = 'order';
  module.innerHTML = `
    <div id="order-control-section">
      <form id="search-order" role="search">
        <label id="search-order__label" for="search-order__input">Search</label>
        <input type="text" pattern="[^0-9]*" name="input" id="search-order__input" placeholder="Contact Name..." autocomplete="off" required/>
      </form>
      <div id="calendar-container">
        <button id="calendar-toggle" type="button" class="button-small">Calendar</button>
        <div id="calendar-wrapper" hidden></div>
      </div>
      <button id="add-order-btn" type="button">Add Order</button>
    </div>
    <div id="order-list-section">
        <div id="order-list-wrapper"></div>
    </div>
    <div id="order-detail-section">
    </div>`;

  const calendarBtn = module.querySelector('#calendar-toggle');
  calendarBtn.addEventListener('click', (event) => {
    const calendar = event.target.nextElementSibling;
    calendar.hidden ? (calendar.hidden = false) : (calendar.hidden = true);
  });

  const orderListSection = module.querySelector('#calendar-wrapper');
  orderListSection.replaceChildren(calendar.getHTML());

  const addButton = module.querySelector('#add-order-btn');
  addButton.addEventListener('click', onPrepareNewOrder);

  const orderListWrapper = module.querySelector('#order-list-wrapper');

  // get last monday as startdate

  let startDate = new DateExt();
  startDate.setDate(startDate.getDate() - 3);
  let endDate = new DateExt().lastDayOfMonth();

  const monthEl = document.createElement('h1');
  monthEl.classList.add('month-name');
  monthEl.innerHTML = `${new DateExt().nameOfMonth()} ${startDate.getDate()}. – ${endDate.getDate()}.`;
  orderListWrapper.appendChild(monthEl);

  const orderList = await getOrderListEl(startDate, endDate);
  orderListWrapper.appendChild(orderList);

  return module;
}

export function init() {
  const url = new URL(window.location);
  let orderId = url.searchParams.get('id');
  selectOrder(orderId);
  calendar.populateCalendar();
  updateCalendar(); // why is this necessary for eventlistener to fire?
  document.addEventListener('monthloaded', updateCalendar);
}

async function onClickCalendarDay(event) {
  const target = event.target.closest('.calendar__day');
  const selectedDate = new DateExt(target.dataset.date);
  const orderListWrapper = document.getElementById('order-list-wrapper');

  const orderList = await getOrderListEl(selectedDate, selectedDate);
  orderListWrapper.replaceChildren(orderList);
}

async function updateCalendar() {
  // populate calendar with orders
  const firstDateOfView = calendar.datesOfView[0];
  const lastDateOfView = calendar.datesOfView[calendar.datesOfView.length - 1];
  const orderOfView = await request.ordersWithinRange(firstDateOfView, lastDateOfView);

  for (const order of orderOfView) {
    const thisDate = new DateExt(order.datetime_due);
    const date = thisDate.getDateString();

    // add event to calendar
    const selector = `.calendar__day[data-date="${date}"] .calendar__day__events`;
    const ordersEl = document.querySelector(selector);
    if (ordersEl) ordersEl.innerHTML += '&middot;';
  }

  const calendarDays = document.getElementsByClassName('calendar__day');
  for (const day of calendarDays) {
    day.addEventListener('click', onClickCalendarDay);
  }
}

async function selectOrder(id) {
  const orderList = document.querySelectorAll('.order-list__order');
  let orderDetails = '';

  try {
    // get order details
    orderDetails = await getOrderDetailsEl(id);
  } catch (error) {
    // select first order item if any
    if (orderList.length) {
      const firstOrder = orderList.item(0);
      id = firstOrder.dataset.orderId;
      orderDetails = await getOrderDetailsEl(id);
    }
  }

  if (orderDetails) {
    const detailsWrapper = document.querySelector('#order-detail-section');
    detailsWrapper.replaceChildren(orderDetails);

    for (let order of orderList)
      if (order.dataset.orderId == id) order.dataset.selected = '';
      else delete order.dataset.selected;

    // add order id to url
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    const state = { order_id: id };
    window.history.replaceState(state, '', url);
  }
}

async function onPrepareNewOrder(event) {
  const orderDetailsWrapper = document.getElementById('order-detail-section');
  const wrapper = document.createElement('div');
  wrapper.id = 'order-details';
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/order`;
  form.method = 'POST';
  form.id = 'new-order';
  form.addEventListener('submit', onCreateNewOrder);
  form.innerHTML = `
    <section class="content-controls">
      <input type="submit" class="button-small" value="Create Order"/>
      <button type="button" class="button-small" id="discard-order-btn">Discard</button>
    </section>
    <div id="new-order__input">
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
    </div>`;

  wrapper.appendChild(form);
  orderDetailsWrapper.replaceChildren(wrapper);

  const discardBtn = document.getElementById('discard-order-btn');
  discardBtn.addEventListener('click', () => selectOrder(0));

  const orderListItems = document.querySelectorAll('#order-list li');
  for (const item of orderListItems) delete item.dataset.selected;

  const datalist = wrapper.querySelector('#contact-list');
  datalist.addEventListener('input', (e) => console.log('now'));
  const contacts = await request.contacts();
  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement('option');
    option.dataset.contactId = id;
    option.value = `${firstname} ${lastname}`;
    datalist.appendChild(option);
  }

  // check if given contact is new
  const contactInput = wrapper.querySelector('#new-order__contact');
  const contactIdInput = wrapper.querySelector('#contact-id');
  contactInput.addEventListener('input', (event) => {
    const value = event.target.value;
    let contactId = 0;
    for (const item of datalist.children) {
      if (item.value === value) contactId = item.dataset.contactId;
    }
    contactIdInput.value = contactId;
    if (contactIdInput.value == 0 && contactInput.value !== '') {
      contactInput.parentNode.dataset.newContact = '';
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

  console.log(data);

  const orderListWrapper = document.getElementById('order-list-wrapper');
  const orderList = await getOrderListEl();
  orderListWrapper.replaceChildren(orderList);

  selectOrder(id);
}

async function onEditOrder(event) {
  const id = event.target.dataset.orderId;
  const contactDetailsWrapper = document.getElementById('order-detail-section');
  const form = await getOrderFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
}

async function onUpdateOrder(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const orderId = data.get('id');
  let response = await request.updateOrder(orderId, data);

  const orderListWrapper = document.getElementById('order-list-wrapper');
  const orderList = await getOrderListEl();
  orderListWrapper.replaceChildren(orderList);

  const item = document.querySelector(`#order-list li[data-order-id="${orderId}"`);
  item.dataset.selected = '';

  const orderDetailsWrapper = document.getElementById('order-detail-section');
  const orderDetails = await getOrderDetailsEl(orderId);
  orderDetailsWrapper.replaceChildren(orderDetails);
}

async function onDeleteOrder(event) {
  const orderId = event.target.dataset.orderId;

  if (window.confirm('Delete Order?')) {
    const result = await request.deleteOrder(orderId);

    const orderList = document.getElementById('order-list');
    const orderItem = orderList.querySelector(`li[data-order-id="${orderId}"]`);
    const previousSibling = orderItem.previousSibling;
    orderItem.remove();

    // select previous, first or no order
    if (orderList.childNodes.length) {
      let selectOrderId;
      if (previousSibling) {
        selectOrderId = previousSibling.dataset.orderId;
        previousSibling.dataset.selected = '';
      } else if (orderList.firstChild) {
        selectOrderId = orderList.firstChild.dataset.orderId;
        orderList.firstChild.dataset.selected = '';
      }
      const orderDetailsWrapper = document.getElementById('order-detail-section');
      const orderDetails = await getOrderDetailsEl(selectOrderId);
      orderDetailsWrapper.replaceChildren(orderDetails);
    } else {
      const orderDetailsWrapper = document.getElementById('order-detail-section');
      orderDetailsWrapper.innerHTML = '';
    }
  }
}

async function getOrderDetailsEl(id) {
  const { datetime_placed, datetime_due, price, description, status, contact_id, firstname, lastname } = await request.orderDetails(id);

  const datePlaced = new DateExt(datetime_placed);
  const dateDue = new DateExt(datetime_due);
  const placedString = `${datePlaced.getDate()}. ${datePlaced.nameOfMonth()} ${datePlaced.getFullYear()}`;
  const timeString = `${dateDue.getHours()}:${String(dateDue.getMinutes()).padStart(2, '0')}`;
  const dueString = `${dateDue.getDate()}. ${dateDue.nameOfMonth()} ${dateDue.getFullYear()}, ${timeString}`;

  const wrapper = document.createElement('div');
  wrapper.id = 'order-details';
  wrapper.innerHTML = `
  <section class="content-controls">
    <button type="button" id="edit-btn" class="button-small" data-order-id="${id}">Edit</button>
  </section>
  <div class="order-details__info">
    <div><a href="/contacts?id=${contact_id}">${firstname} ${lastname ? lastname : ''}</a></div>
    <time datetime="${dateDue.getDateString()} ${timeString}">${dueString}</time>
    <div> ${price ? price + ' CHF' : ''}</div>
    ${description ? `<div>${description}</div>` : ''}
    <div>${status}</div>
  </div>`;

  const editBtn = wrapper.querySelector('#edit-btn');
  editBtn.addEventListener('click', onEditOrder);

  return wrapper;
}

async function getOrderFormEl(id) {
  const data = await request.orderDetails(id);
  const { datetime_due, status, price, description } = data;

  const wrapper = document.createElement('div');
  wrapper.id = 'order-details';
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/updateOrder`;
  form.method = 'POST';
  form.id = 'edit-order';
  form.addEventListener('submit', onUpdateOrder);
  form.innerHTML = `<section class="content-controls">
      <input type="submit" class="button-small" value="Done" />
      <button type="button" id="delete-order-btn" class="button-small" data-order-id="${id}">Delete Order</button>
    </section>

    <input type="hidden" id="edit-order__id" name="id" value="${id}">
    <div>
      <label for="edit-order__due">Due Date</label>
      <input type="datetime-local" name="duedate" id="edit-order__due" value="${datetime_due ? datetime_due : ''}" />
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
      <textarea name="description" id="edit-order__description" placeholder="Notes">${description ? description : ''}</textarea>
    </div>`;

  // select current status
  const statusOptions = form.querySelectorAll('#edit-order__status option');
  for (let option of statusOptions) {
    if (option.value === status) option.setAttribute('selected', 'true');
  }
  wrapper.appendChild(form);

  const deleteBtn = wrapper.querySelector('#delete-order-btn');
  deleteBtn.addEventListener('click', onDeleteOrder);

  return wrapper;
}

async function getOrderListEl(startDate = new DateExt(), endDate = new DateExt()) {
  const orderList = await request.ordersWithinRange(startDate, endDate);

  const dayListEl = document.createElement('ul');
  dayListEl.id = 'day-list';

  const dateDiff = startDate.diffInDaysTo(endDate);
  let i = 0;
  do {
    const date = new DateExt(startDate);
    date.setDate(date.getDate() + i);

    const dateString = date.getDateString();
    const dateStringLong = `${String(date.getDate()).padStart(2, 0)}.`;

    const dayEl = document.createElement('li');
    dayEl.classList.add('day-list__day');
    date.getDay() == 1 ? (dayEl.dataset.weekStart = '') : '';

    const today = new DateExt();
    let weekday;
    date < today.setHours(0, 0, 0, 0) ? (dayEl.dataset.past = '') : '';
    if (today.getDateString() === date.getDateString()) {
      weekday = 'Today';
      dayEl.dataset.today = '';
    } else weekday = date.nameOfWeekday();

    const details = document.createElement('details');
    dayEl.appendChild(details);
    details.innerHTML = `<summary class="day-list__summary">
        <span class="dots"></span>
        <time datetime="${dateString}">${dateStringLong}</time>
        <span class="weekday">${weekday}</span>
        <button type="button" class="add-order" hidden>Add Order</button>
        <span class="total"><span>
      </summary>`;
    dayListEl.appendChild(dayEl);

    const addOrderBtn = dayListEl.querySelector('.add-order');
    addOrderBtn.addEventListener('click', (e) => console.log(e));
    // this is not working yet. might be due to details default event.

    const ordersOfDate = orderList.filter(function (order) {
      const dueDate = new DateExt(order.datetime_due);
      return date.getDateString() === dueDate.getDateString();
    });

    if (ordersOfDate.length) {
      const orderListEl = document.createElement('ul');
      orderListEl.classList.add('order-list');
      details.appendChild(orderListEl);

      let total = 0;

      for (const order of ordersOfDate) {
        const { id, datetime_due, status, price, firstname, lastname } = order;
        let dueDate = new DateExt(datetime_due);
        let dateString = dueDate.toLocaleDateString().replace(/\//g, '.');
        let timeString = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;

        const orderEl = document.createElement('li');
        orderEl.classList.add('order-list__order');
        orderEl.dataset.orderId = id;
        orderEl.innerHTML = `<time datetime="${timeString}">${timeString}</time> 
          <span class="contact">${firstname} ${lastname ? lastname : ''}</span>
          <span class="price">${price} CHF</span>`;
        orderEl.addEventListener('click', (event) => selectOrder(event.target.closest('li').dataset.orderId));
        orderListEl.appendChild(orderEl);

        total += price;

        // add dots to summary
        const dotEl = details.querySelector('.dots');
        dotEl.innerHTML += '&middot';
      }
      const totalEl = details.querySelector('.total');
      totalEl.innerHTML = `${total} CHF`;
    } else dayEl.dataset.empty = '';

    i++;
  } while (i < dateDiff);

  return dayListEl;
}
