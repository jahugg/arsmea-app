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
        <button id="add-subscription-btn" class="button-add" type="button">Add Subscription</button>
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
  form.addEventListener('submit', onSubmitNewSubscription);
  form.innerHTML = `<section class="list-module__details__controls">
        <input type="submit" class="button-small" value="Create"/>
        <button type="button" class="button-small discard-btn">Discard</button>
    </section>

    <label for="new-subscription__contact">Client</label>
    <input list="contact-list" name="contactName" id="new-subscription__contact" placeholder="Hans Muster" autocomplete="off" required />
    <datalist id="contact-list"></datalist>
    <input type="hidden" name="contactId" id="contact-id" value="0">

    <label for="new-subscription__start">First Order</label>
    <input type="datetime-local" name="start" id="new-subscription__start" required />

    <label for="new-subscription__repeat">Repeat</label>
    <select id="new-subscription__repeat" name="repeat" required>
        <option value="1d">Every Day</option>
        <option value="7d">Every Week</option>
        <option value="14d">Every 2 Weeks</option>
        <option value="1m">Every Month</option>
        <option value="2m">Every Month</option>
    </select>

    <label for="new-subscription__end">End Date</label>
    <input type="date" name="end" id="new-subscription__end" required />

    <label for="new-subscription__price">Price per Order</label>
    <input id="new-subscription__price" name="price" type="number" min="0.00" max="10000.00" step="0.1" placeholder="100" required />CHF

    <label for="new-subscription__description">Description</label>
    <textarea name="description" id="new-subscription__description" placeholder="Notes"></textarea>`;

  listSection.replaceChildren(form);
}

async function onSearchSubscription() {}

async function selectSubscription() {}

async function onSubmitNewSubscription() {}
