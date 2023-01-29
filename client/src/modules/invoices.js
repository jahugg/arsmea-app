import * as request from './serverRequests';
import { Calendar, DateExt } from './calendar';

export default async function render() {
  const module = document.createElement('div');
  module.classList.add('list-module');
  module.id = 'invoices';
  module.innerHTML = `
      <section id="list-module__controls">
        <div>
          <form id="search-invoice" role="search">
            <label id="search-invoice__label" for="search-invoice__input">Search</label>
            <input list="contact-list-main" type="text" pattern="[^0-9]*" name="input" id="search-invoice__input" placeholder="Contact Name..." autocomplete="off" required/>
            <datalist id="contact-list-main"></datalist>
            <input type="hidden" name="contactId" class="contact-id" value="0">
          </form>
          <div id="filter-invoice">
            <label>
              <input type="radio" name="toggle-invoice" value="open" checked>
              Open
            </label>
            <label>
              <input type="radio" name="toggle-invoice" value="all">
              All
            </label>
          </div>
        </div>
        <button id="add-invoice-btn" type="button" class="button-add">New Invoice</button>
      </section>
      <section id="list-module__list"></section>
      <section id="list-module__details"></section>`;

  const addButton = module.querySelector('#add-invoice-btn');
  addButton.addEventListener('click', onPrepareNewInvoice);

  const contactIdInput = module.querySelector('#search-invoice .contact-id');
  const searchInput = module.querySelector('#search-invoice__input');
  searchInput.addEventListener('input', (event) => {
    const value = event.target.value;
    let contactId = 0;

    // check if input matches a current client
    for (const item of datalist.children) {
      item.value === value ? (contactId = item.dataset.contactId) : '';
    }
    // write value to form (hidden)
    contactIdInput.value = contactId;
  });

  // search invoices by contact
  const searchForm = module.querySelector('#search-invoice');
  searchForm.addEventListener('submit', onSearchInvoice);

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

  // add filter button functions
  const filters = module.querySelectorAll('#filter-invoice input');
  for (let btn of filters) {
    btn.addEventListener('click', onChangeListFilter);
  }

  const listSectionEl = module.querySelector('#list-module__list');
  const invoiceListEl = getInvoiceListEl(await request.invoicesOpen());
  listSectionEl.replaceChildren(invoiceListEl);

  return module;
}

export function init() {
  const searchInput = document.querySelector('#search-invoice__input');
  searchInput.focus();

  // get url parameters
  const url = new URL(window.location);
  if (url.searchParams.has('id')) selectInvoice(url.searchParams.get('id'));
}

