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
  form.classList.add('new-item-form');
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
        <input name="pricePerOrder" type="number" min="0.00" max="10000.00" step="0.1" placeholder="100" required />
        <span class="unit">CHF</span>
      </label>
    </div>

    <div class="form__input-group">
      <label>
        Description
        <textarea name="description" placeholder="Write something here"></textarea>
      </label>
    </div>
    
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

  <div class="form__input-group">
    <label>
      End Date
      <input type="date" name="endDate" required />
    </label>
  </div>`;

  // handle on discard button
  const discardBtnEl = form.querySelector('.discard-btn');
  discardBtnEl.addEventListener('click', () => document.querySelector('#list-module__details').replaceChildren());

  // handle on repeat selection
  const intervalEl = form.querySelector('select[name="interval"]');
  intervalEl.addEventListener('input', onSelectRepeat);

  function onSelectRepeat(event) {
    const value = event.target.value;
    const repeatContainer = event.target.closest('.form__input-group');
    let endTypeEl = form.querySelector('select[name="endType"]');

    if (value !== 'none' && !endTypeEl) {
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

      // display custom days field
      if (value === "custom") {
        console.log("every x days");
      }
    } else if (value === 'none' && endTypeEl) {
      endTypeContainer = endTypeEl.closest('.form__input-group');
      endTypeContainer.remove();
    }
  }

  function onSelectRepeatEnd(event) {
    const value = event.target.value;
    const repeatEndContainer = event.target.closest('.form__input-group');
    let frequencyEl = document.querySelector('select[name="frequency"]');

    console.log(frequencyEl);

    if (value === 'after' && !frequencyEl) {
      const frequencyContainer = document.createElement('div');
      frequencyContainer.classList.add('form__input-group');
      frequencyContainer.innerHTML = `
        <label>
          How many times?
          <input type="number" name="frequency" min="2" max="10000" step="1" placeholder="5" required />
        </label>`;

        repeatEndContainer.after(frequencyContainer);
    } else if (value === 'never' && frequencyEl) {
      frequencyContainer = frequencyEl.closest('.form__input-group');
      frequencyContainer.remove();
    }
  }

  listSection.replaceChildren(form);
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
  console.log(list);
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
