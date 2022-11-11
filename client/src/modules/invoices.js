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
            <input type="text" pattern="[^0-9]*" name="input" id="search-invoice__input" placeholder="Contact Name..." autocomplete="off" required/>
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
      </section>
      <section id="list-module__list"></section>
      <section id="list-module__details"></section>`;

  const searchInput = module.querySelector('#search-invoice__input');
  searchInput.addEventListener('input', onSearchInvoice);

  const searchForm = module.querySelector('#search-invoice');
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('reset search and select contact');
  });

  // add filter button functions
  const filters = module.querySelectorAll('#filter-invoice input');
  for (let btn of filters) {
    btn.addEventListener('click', onChangeListFilter);
  }

  const listSectionEl = module.querySelector('#list-module__list');
  const invoiceListEl = await getInvoiceListEl(true);
  listSectionEl.replaceChildren(invoiceListEl);

  return module;
}

export async function init() {
  const searchInput = document.querySelector('#search-invoice__input');
  searchInput.focus();

  // get url parameters
  const url = new URL(window.location);
  if (url.searchParams.has('id')) selectInvoice(url.searchParams.get('id'));
}

async function onChangeListFilter(event) {
  let value = event.target.value;
  let invoiceListEl;

  // replace invoice list
  if (value == 'open') invoiceListEl = await getInvoiceListEl(true);
  else if (value == 'all') invoiceListEl = await getInvoiceListEl();

  const listSectionEl = document.querySelector('#list-module__list');
  listSectionEl.replaceChildren(invoiceListEl);
}

async function getInvoiceListEl(openOnly = false) {
  let invoices;

  if (openOnly) invoices = await request.invoicesOpen();
  else invoices = await request.invoices();

  // const invoices = await request.invoices();

  const listEl = document.createElement('ul');
  listEl.id = 'invoice-list';
  openOnly ? (listEl.dataset.filter = 'open') : (listEl.dataset.filter = 'all');

  for (let item of invoices) {
    let { id, amount, status, date_due, firstname, lastname } = item;
    let dueDate = new DateExt(date_due);
    let statusObj = getStatusObject(dueDate, status);

    const itemEl = document.createElement('li');
    itemEl.dataset.invoiceId = id;
    itemEl.classList.add('invoice-list__invoice');
    itemEl.innerHTML = `<span class="status" ${'data-status=' + statusObj.name}>${statusObj.message}</span>
    <span class="contact">${firstname} ${lastname}</span>
    <span class="price">${amount} CHF</span>`;
    itemEl.addEventListener('click', (event) => selectInvoice(event.target.closest('li').dataset.invoiceId));
    listEl.appendChild(itemEl);
  }

  return listEl;
}

async function onSearchInvoice() {}

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
    console.log(error);
  }
}

async function getInvoiceDetailsEl(id) {
  const { date_issue, date_due, date_paid, amount, status, contact_id, firstname, lastname } = await request.invoiceDetails(id);
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
    Linked Orders
  </div>`;

  // create list of linked orders
  const orders = await request.ordersByInvoice(id);
  let orderListEl = document.createElement('ul');

  for (let order of orders) {
    const datePlaced = new DateExt(order.datetime_placed);
    const placedString = `${datePlaced.getDate()}. ${datePlaced.nameOfMonth()} ${datePlaced.getFullYear()}`;

    let orderEl = document.createElement('li');
    orderEl.innerHTML = `<a href="/orders?id=${order.id}">${placedString}</a> ${order.status}`;
    orderListEl.appendChild(orderEl);
  }

  let infoEl = wrapper.querySelector('#list-module__details__info');
  infoEl.appendChild(orderListEl);

  const editBtn = wrapper.querySelector('#edit-btn');
  // editBtn.addEventListener('click', onEditInvoice);

  const toggleStatusBtn = wrapper.querySelector('#toggle-status-btn');
  toggleStatusBtn.addEventListener('click', async (event) => {
    const id = event.target.dataset.invoiceId;
    const status = event.target.dataset.status;

    if (status === 'open') setInvoicePaid(id);
    else if (status === 'paid') setInvoiceOpen(id);
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
    console.log(invoiceStatusEl);
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
