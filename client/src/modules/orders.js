import * as request from './serverRequests';
import { Calendar, DateExt } from './calendar';

const calendar = new Calendar();
defaultView;

export default async function render() {
  // set default date range
  let startDate = new DateExt();
  startDate.setDate(startDate.getDate() - 2);
  let endDate = new DateExt(startDate);
  endDate.setDate(startDate.getDate() + 17);
  defaultView = { start: startDate, end: endDate };

  const module = document.createElement('div');
  module.classList.add('module');
  module.id = 'order';
  module.innerHTML = `
    <div id="order-control-section">
      <form id="search-order" role="search">
        <label id="search-order__label" for="search-order__input">Search</label>
        <input list="contact-list-main" name="contactName" id="search-order__input" placeholder="Contact Name..." autocomplete="off" required pattern=""/>
        <datalist id="contact-list-main"></datalist>
        <input type="hidden" name="contactId" class="contact-id" value="0">
      </form>
      <button id="add-order-btn" type="button">Add Order</button>
    </div>
    <div id="order-list-section">
        <div id="order-list-wrapper"></div>
    </div>
    <div id="order-detail-section">
    </div>`;

  const addButton = module.querySelector('#add-order-btn');
  addButton.addEventListener('click', onPrepareNewOrder);

  // search orders by contact
  const searchForm = module.querySelector('#search-order');
  searchForm.addEventListener('submit', onSearchOrder);

  const datalist = module.querySelector('#contact-list-main');
  const contacts = await request.contacts();
  let patternString = '';
  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement('option');
    option.dataset.contactId = id;
    option.value = `${firstname} ${lastname}`;
    datalist.appendChild(option);

    patternString += `${firstname} ${lastname}|`;
  }

  // save current contact id
  const contactIdInput = module.querySelector('#search-order .contact-id');
  const searchInput = module.querySelector('#search-order__input');
  searchInput.pattern = patternString;
  searchInput.addEventListener('input', (event) => {
    const value = event.target.value;
    let contactId = 0;
    for (const item of datalist.children) {
      item.value === value ? (contactId = item.dataset.contactId) : '';
    }
    contactIdInput.value = contactId;
  });

  // prepare calendar
  const calendarEl = document.createElement('div');
  calendarEl.id = 'calendar-container';
  calendarEl.innerHTML = `<button id="calendar-toggle" type="button" class="button-small">
      ${new DateExt().nameOfMonth()} ${defaultView.start.getDate()}. – ${defaultView.end.getDate()}.
    </button>
    <div id="calendar-wrapper" hidden></div>
    <button id="calendar-reset" type="button" class="button-small" hidden>Reset</button>`;

  // this could be handled with html details tag
  const calendarBtn = calendarEl.querySelector('#calendar-toggle');
  calendarBtn.addEventListener('click', (event) => {
    const calendar = event.target.nextElementSibling;
    calendar.hidden ? (calendar.hidden = false) : (calendar.hidden = true);
    event.target.hasAttribute('data-open') ? event.target.removeAttribute('data-open') : (event.target.dataset.open = '');
  });

  // change calendar dates
  // - change calendar button text
  // - hide or show reset calendar button
  // - hide or show calendar wrapper
  // - get order list

  const calendarResetBtn = calendarEl.querySelector('#calendar-reset');
  calendarResetBtn.addEventListener('click', async (event) => {
    event.target.hidden = true;
    const orderListWrapper = module.querySelector('#order-list-wrapper');
    const orderList = await request.ordersWithinRange(defaultView.start, defaultView.end);
    const orderListEl = getOrderListEl(orderList, { customView: { start: defaultView.start, end: defaultView.end } });
    orderListWrapper.replaceChild(orderListEl, document.getElementById('day-list'));
  });

  const calendarWrapper = calendarEl.querySelector('#calendar-wrapper');
  calendarWrapper.replaceChildren(calendar.getHTML());

  const orderListWrapper = module.querySelector('#order-list-wrapper');
  orderListWrapper.appendChild(calendarEl);

  const orderList = await request.ordersWithinRange(defaultView.start, defaultView.end);
  const orderListEl = getOrderListEl(orderList, { customView: { start: defaultView.start, end: defaultView.end } });
  orderListWrapper.appendChild(orderListEl);

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

