import * as request from './serverRequests';
import { Calendar, DateExt } from './calendar';

export default async function render() {
  const module = document.createElement('div');
  module.classList.add('list-module');
  module.id = 'subscription';
  module.innerHTML = `
      <section id="list-module__controls">
        <div>
          <form id="search-subscription" role="search">
            <label id="search-subscription__label" for="search-subscription__input">Search</label>
            <input type="text" pattern="[^0-9]*" name="input" id="search-subscription__input" placeholder="Contact Name..." autocomplete="off" required/>
          </form>
        </div>
        <button id="add-subscription-btn" class="button-add" type="button">New Subscription</button>
      </section>
      <section id="list-module__list"></section>
      <section id="list-module__details"></section>`;

  const addButton = module.querySelector('#add-subscription-btn');
  addButton.addEventListener('click', onPrepareNewSubscription);

  const searchInput = module.querySelector('#search-subscription__input');
  searchInput.addEventListener('input', onSearchSubscription);

  const searchForm = module.querySelector('#search-subscription');
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('reset search and select contact');
  });

  const listSectionEl = module.querySelector('#list-module__list');
  const subscriptionList = await getSubscriptionListEl();
  listSectionEl.replaceChildren(subscriptionList);

  return module;
}

export async function init() {
  const searchInput = document.querySelector('#search-subscription__input');
  searchInput.focus();

  // get url parameters
  const url = new URL(window.location);
  let subscriptionId = url.searchParams.get('id');
  if (subscriptionId) selectSubscription(subscriptionId);
}

async function getSubscriptionListEl() {
  const subscriptions = await request.subscriptions();
  const listEl = document.createElement('ul');
  listEl.id = 'subscription-list';

  for (let item of subscriptions) {
    const { id, firstname, lastname, date_start, delivery_time, frequency, interval } = item;
    const dateToday = new DateExt();
    const dateStart = new DateExt(date_start + 'T' + delivery_time);
    const dateEnd = new DateExt(dateStart);
    dateEnd.setDate(dateEnd.getDate() + (frequency - 1) * interval);

    // write status message
    let status = '';
    if (dateToday < dateStart) status = `starting on ${dateStart.toLocaleDateString()}`;
    else if (dateToday < dateEnd) status = `valid until ${dateEnd.toLocaleDateString()}`;
    else if (dateToday > dateEnd) status = 'completed';

    const itemEl = document.createElement('li');
    itemEl.innerHTML = `${firstname} ${lastname} ${status}`;
    itemEl.dataset.subscriptionId = id;
    listEl.appendChild(itemEl);

    itemEl.addEventListener('click', (event) => selectSubscription(event.target.closest('li').dataset.subscriptionId));
  }

  return listEl;
}

