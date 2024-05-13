import * as request from './serverRequests.js';
import { Calendar, DateExt } from './calendar.js';

// API url (use process.env.SERVER for prod)
const apiUrl = window.appConfig.apiUrl;

const calendar = new Calendar();

export default async function render() {
  const module = document.createElement('div');
  module.classList.add('list-module');
  module.innerHTML = `
      <section id="list-module__controls">
        <form class="search-form" role="search">
          <label class="search-form__input">
            Search by contact
            <input list="contact-list-main" type="text" pattern="[^0-9]*" name="contactName" placeholder="Hanna Muster" autocomplete="off" required/>
          </label>
          <datalist id="contact-list-main"></datalist>
          <input type="hidden" name="contactId" class="contact-id" value="0">
        </form>
        <button class="add-item-btn button-small" type="button">Create Order</button>
      </section>
      <section id="list-module__list"></section>
      <section id="list-module__details"></section>`;

  // add item button behaviour
  const addButton = module.querySelector('.add-item-btn');
  addButton.addEventListener('click', onPrepareNewItem);

  // handle search form
  const contactIdInput = module.querySelector('.search-form .contact-id');
  const searchInput = module.querySelector('.search-form__input');
  searchInput.addEventListener('input', (event) => {
    // update hidden contact id field. set to 0 if no matching contact.
    const value = event.target.value;
    let contactId = 0;

    // check if input matches a current client
    for (const item of datalist.children) {
      if (item.value === value) contactId = item.dataset.contactId;
    }
    // write value to form field (hidden)
    contactIdInput.value = contactId;
  });

  // search items by contact
  const searchForm = module.querySelector('.search-form');
  searchForm.addEventListener('submit', onSearchItem);

  // populate order list
  const listSectionEl = module.querySelector('#list-module__list');
  const itemList = getListEl(await request.orders());
  listSectionEl.replaceChildren(itemList);

  // populate datalist with clients
  const datalist = module.querySelector('#contact-list-main');
  const contacts = await request.contacts();
  let patternString = ''; // define allowed patterns for input field

  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement('option');
    option.dataset.contactId = id;
    option.value = `${firstname} ${lastname}`;
    datalist.appendChild(option);
    patternString += `${firstname} ${lastname}|`;
  }

  // draw calendar
  const detailsEl = module.querySelector('#list-module__details');
  detailsEl.replaceChildren(calendar.getHTML());

  const calendarEl = module.querySelector('.calendar');
  calendarEl.classList.add("card");

  return module;
}

export function init() {
  calendar.populateCalendar();
  updateCalendar(); // why is this necessary for eventlistener to fire?
  document.addEventListener('monthloaded', updateCalendar);
}

async function updateCalendar() {

  // // populate calendar with orders
  const firstDateOfView = calendar.datesOfView[0];
  const lastDateOfView = calendar.datesOfView[calendar.datesOfView.length - 1];
  const orderOfView = await request.ordersWithinRange(firstDateOfView, lastDateOfView);

  if (orderOfView)
    for (const order of orderOfView) {
      const thisDate = new DateExt(order.datetime_due);
      const date = thisDate.getDateString();

      // add event to calendar
      const selector = `.calendar__day[data-date="${date}"] .calendar__day__events`;
      const ordersEl = document.querySelector(selector);
      if (ordersEl) ordersEl.innerHTML += '&middot;';
    }

  const calendarDays = document.getElementsByClassName('calendar__day');
  for (const day of calendarDays)
    day.addEventListener('click', onClickCalendarDay);
}

async function onClickCalendarDay(event) {
  const target = event.target.closest('.calendar__day');
  const selectedDate = new DateExt(target.dataset.date);

  // const calendarToggle = document.getElementById('calendar-toggle');
  // calendarToggle.innerHTML = `${selectedDate.nameOfMonth()} ${selectedDate.getDate()}. ${selectedDate.getFullYear()}`;

  const orderList = await request.ordersWithinRange(selectedDate, selectedDate);
  let contentEl;

  if (orderList.length) contentEl = getListEl(orderList);
  else {
    contentEl = document.createElement('div');
    contentEl.innerHTML = 'No Orders.';
  }

  const listWrapper = document.getElementById('list-module__list');
  listWrapper.replaceChildren(contentEl);

  // const calendar = document.getElementById('orders-calendar');
  // delete calendar.dataset.defaultDate;
}

