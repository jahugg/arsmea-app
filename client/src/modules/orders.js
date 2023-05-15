import * as request from './serverRequests';
import { Calendar, DateExt } from './calendar';

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
          <!-- <input type="reset" value="Reset"> //-->
          <datalist id="contact-list-main"></datalist>
          <input type="hidden" name="contactId" class="contact-id" value="0">
        </form>
        <button class="add-item-btn" class="button-add" type="button">Add Item</button>
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

  const listSectionEl = module.querySelector('#list-module__list');
  const itemList = getListEl(await request.orders());
  listSectionEl.replaceChildren(itemList);

  // populate datalist with clients
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

  return module;
}

function onPrepareNewItem() {
  const listSection = document.getElementById('list-module__details');
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/order`;
  form.method = 'POST';
  form.classList.add('new-item-form', 'form');
  form.addEventListener('submit', onCreateItem);
  form.innerHTML = `<section class="list-module__details__controls">
        <input type="submit" class="button-small" value="Create"/>
        <button type="button" class="button-small discard-btn">Discard</button>
    </section>

    <div class="form__input-group">
      <label>
        Client
        <input list="contact-list" name="contactName" placeholder="Hanna Muster" autocomplete="off" required />
      </label>
      <datalist id="contact-list"></datalist>
      <input type="hidden" name="contactId" id="contact-id" value="0">
    </div>
    
    <div class="form__input-group">
      <label>
        Due Date
        <input type="datetime-local" name="dueDatetime" required />
      </label>
    </div>

    <div class="form__input-group">
      <label>
        Price
        <div class="form__input-unit">
          <input name="pricePerOrder" type="number" min="0.00" max="10000.00" step="0.1" placeholder="100" required />
          <span class="unit">CHF</span>
        </div>
      </label>
    </div>

    <div class="form__input-group">
      <label>
        Description
        <textarea rows="1" name="description" placeholder="Write something here"></textarea>
      </label>
    </div>

    <fieldset>
      <legend>Delivery</legend>
      <div class="form__input-group">
        <label>
          Type
          <select name="delivery" required>
              <option value="pickup">Pick-Up</option>
              <option value="deliver">Deliver</option>
          </select>
        </label>
      </div>
    </fieldset>
    
    <fieldset>
      <legend>Subscription</legend>
      <div class="form__input-group">
        <label>
          Repeat
          <select name="interval" required>
              <option value="none">None</option>
              <option value="7">Every week</option>
              <option value="14">Every 2 weeks</option>
              <option value="28">Every month</option>
              <option disabled>──────────</option>
              <option value="custom">Custom</option>
          </select>
        </label>
      </div>
    </fieldset>`;

  listSection.replaceChildren(form);

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
  const textarea = form.querySelector('textarea[name="description"]');
  textarea.addEventListener('input', onTextareaInput);

  // handle on textarea input
  // auto resize textarea
  function onTextareaInput(event) {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  }

  // handle on delivery selection
  function onSelectDelivery(event) {
    const value = event.target.value;
    const deliveryContainer = event.target.closest('.form__input-group');

    if (value === 'pickup') {
      // remove frequency input
      removeInputGroupOf('textarea[name="deliveryAddress"]');
    } else if (value === 'deliver') {
      // add delivery address container
      let deliveryAddressEl = document.querySelector('textarea[name="deliveryAddress"]');
      if (!deliveryAddressEl) {
        const deliveryAddressContainer = document.createElement('div');
        deliveryAddressContainer.classList.add('form__input-group');
        deliveryAddressContainer.innerHTML = `
        <label>
          Address
          <textarea name="deliveryAddress" rows="2" placeholder="Hauserstrasse 128\n8400 Winterthur"></textarea>
        </label>`;

        deliveryContainer.after(deliveryAddressContainer);

        // add autoresize behaviour
        const textarea = form.querySelector('textarea[name="deliveryAddress"]');
        textarea.addEventListener('input', onTextareaInput);
      }
    }
  }

  // handle on repeat selection
  function onSelectRepeat(event) {
    const value = event.target.value;
    const repeatContainer = event.target.closest('.form__input-group');

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
        const endTypeContainer = document.createElement('div');
        endTypeContainer.classList.add('form__input-group');
        endTypeContainer.innerHTML = `
          <label>
            End Repeat
            <select name="endType" required>
                <option value="never">Never</option>
                <option value="after">After</option>
                <option value="date">On Date</option>
            </select>
          </label>`;

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
        const customIntervalContainer = document.createElement('div');
        customIntervalContainer.classList.add('form__input-group');
        customIntervalContainer.innerHTML = `
          <label>
          Repeat every
          <div class="form__input-unit">
            <input name="customInterval" type="number" min="0" max="10000" step="1" placeholder="21" required />
            <span class="unit">days</span>
          </div>
        </label>`;

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
    const repeatEndContainer = event.target.closest('.form__input-group');

    // handle frequency input
    if (value === 'after') {
      // add frequency container
      let frequencyEl = document.querySelector('input[name="frequency"]');
      if (!frequencyEl) {
        const frequencyContainer = document.createElement('div');
        frequencyContainer.classList.add('form__input-group');
        frequencyContainer.innerHTML = `
          <label>
            End after
            <div class="form__input-unit">
              <input type="number" name="frequency" min="2" max="10000" step="1" placeholder="5" required />
              <span class="unit">times</span>
            </div>
          </label>`;

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
        const endDateEl = document.createElement('div');
        endDateEl.classList.add('form__input-group');
        endDateEl.innerHTML = `
          <label>
            End On
            <input type="date" name="endDate" required />
          </label>`;

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
      container = el.closest('.form__input-group');
      container.remove();
    }
  }
}

function onCreateItem() {}

function onSearchItem(event) {
  event.preventDefault();
  console.log('search item');
}

/**
 * build list element
 * @param {Object} list data list
 */
function getListEl(list) {
  const listEl = document.createElement('ul');

  if (list.length) {
    for (let item of subscriptions) {
      const itemEl = getListItemEl(item);
      listEl.appendChild(itemEl);
    }
  } else listEl.innerHTML = 'No Items Found';

  return listEl;
}

function getListItemEl(item) {
  let itemEl = document.createElement('div');
  return itemEl;
}
