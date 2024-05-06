import * as request from './serverRequests.js';

// API url (use process.env.SERVER for prod)
const apiUrl = window.appConfig.apiUrl;

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

  return module;
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
  console.log("new order id: " + id);

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
  const listEl = document.createElement('ul');
  console.log(list);

  // if (list.length) {
  //   for (let item of subscriptions) {
  //     const itemEl = getListItemEl(item);
  //     listEl.appendChild(itemEl);
  //   }
  // } else listEl.innerHTML = 'No Items Found';

  return listEl;
}

function getListItemEl(item) {
  let itemEl = document.createElement('div');
  return itemEl;
}