async function onPrepareNewItem() {
  const listSection = document.getElementById('list-module__details');
  const form = document.createElement('form');
  form.action = `${apiUrl}/api/order`;
  form.method = 'POST';
  form.classList.add('new-item-form', 'form', 'card');
  form.addEventListener('submit', onCreateOrder);
  form.innerHTML = `<section class="list-module__details__controls">
        <input type="submit" class="button-small" value="Save"/>
        <button type="button" class="button-small discard-btn">Discard</button>
    </section>
    
    <label>
      <span class="label-text">Client</span>
      <input list="contact-list" id="new-order__contact" name="contactName" placeholder="Hanna Muster" autocomplete="off" required />
    </label>
    <datalist id="contact-list"></datalist>
    <input type="hidden" name="contactId" id="contact-id" value="0" />

    <label>
    <span class="label-text">Due Date</span>
      <input type="datetime-local" name="dueDatetime" required />
    </label>

    <fieldset>
      <legend><span>Items</span> <button type="button" id="add-item" class="button-small invert">Add</button></legend>
      <table class="order-items">
        <tbody>
        </tbody>
      </table>

      <label class="price-total">
        <span class="label-text">Total</span>
        <div class="form__input-unit">
          <output>0</output>
          <span class="unit">CHF</span>
        </div>
      </label>
    </fieldset>

    <label>
      <span class="label-text">Delivery</span>
      <select name="delivery" required>
          <option value="pickup">Pick-Up</option>
          <option value="deliver">Deliver</option>
      </select>
    </label>

    <label>
      <span class="label-text">Notes</span>
      <textarea rows="1" name="notes" placeholder="Leave a note"></textarea>
    </label>

    <label>
      <span class="label-text">Repeat</span>
      <select name="interval" required>
          <option value="none">None</option>
          <option value="7">Every week</option>
          <option value="14">Every 2 weeks</option>
          <option value="28">Every month</option>
          <option disabled>──────────</option>
          <option value="custom">Custom</option>
      </select>
    </label>`;

  listSection.replaceChildren(form);

  // populate datalist with clients
  const datalist = form.querySelector('#contact-list');
  const contacts = await request.contacts();

  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement('option');
    option.value = `${firstname} ${lastname}`;
    option.dataset.contactId = id;
    datalist.appendChild(option);
  }

  // check if given contact is new
  const contactInput = form.querySelector('#new-order__contact');
  const contactIdInput = form.querySelector('#contact-id');
  contactInput.addEventListener('input', (event) => {
    const value = event.target.value;
    let contactId = 0;
    for (const item of datalist.children) {
      if (item.value === value) contactId = item.dataset.contactId;
    }
    contactIdInput.value = contactId;
    if (contactIdInput.value == 0 && contactInput.value !== '') {
      contactInput.parentNode.dataset.newContact = '';
    } else delete contactInput.parentNode.dataset.newContact;
  });

  // add first default item
  addItem();

  // handle on discard button
  const discardBtnEl = form.querySelector('.discard-btn');
  discardBtnEl.addEventListener('click', () => document.querySelector('#list-module__details').replaceChildren());

  // add repeat select eventlistener
  const intervalEl = form.querySelector('select[name="interval"]');
  intervalEl.addEventListener('input', onSelectRepeat);

  // add repeat select eventlistener
  const deliveryEl = form.querySelector('select[name="delivery"]');
  deliveryEl.addEventListener('input', onSelectDelivery);

  // add autoresize behaviour
  const textarea = form.querySelector('textarea[name="notes"]');
  textarea.addEventListener('input', onTextareaInput);

  // add add item eventlistener
  const addItemBtnEl = form.querySelector('#add-item');
  addItemBtnEl.addEventListener('click', () => addItem());

  // handle on textarea input
  // auto resize textarea
  function onTextareaInput(event) {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  }

  // handle on delivery selection
  function onSelectDelivery(event) {
    const value = event.target.value;
    const deliveryContainer = event.target.closest('label');

    if (value === 'pickup') {
      // remove frequency input
      removeInputGroupOf('textarea[name="deliveryAddress"]');

      // remove delivery item
      let itemEl = form.querySelector('#order-item-delivery');
      if (itemEl) itemEl.remove();
    } else if (value === 'deliver') {
      // add delivery address container
      let deliveryAddressEl = document.querySelector('textarea[name="deliveryAddress"]');
      if (!deliveryAddressEl) {
        const deliveryAddressContainer = document.createElement('label');
        deliveryAddressContainer.innerHTML = `<span class="label-text">Address</span>
          <textarea name="deliveryAddress" rows="2" placeholder="Hauserstrasse 128\n8400 Winterthur"></textarea>`;

        deliveryContainer.after(deliveryAddressContainer);

        // add autoresize behaviour
        const textarea = form.querySelector('textarea[name="deliveryAddress"]');
        textarea.addEventListener('input', onTextareaInput);

        // add order item
        addItem('Delivery');
      }
    }
  }

  // handle on repeat selection
  function onSelectRepeat(event) {
    const value = event.target.value;
    const repeatContainer = event.target.closest('label');

    // handle end repeat type
    if (value === 'none') {
      // remove end type
      removeInputGroupOf('select[name="endType"]');

      // remove frequency input
      removeInputGroupOf('input[name="frequency"]');

      // remove end date input
      removeInputGroupOf('input[name="endDate"]');
    } else {
      // add end type
      let endTypeEl = form.querySelector('select[name="endType"]');
      if (!endTypeEl) {
        const endTypeContainer = document.createElement('label');
        endTypeContainer.innerHTML = `<span class="label-text">End</span>
          <select name="endType" required>
              <option value="never">Never</option>
              <option value="after">After</option>
              <option value="date">On Date</option>
          </select>`;

        repeatContainer.after(endTypeContainer);
        endTypeEl = endTypeContainer.querySelector('select[name="endType"]');
        endTypeEl.addEventListener('input', onSelectRepeatEnd);
      }
    }

    // handle custom interval
    if (value === 'custom') {
      // add custom interval
      let customIntervalEl = form.querySelector('input[name="customInterval"]');
      if (!customIntervalEl) {
        const customIntervalContainer = document.createElement('label');
        customIntervalContainer.innerHTML = `<span class="label-text">Every</span>
          <div class="form__input-unit">
            <input name="customInterval" type="number" min="0" max="10000" step="1" placeholder="21" required />
            <span class="unit">days</span>
          </div>`;

        repeatContainer.after(customIntervalContainer);
      }
    } else {
      // remove custom interval
      removeInputGroupOf('input[name="customInterval"]');
    }
  }

  // handle on repeat end selection
  function onSelectRepeatEnd(event) {
    const value = event.target.value;
    const repeatEndContainer = event.target.closest('label');

    // handle frequency input
    if (value === 'after') {
      // add frequency container
      let frequencyEl = document.querySelector('input[name="frequency"]');
      if (!frequencyEl) {
        const frequencyContainer = document.createElement('label');
        frequencyContainer.innerHTML = `<span class="label-text">End after</span>
          <div class="form__input-unit">
            <input type="number" name="frequency" min="2" max="10000" step="1" placeholder="5" required />
            <span class="unit">times</span>
          </div>`;

        repeatEndContainer.after(frequencyContainer);
      }
    } else {
      // remove frequency input
      removeInputGroupOf('input[name="frequency"]');
    }

    // handle end date input
    if (value === 'date') {
      let endDateEl = document.querySelector('input[name="endDate"]');
      if (!endDateEl) {
        const endDateEl = document.createElement('label');
        endDateEl.innerHTML = `<span class="label-text">End On</span>
          <input type="date" name="endDate" required />`;

        repeatEndContainer.after(endDateEl);
      }
    } else {
      // remove end date input
      removeInputGroupOf('input[name="endDate"]');
    }
  }

  // remove input group
  function removeInputGroupOf(selector) {
    let el = document.querySelector(selector);
    if (el) {
      const container = el.closest('label');
      container.remove();
    }
  }

  // add new item to form
  function addItem(text) {
    let tableBodyEl = form.querySelector('.order-items tbody');
    let itemEl = document.createElement('tr');

    let descriptionEl = document.createElement('td');
    if (text) {
      itemEl.id = `order-item-${text.toLowerCase()}`;
      descriptionEl.innerHTML = `<input name="description[]" value="${text}" required ${text === 'Delivery' ? 'readonly' : ''}/>`;
    } else descriptionEl.innerHTML = `<input name="description[]" placeholder="Bouquet" required />`;
    itemEl.appendChild(descriptionEl);

    let priceEl = document.createElement('td');
    priceEl.innerHTML = `<div class="form__input-unit">
        <input name="price[]" type="number" min="0.00" max="10000.00" step="0.1" placeholder="60" required />
        <span class="unit">CHF</span>
      </div>`;

    let inputEl = priceEl.querySelector('input');
    inputEl.addEventListener('input', () => updateOrderTotal());
    itemEl.appendChild(priceEl);

    let actionEl = document.createElement('td');
    let deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = 'X';
    deleteBtn.addEventListener('click', removeItem);
    deleteBtn.classList.add('button-small', 'invert');

    // if delivery item deletion reset delivery to pick-up
    if (text === 'Delivery')
      deleteBtn.addEventListener('click', () => {
        let deliveryTypeEl = form.querySelector('select[name="delivery"]');
        deliveryTypeEl.value = 'pickup';
        deliveryTypeEl.dispatchEvent(new Event('input'));
      });

    actionEl.appendChild(deleteBtn);
    itemEl.appendChild(actionEl);

    tableBodyEl.appendChild(itemEl);
  }

  function updateOrderTotal() {
    let outputEl = form.querySelector('label.price-total output');
    let priceElAll = form.querySelectorAll('table.order-items input[type="number"');
    let total = 0;

    // sumup all prices
    for (const price of priceElAll) total += Number(price.value);

    // round total to two decimal places
    total = total.toFixed(2);

    // output total
    outputEl.innerHTML = total;
  }

  function removeItem(event) {
    let itemEl = event.target.closest('tr');
    itemEl.remove();
    updateOrderTotal();
  }
}

