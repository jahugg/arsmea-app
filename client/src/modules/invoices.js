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
  } catch (error) {
    console.log(error);
  }
}

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
    <button type="button" id="mark-sent-btn" class="button-small" data-invoice-id="${id}">Mark as Sent</button>
    <button type="button" id="mark-paid-btn" class="button-small" data-invoice-id="${id}">Mark as Paid</button>
  </section>
  <div class="list-details__info">
    <div>${statusObj.message}</div>
    <div><a href="/contacts?id=${contact_id}">${firstname} ${lastname ? lastname : ''}</a></div>
    <div>Issued on <time datetime="${dateIssue.getDateString()}">${issueString}</time></div>
    ${statusObj.name === "paid"
    ? '<div>Paid on <time datetime="'+datePaid.getDateString()+'">'+paidString+'</time></div>'
    : '<div>Due on <time datetime="'+dateDue.getDateString()+'">'+dueString+'</time></div>'}
    <div>${amount} CHF</div>
  </div>`;

  const editBtn = wrapper.querySelector('#edit-btn');
  // editBtn.addEventListener('click', onEditInvoice);

  return wrapper;
}