async function onSearchOrder(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  id = data.get('contactId');

  // display orders of contact
  const orderList = await request.ordersByContact(id);
  const orderListWrapper = document.getElementById('order-list-wrapper');
  if (orderList.length) {
    const orderListEl = getOrderListEl(orderList, { compactStyle: true });
    orderListWrapper.replaceChildren(orderListEl);
  } else {
    orderListWrapper.innerHTML = 'No orders yet. Add Order.';
  }
}

async function onClickCalendarDay(event) {
  const target = event.target.closest('.calendar__day');
  const selectedDate = new DateExt(target.dataset.date);
  const orderListWrapper = document.getElementById('order-list-wrapper');

  const calendarToggle = document.getElementById('calendar-toggle');
  calendarToggle.innerHTML = `${selectedDate.nameOfMonth()} ${selectedDate.getDate()}. ${selectedDate.getFullYear()}`;

  const orderList = await request.ordersWithinRange(selectedDate, selectedDate);
  let orderListEl;
  if (orderList.length) orderListEl = getOrderListEl(orderList, { open: true });
  else orderListEl = getOrderListEl(orderList, { open: true, customView: { start: selectedDate, end: selectedDate } });
  orderListWrapper.replaceChild(orderListEl, document.getElementById('day-list'));

  const calendarReset = document.getElementById('calendar-reset');
  calendarReset.hidden = false;
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
  try {
    // get order details
    const orderDetails = await getOrderDetailsEl(id);
    const orderList = document.querySelectorAll('.order-list__order');
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
  } catch (error) {
    // select first order item in the future if any
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

  // add order to current list
  const date = new DateExt(data.get('due'));
  const dayEl = document.querySelector(`.day-list__day[data-date="${date.getDateString()}"]`);
  // adding orders to days should be outsourced into separate function to avoid duplicate code

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

  const orderDetailsWrapper = document.getElementById('order-detail-section');
  const orderDetails = await getOrderDetailsEl(orderId);
  orderDetailsWrapper.replaceChildren(orderDetails);
}

async function onDeleteOrder(event) {
  const orderId = event.target.dataset.orderId;

  if (window.confirm('Delete Order?')) {
    const result = await request.deleteOrder(orderId);
    const orderItem = document.querySelector(`.order-list__order[data-order-id="${orderId}"]`);
    const previousSibling = orderItem.previousSibling;
    orderItem.remove();

    const orderDetailsWrapper = document.getElementById('order-detail-section');
    orderDetailsWrapper.innerHTML = '';
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

function getOrderListEl(orderList, options) {
  // available options: compactStyle, open, customView
  // maybe better to introduce new function?
  // async function getDayListEl(startDate, endDate, options) {
  //   const orderList = await request.ordersWithinRange(startDate, endDate);
  // }

  let startDate, endDate;

  if (options.customView) {
    startDate = options.customView.start;
    endDate = options.customView.end;
  } else {
    startDate = new DateExt(orderList[0].datetime_due);
    endDate = new DateExt(orderList[orderList.length - 1].datetime_due);
  }

  const dayListEl = document.createElement('ul');
  dayListEl.id = 'day-list';
  options.compactStyle ? (dayListEl.dataset.compactStyle = '') : '';

  const dateDiff = startDate.diffInDaysTo(endDate);
  let i = 0;
  do {
    const date = new DateExt(startDate);
    date.setDate(date.getDate() + i);

    const dateString = date.getDateString();
    const dateStringLong = `${String(date.getDate()).padStart(2, 0)}.`;

    const dayEl = document.createElement('li');
    dayEl.classList.add('day-list__day');
    dayEl.dataset.date = dateString;
    date.getDay() == 1 ? (dayEl.dataset.weekStart = '') : '';

    const today = new DateExt();
    let weekday;
    date < today.setHours(0, 0, 0, 0) ? (dayEl.dataset.past = '') : '';
    if (options.compactStyle) weekday = `${date.nameOfMonth()} ${date.getFullYear()}`;
    else {
      if (today.getDateString() === dateString) {
        weekday = 'Today';
        dayEl.dataset.today = '';
      } else weekday = date.nameOfWeekday();
    }

    const details = document.createElement('details');
    options.open ? details.setAttribute('open', '') : '';
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
      return dateString === dueDate.getDateString();
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
        orderEl.dataset.date = dueDate.getDateString();
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
  } while (i <= dateDiff);

  return dayListEl;
}