async function onCreateOrder(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const response = await request.createOrder(data);
  const id = response.id;

  // // add order to current list
  // const date = new DateExt(data.get('due'));
  // const dayEl = document.querySelector(`.day-list__day[data-date="${date.getDateString()}"]`);
  // // adding orders to days should be outsourced into separate function to avoid duplicate code

  // selectOrder(id);
}

function onSearchItem(event) {
  event.preventDefault();
  console.log('search item');
}

/**
 * build list element
 * @param {Object} list data list
 */
function getListEl(list) {
  const dayListEl = document.createElement('ul');

  if (list.length) {
    let currentDayEl;
    let currentOrderListEl;
    let currentOrderItemEl;
    let currentDate;
    let currentOrderId;
    let currentOrderTotal = 0;
    let currentDayTotal = 0;

    // iterate over list
    for (const item of list) {
      const { order_id, datetime_due, status, price, firstname, lastname } = item;
      const dueDate = new DateExt(datetime_due);
      const timeString = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;

      // create a new day
      if (!currentDate || currentDate.toDateString() !== dueDate.toDateString()) {

        // update total for the previous day if not first iteration
        if (currentDayEl) {
          const priceTag = currentDayEl.querySelector(".price-tag")
          priceTag.textContent = ` ${currentDayTotal.toFixed(2)} CHF`;
        }

        currentDate = dueDate; // update current date
        currentDayTotal = 0; // reset day total

        // add day element
        currentDayEl = document.createElement('li');
        dayListEl.appendChild(currentDayEl);

        //add day header
        const dayHeaderEl = document.createElement('div');
        dayHeaderEl.classList.add("day-header");
        currentDayEl.appendChild(dayHeaderEl);

        // add day title
        const dayTitleEl = document.createElement('h1');
        dayTitleEl.textContent = `${dueDate.nameOfWeekday()}, ${dueDate.getDate()}. ${dueDate.nameOfMonth()}`;
        dayHeaderEl.appendChild(dayTitleEl);

        // add total price
        const priceEl = document.createElement('div');
        priceEl.classList.add("price-tag");
        dayHeaderEl.appendChild(priceEl);

        // add order list
        currentOrderListEl = document.createElement('ul');
        currentOrderListEl.classList.add("order-list", "styled-list");
        currentDayEl.appendChild(currentOrderListEl);
      }

      // create a new order
      if (currentOrderId !== order_id) {

        // update total for the previous order if not first iteration
        if (currentOrderItemEl) {
          const priceTag = currentOrderItemEl.querySelector(".price-tag")
          priceTag.textContent = ` ${currentOrderTotal.toFixed(2)} CHF`;
        }

        const priceEl = document.createElement('div');
        priceEl.classList.add("price-tag");


        currentOrderId = order_id; // update current order id
        currentOrderTotal = 0;  // reset order total

        // add order item
        currentOrderItemEl = document.createElement('li');
        currentOrderItemEl.classList.add("order");
        currentOrderItemEl.innerHTML = `${timeString} ${firstname} ${lastname}<div class="price-tag" hidden></div>`;
        currentOrderListEl.appendChild(currentOrderItemEl);
      }

      // add item price to totals
      currentOrderTotal += price;
      currentDayTotal += price;
    }

    // add totals to last remaining items
    const priceTagDay = currentDayEl.querySelector(".price-tag")
    priceTagDay.textContent = ` ${currentDayTotal.toFixed(2)} CHF`;

    const priceTagOrder = currentOrderItemEl.querySelector(".price-tag")
    priceTagOrder.textContent = ` ${currentOrderTotal.toFixed(2)} CHF`;

  } else dayListEl.textContent = "No Orders";

  return dayListEl;
}