async function onPrepareNewInvoice(event) {
  const detailsSection = document.getElementById('list-module__details');
  const wrapper = document.createElement('div');
  wrapper.id = 'invoice-details';
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/invoice`;
  form.method = 'POST';
  form.id = 'new-invoice';
  form.addEventListener('submit', onCreateNewInvoice);
  form.innerHTML = `
    <section class="content-controls">
      <input type="submit" class="button-small" value="Save"/>
      <button type="button" class="button-small" id="discard-invoice-btn">Discard</button>
    </section>
    <div id="new-invoice__input" class="form__input-group">
      <label for="new-invoice__contact">Client</label>
      <input list="contact-list" name="contactName" id="new-invoice__contact" autocomplete="off" placeholder="Hans Muster" required />
      <datalist id="contact-list"></datalist>
      <input type="hidden" name="contactId" id="contact-id" value="0">
    </div>
    <div class="form__input-group">
        <label for="new-invoice__amount">Amount</label>
        <div class="form__input-unit">
          <input id="new-invoice__amount" name="amount" type="number" min="0.00" step="0.1" placeholder="100" required />
          CHF
        </div>
    </div>
    <div class="form__input-group">
      <label for="new-invoice__issue">Issue Date</label>
      <input type="date" name="issue" id="new-invoice__issue" required />
    </div>
    <div class="form__input-group">
      <label for="new-invoice__due">Due Date</label>
      <input type="date" name="due" id="new-invoice__due" required />
    </div>
    <div class="form__input-group">
      <label for="new-invoice__description">Description</label>
      <textarea name="description" id="new-invoice__description" placeholder="Notes"></textarea>
    </div>`;

  wrapper.appendChild(form);
  detailsSection.replaceChildren(wrapper);

  // set dates
  let issueDate = new DateExt();
  let dueDate = new DateExt();
  dueDate.setDate(dueDate.getDate() + 15);

  // configure issue date element
  let issueEl = document.getElementById('new-invoice__issue');
  issueEl.valueAsDate = issueDate;
  issueEl.max = dueDate.getDateString();

  // adjust due date minimum on issue date change
  issueEl.addEventListener('input', (event) => {
    let dueEl = document.getElementById('new-invoice__due');
    dueEl.min = event.target.value;
  });

  // configure due date element
  let dueEl = document.getElementById('new-invoice__due');
  dueEl.valueAsDate = dueDate;
  dueEl.min = issueDate.getDateString();

  // adjust issue date maximum on due date change
  dueEl.addEventListener('input', (event) => {
    let issueEl = document.getElementById('new-invoice__issue');
    issueEl.max = event.target.value;
  });

  // add discard button functionality
  const discardBtn = document.getElementById('discard-invoice-btn');
  discardBtn.addEventListener('click', () => document.querySelector('#list-module__details').replaceChildren());

  const invoiceListItems = document.querySelectorAll('#invoice-list li');
  for (const item of invoiceListItems) delete item.dataset.selected;

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
  const contactInput = wrapper.querySelector('#new-invoice__contact');
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
    } else delete contactInput.parentNode.dataset.newContact;
  });
}

async function onCreateNewInvoice(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const response = await request.newInvoice(formData);
  const id = response.id;

  // insert invoice into current list
  const dateDue = new DateExt(formData.get('due'));
  let closestDateEl;
  let smallestDifference = 0;
  const listElements = document.getElementsByClassName('invoice-list__invoice');

  // search element with closest due date
  for (const el of listElements) {
    const dateDueTemp = new DateExt(el.dataset.dateDue);
    const difference = dateDue.diffInDaysTo(dateDueTemp);
    if (difference <= smallestDifference) closestDateEl = el;
  }

  // get new database entry
  const data = await request.invoiceDetails(id);
  const itemEl = getInvoiceListItemEl(data);
  closestDateEl.after(itemEl);

  // select new invoice
  selectInvoice(id);
}

async function onChangeListFilter(event) {
  let value = event.target.value;
  let invoiceList;

  // replace invoice list
  if (value == 'open') invoiceList = await request.invoicesOpen();
  else if (value == 'all') invoiceList = await request.invoices();

  let invoiceListEl = getInvoiceListEl(invoiceList);

  const listSectionEl = document.querySelector('#list-module__list');
  listSectionEl.replaceChildren(invoiceListEl);
}

async function onEditInvoice(event) {
  const id = event.target.dataset.invoiceId;
  const detailsWrapper = document.getElementById('list-module__details');
  const form = await getInvoiceFormEl(id);
  detailsWrapper.replaceChildren(form);
}

async function getInvoiceFormEl(id) {
  const data = await request.invoiceDetails(id);
  const { status, amount, date_issue, date_paid, date_due, description, contact_id, firstname, lastname } = data;

  const dateIssue = new DateExt(date_issue);
  const dateDue = new DateExt(date_due);

  const wrapper = document.createElement('div');
  wrapper.id = 'invoice-details';
  const form = document.createElement('form');
  form.action = `${process.env.SERVER}/api/updateInvoice`;
  form.method = 'POST';
  form.id = 'edit-invoice';
  form.addEventListener('submit', onUpdateInvoice);
  form.innerHTML = `<section class="content-controls">
      <input type="submit" class="button-small" value="Save Changes" />
      <button type="button" id="discard-invoice-btn" class="button-small">Discard Changes</button>
      <button type="button" id="delete-invoice-btn" class="button-small" data-invoice-id="${id}">Delete Invoice</button>
    </section>
    <input type="hidden" id="edit-invoice__id" name="id" value="${id}">
    <div class="form__input-group">
        <label for="edit-invoice__status">Status</label>
        <select id="edit-invoice__status" name="status">
            <option value="open">Open</option>
            <option value="paid">Paid</option>
        </select>
    </div>
    <div class="form__input-group">
        <label for="edit-invoice__amount">Amount</label>
        <input id="edit-invoice__amount" name="amount" type="number" min="0.00" max="10000.00" step="0.1" value="${amount}" required/>CHF
    </div>
    <div class="form__input-group">
      <label for="edit-invoice__issue">Issue Date</label>
      <input type="date" name="date_issue" id="edit-invoice__issue" required/>
    </div>
    <div class="form__input-group">
      <label for="edit-invoice__due">Due Date</label>
      <input type="date" name="date_due" id="edit-invoice__due" required/>
    </div>
    <div class="form__input-group" hidden>
      <label for="edit-invoice__paid">Paid Date</label>
      <input type="date" name="date_paid" id="edit-invoice__paid"/>
    </div>
    <div class="form__input-group">
      <label for="edit-invoice__description">Description</label>
      <textarea name="description" id="edit-invoice__description" placeholder="Notes">${description ? description : ''}</textarea>
    </div>`;

  // select current status
  const statusOptions = form.querySelectorAll('#edit-invoice__status option');
  for (let option of statusOptions) {
    if (option.value === status) option.setAttribute('selected', 'true');
  }
  wrapper.appendChild(form);

  // discard button
  const discardBtn = form.querySelector('#discard-invoice-btn');
  discardBtn.addEventListener('click', () => selectInvoice(id));

  // delete button
  const deleteBtn = wrapper.querySelector('#delete-invoice-btn');
  deleteBtn.addEventListener('click', onDeleteInvoice);

  // disable delete button if orders with invoice exist
  const orders = await request.ordersByInvoice(id);
  if (orders.length > 0) deleteBtn.setAttribute('disabled', '');

  // configure issue date element
  let issueEl = wrapper.querySelector('#edit-invoice__issue');
  issueEl.valueAsDate = dateIssue;
  issueEl.max = dateDue.getDateString();

  // configure due date element
  let dueEl = wrapper.querySelector('#edit-invoice__due');
  dueEl.valueAsDate = dateDue;
  dueEl.min = dateIssue.getDateString();

  // adjust due date minimum on issue date change
  issueEl.addEventListener('input', (event) => {
    let dueEl = document.querySelector('#edit-invoice__due');
    dueEl.min = event.target.value;
  });

  // adjust issue date maximum on due date change
  dueEl.addEventListener('input', (event) => {
    let issueEl = document.querySelector('#edit-invoice__issue');
    issueEl.max = event.target.value;
  });

  // toggle paid date field when changing state
  let statusInputEl = wrapper.querySelector('#edit-invoice__status');
  statusInputEl.addEventListener('input', (event) => {
    let value = event.target.value;
    if (value === 'paid') {
      let paidEl = document.querySelector('#edit-invoice__paid');
      paidEl.setAttribute('required', '');
      paidEl.parentElement.removeAttribute('hidden');
    } else if (value === 'open') {
      let paidEl = document.querySelector('#edit-invoice__paid');
      paidEl.removeAttribute('required');
      paidEl.value = '';
      paidEl.parentElement.setAttribute('hidden', '');
    }
  });

  // if invoice is marked as paid display paid input
  if (status === 'paid') {
    const datePaid = new DateExt(date_paid);

    // configure paid date element
    let paidEl = wrapper.querySelector('#edit-invoice__paid');
    paidEl.setAttribute('required', '');
    paidEl.parentElement.removeAttribute('hidden');
    paidEl.valueAsDate = datePaid;
    paidEl.min = dateIssue.getDateString();

    // adjust paid date minimum on issue date change
    issueEl.addEventListener('input', (event) => {
      let paidEl = document.querySelector('#edit-invoice__paid');
      paidEl.min = event.target.value;
    });
  }

  return wrapper;
}

function getInvoiceListEl(invoiceList) {
  const listEl = document.createElement('ul');
  listEl.id = 'invoice-list';
  // openOnly ? (listEl.dataset.filter = 'open') : (listEl.dataset.filter = 'all');

  if (invoiceList.length) {
    for (let data of invoiceList) {
      const itemEl = getInvoiceListItemEl(data);
      listEl.appendChild(itemEl);
    }
  } else listEl.innerHTML = 'No Invoices Found';

  return listEl;
}

// create and return list item element for invoice
function getInvoiceListItemEl(data) {
  let { id, amount, status, date_due, firstname, lastname } = data;
  let dueDate = new DateExt(date_due);
  let statusObj = getStatusObject(dueDate, status);

  const itemEl = document.createElement('li');
  itemEl.dataset.invoiceId = id;
  itemEl.dataset.dateDue = dueDate.getDateString();
  itemEl.classList.add('invoice-list__invoice');
  itemEl.innerHTML = `<span class="status" ${'data-status=' + statusObj.name}>${statusObj.message}</span>
  <span class="contact">${firstname} ${lastname}</span>
  <span class="price">${amount} CHF</span>`;
  itemEl.addEventListener('click', (event) => selectInvoice(event.target.closest('li').dataset.invoiceId));
  return itemEl;
}

/**
 * update invoice entry
 * @param {Object} event event data
 */
async function onUpdateInvoice(event) {
  event.preventDefault();
  const data = new URLSearchParams(new FormData(event.target));
  const id = data.get('id');
  let response = await request.updateInvoice(id, data);

  // replace item in invoice list
  // cleaner way to avoid second DB request?
  const oldEl = document.querySelector(`.invoice-list__invoice[data-invoice-id="${id}"]`);
  if (oldEl) {
    const newEl = getInvoiceListItemEl(await request.invoiceDetails(id));
    newEl.dataset.selected = '';
    oldEl.replaceWith(newEl);
  }

  selectInvoice(id);
}

async function onDeleteInvoice(event) {
  const invoiceId = event.target.dataset.invoiceId;

  if (window.confirm('Delete Invoice?')) {
    const result = await request.deleteInvoice(invoiceId);
    const invoiceEl = document.querySelector(`.invoice-list__invoice[data-invoice-id="${invoiceId}"]`);
    invoiceEl.remove();
    const invoiceDetailsWrapper = document.getElementById('list-module__details');
    invoiceDetailsWrapper.innerHTML = '';
  }
}

async function onSearchInvoice(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  id = data.get('contactId');

  // display invoices of contact
  const invoiceList = await request.invoicesByContact(id);
  const invoiceListEl = getInvoiceListEl(invoiceList);

  const listSectionEl = document.querySelector('#list-module__list');
  listSectionEl.replaceChildren(invoiceListEl);

  // const listSectionEl = document.querySelector('#list-module__list');
  // if (invoiceList.length) {
  //   const orderListEl = getOrderListEl(orderList);
  //   orderListWrapper.replaceChildren(orderListEl);
  // } else orderListWrapper.innerHTML = 'No invoices yet. Please add invoice first.';

  // const listSectionEl = module.querySelector('#list-module__list');
  // const invoiceListEl = await getInvoiceListEl(true);
  // listSectionEl.replaceChildren(invoiceListEl);
}

async function selectInvoice(id) {
  try {
    // get invoice details
    const invoiceDetails = await getInvoiceDetailsEl(id);
    const detailsWrapper = document.querySelector('#list-module__details');
    detailsWrapper.replaceChildren(invoiceDetails);

    // mark selected list item
    const invoiceList = document.querySelectorAll('.invoice-list__invoice');
    for (let invoice of invoiceList)
      if (invoice.dataset.invoiceId == id) invoice.dataset.selected = '';
      else delete invoice.dataset.selected;

    // add invoice id to url
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    const state = { invoice_id: id };
    window.history.replaceState(state, '', url);
  } catch (error) {
    const firstChild = document.querySelector('.invoice-list__invoice');
    if (firstChild) selectInvoice(Number(firstChild.dataset.invoiceId)); // if present select first item
    else document.querySelector('#list-module__details').replaceChildren(); // if no item present clear details
  }
}

async function getInvoiceDetailsEl(id) {
  const { date_issue, date_due, date_paid, amount, status, description, contact_id, firstname, lastname } = await request.invoiceDetails(id);
  const dateIssue = new DateExt(date_issue);
  const dateDue = new DateExt(date_due);
  const datePaid = new DateExt(date_paid);
  const issueString = `${dateIssue.getDate()}. ${dateIssue.nameOfMonth()} ${dateIssue.getFullYear()}`;
  const dueString = `${dateDue.getDate()}. ${dateDue.nameOfMonth()} ${dateDue.getFullYear()}`;
  const paidString = `${datePaid.getDate()}. ${datePaid.nameOfMonth()} ${datePaid.getFullYear()}`;

  let statusObj = getStatusObject(dateDue, status);

  const wrapper = document.createElement('div');
  wrapper.id = 'invoice-details';
  wrapper.innerHTML = `
  <section id="list-module__details__controls">
    <button type="button" id="edit-btn" class="button-small" data-invoice-id="${id}">Edit</button>
    <button type="button" id="toggle-status-btn" class="button-small" data-status="${status === 'open' ? 'open' : 'paid'}" data-invoice-id="${id}">
      ${status === 'open' ? 'Mark as Paid' : 'Mark as Open'}
    </button>
  </section>
  <div id="list-module__details__info">
    <div><a href="/contacts?id=${contact_id}">${firstname} ${lastname ? lastname : ''}</a></div>
    <div>${amount} CHF</div>
    <div>Issued on <time datetime="${dateIssue.getDateString()}">${issueString}</time></div>
    ${
      statusObj.name === 'paid'
        ? '<div>Paid on <time datetime="' + datePaid.getDateString() + '">' + paidString + '</time></div>'
        : '<div>Due on <time datetime="' + dateDue.getDateString() + '">' + dueString + '</time></div>'
    }
    <div data-status="${statusObj.name}">${statusObj.message}</div>
    ${description != '' ||  description != null ? '<div>' + description + '</div>' : ''}
  </div>`;

  // create list of linked orders
  const orders = await request.ordersByInvoice(id);
  if (orders.length > 0) {
    let orderListEl = document.createElement('ul');

    for (let order of orders) {
      const datePlaced = new DateExt(order.datetime_placed);
      const placedString = `${datePlaced.getDate()}. ${datePlaced.nameOfMonth()} ${datePlaced.getFullYear()}`;

      let orderEl = document.createElement('li');
      orderEl.innerHTML = `<a href="/orders?id=${order.id}">${placedString}</a> ${order.status}`;
      orderListEl.appendChild(orderEl);
    }

    let infoEl = wrapper.querySelector('#list-module__details__info');
    infoEl.innerHTML += 'Linked Orders';
    infoEl.appendChild(orderListEl);
  }

  const editBtn = wrapper.querySelector('#edit-btn');
  editBtn.addEventListener('click', onEditInvoice);

  // use dialog element for status change
  const dialogEl = document.createElement('dialog');
  dialogEl.innerHTML = `<form method="dialog">
      <input type="hidden" id="edit-invoice__id" name="id" value="${id}">
      <input type="hidden" id="edit-invoice__status" name="status" value="paid">
      <div class="form__input-group">
        <label for="edit-invoice__paid">Paid On</label>
        <input type="date" name="date_paid" id="edit-invoice__paid"/>
      </div>
      <div>
        <button id="cancel-dialog" type="reset">Cancel</button>
        <button type="submit">Confirm</button>
      </div>
    </form>`;
  wrapper.appendChild(dialogEl);

  const toggleStatusBtn = wrapper.querySelector('#toggle-status-btn');
  toggleStatusBtn.addEventListener('click', async (event) => {
    const id = event.target.dataset.invoiceId;
    const status = event.target.dataset.status;

    // set status to paid
    if (status === 'open') {
      const newDatePaid = dialogEl.querySelector('#edit-invoice__paid');
      newDatePaid.valueAsDate = new Date();
      newDatePaid.min = dateIssue.getDateString();

      const cancelDialogBtn = dialogEl.querySelector('#cancel-dialog');
      cancelDialogBtn.addEventListener('click', () => dialogEl.close());

      const form = dialogEl.querySelector('form');
      form.addEventListener('submit', async (event) => {
        const data = new URLSearchParams(new FormData(event.target));
        const id = data.get('id');
        let response = await request.updateInvoice(id, data);
      });

      dialogEl.showModal();

      // set status to open
    } else if (status === 'paid') {
      if (window.confirm('Set Invoice to Open?')) {
        const obj = { id: id, status: 'open', date_paid: '' };
        const data = new URLSearchParams(obj);
        let response = await request.updateInvoice(id, data);
      }
    }
  });

  return wrapper;
}

/**
 * mark invoice as paid with the current date
 * @param {String} id invoice id
 * @todo let user select date of payment instead of using current date
 */
async function setInvoicePaid(id) {
  try {
    // const response = await request.setInvoicePaid(id);

    // remove item from list
    const listEl = document.getElementById('invoice-list');
    const invoiceEl = listEl.querySelector(`.invoice-list__invoice[data-invoice-id="${id}"]`);
    const invoiceStatusEl = invoiceEl.querySelector(`.status`);
    if (invoiceEl) {
      if (listEl.dataset.filter === 'open') invoiceEl.remove();
      else if (listEl.dataset.filter === 'all') invoiceStatusEl.dataset.status = 'paid';
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * mark invoice as unpaid
 * @param {String} id invoice id
 */
async function setInvoiceOpen(id) {
  try {
    const response = await request.setInvoiceOpen(id);
  } catch {}
}

/**
 * determine status of invoice and write status message
 * @param {DateExt} dueDate due date of the invoice
 * @param {String} status current state of the invoice
 */
function getStatusObject(dueDate, status) {
  let dayDiff = new DateExt().diffInDaysTo(dueDate);
  let statusObj = {
    name: status,
    message: '',
  };

  if (status === 'paid') statusObj.message = 'paid';
  else if (status === 'open' && dayDiff >= 0) statusObj.message = `due in ${dayDiff} days`;
  else {
    statusObj.name = 'late';
    statusObj.message = `${Math.abs(dayDiff)} days late`;
  }
  return statusObj;
}
