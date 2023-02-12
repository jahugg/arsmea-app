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
  selectSubscription(subscriptionId);
}

async function getSubscriptionListEl() {
  const subscriptions = await request.subscriptions();
  const listEl = document.createElement('ul');
  listEl.id = 'subscription-list';

  for (let item of subscriptions) {
    const { id, firstname, lastname, datetime_start } = item;
    const itemEl = document.createElement('li');
    itemEl.innerHTML = `${firstname} ${lastname} ${datetime_start}`;
    listEl.appendChild(itemEl);
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

async function selectSubscription() {}

async function onCreateNewSubscription(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const response = await request.newSubscription(data);
  console.log(response);

  // insert new entry into list

  // select new entry
}