async function onPrepareNewSubscription() {
  const listSection = document.getElementById('list-module__details');
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/subscription`;
  form.method = 'POST';
  form.id = 'new-subscription';
  form.classList.add('form');
  form.addEventListener('submit', onCreateNewSubscription);
  form.innerHTML = `<section class="list-module__details__controls">
        <input type="submit" class="button-small" value="Create"/>
        <button type="button" class="button-small discard-btn">Discard</button>
    </section>

    <label for="new-subscription__contact">Client</label>
    <input list="contact-list" name="contactName" id="new-subscription__contact" placeholder="Hans Muster" autocomplete="off" required />
    <datalist id="contact-list"></datalist>
    <input type="hidden" name="contactId" id="contact-id" value="0">

    <label for="new-subscription__datestart">First Order Date</label>
    <input type="date" name="dateStart" id="new-subscription__datestart" required />

    <label for="new-subscription__time">Delivery Time</label>
    <input type="time" name="deliveryTime" id="new-subscription__time" required />

    <label for="new-subscription__interval">Repeat</label>
    <select id="new-subscription__interval" name="interval" required>
        <option value="7">Every week</option>
        <option value="14">Every 2 weeks</option>
        <option value="28">Every month</option>
        <option disabled>──────────</option>
        <option value="custom">Custom</option>
    </select>

    <label for="new-subscription__frequency">How many times?</label>
    <input type="number" name="frequency" id="new-subscription__frequency" min="2" max="10000" step="1" placeholder="5" required />

    <label for="new-subscription__price">Price per Order</label>
    <input id="new-subscription__price" name="pricePerOrder" type="number" min="0.00" max="10000.00" step="0.1" placeholder="100" required />CHF

    <label for="new-subscription__description">Description</label>
    <textarea name="description" id="new-subscription__description" placeholder="Write something here"></textarea>`;

  listSection.replaceChildren(form);

  // populate contact datalist
  const datalist = form.querySelector('#contact-list');
  const contacts = await request.contacts();
  for (const contact of contacts) {
    const { id, firstname, lastname } = contact;
    const option = document.createElement('option');
    option.dataset.contactId = id;
    option.value = `${firstname} ${lastname}`;
    datalist.appendChild(option);
  }

  // check if given contact is new
  const contactInput = form.querySelector('#new-subscription__contact');
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
}

async function onSearchSubscription() {}

async function selectSubscription(id) {
  try {
    // get subscription details
    const itemDetails = await getSubscriptionDetailsEl(id);
    const detailsWrapper = document.querySelector('#list-module__details');
    detailsWrapper.replaceChildren(itemDetails);

    // mark selected list item
    // const invoiceList = document.querySelectorAll('.invoice-list__invoice');
    // for (let invoice of invoiceList)
    //   if (invoice.dataset.invoiceId == id) invoice.dataset.selected = '';
    //   else delete invoice.dataset.selected;

    // add invoice id to url
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    const state = { pageKey: 'subscriptions', id: id };
    window.history.replaceState(state, '', url);
  } catch (error) {
    console.log(error);
    // const firstChild = document.querySelector('.invoice-list__invoice');
    // if (firstChild) selectInvoice(Number(firstChild.dataset.invoiceId)); // if present select first item
    // else document.querySelector('#list-module__details').replaceChildren(); // if no item present clear details
  }
}

async function getSubscriptionDetailsEl(id) {
  const data = await request.subscriptionDetails(id);
  const { invoice_id, amount, date_start, delivery_time, frequency, interval, description, contact_id, firstname, lastname } = data;
  const dateToday = new DateExt();
  const dateStart = new DateExt(date_start + 'T' + delivery_time);
  const dateEnd = new DateExt(dateStart);
  dateEnd.setDate(dateEnd.getDate() + (frequency - 1) * interval);

  // let statusObj = getStatusObject(dateDue, status);

  const wrapper = document.createElement('div');
  wrapper.id = 'subscription-details';
  wrapper.innerHTML = `
  <section id="list-module__details__controls">
    <button type="button" id="edit-btn" class="button-small" data-subscription-id="${id}">Edit</button>
  </section>
  <div id="list-module__details__info">
    <div><a href="/contacts?id=${contact_id}">${firstname} ${lastname ? lastname : ''}</a></div>
    <div>Starts on <time datetime="${dateStart.getDateString()}">${dateStart.toLocaleDateString()}</time></div>
    <div> ${amount ? amount + ' CHF' : ''} <a href="/invoices?id=${invoice_id}">go to invoice</a></div>
    ${description != '' && description != null ? '<div>' + description + '</div>' : ''}
  </div>
  <div id="list-module__details__extra"></div>`;

  // create list of linked orders
  const orders = await request.ordersByInvoice(invoice_id);
  if (orders.length > 0) {
    let orderListEl = document.createElement('ul');
    orderListEl.classList.add('list-condensed');

    for (let order of orders) {
      const dateDue = new DateExt(order.datetime_due);
      const orderEl = document.createElement('li');
      orderEl.innerHTML = `<a href="/orders?id=${order.id}">${dateDue.toLocaleDateString()}</a>, ${order.status}`;
      orderListEl.appendChild(orderEl);
    }

    const infoEl = wrapper.querySelector('#list-module__details__extra');
    infoEl.innerHTML += '<h2>Linked Orders</h2>';
    infoEl.appendChild(orderListEl);
  }

  const editBtn = wrapper.querySelector('#edit-btn');
  editBtn.addEventListener('click', onEditSubscription);

  return wrapper;
}

async function onCreateNewSubscription(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const response = await request.newSubscription(data);
  console.log(response);

  // insert new entry into list

  // select new entry
}

async function onEditSubscription(event) {
  const id = event.target.dataset.subscriptionId;
  console.log('edit ' + id);
  // const contactDetailsWrapper = document.getElementById('order-detail-section');
  // const form = await getOrderFormEl(id);
  // contactDetailsWrapper.replaceChildren(form);
}
