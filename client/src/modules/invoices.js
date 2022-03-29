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

  const listSectionEl = module.querySelector('#list-module__list');
  const invoiceListEl = await getInvoiceListEl();
  listSectionEl.replaceChildren(invoiceListEl);

  return module;
}

export async function init() {
  const searchInput = document.querySelector('#search-invoice__input');
  searchInput.focus();

  // get url parameters
  const url = new URL(window.location);
  let invoiceId = url.searchParams.get('id');
  selectInvoice(invoiceId);
}

async function getInvoiceListEl() {
  const invoices = await request.invoices();
  const listEl = document.createElement('ul');
  listEl.id = 'invoice-list';

  for (let item of invoices) {
    const { id, amount, date_paid, date_due, firstname, lastname } = item;
    const itemEl = document.createElement('li');
    itemEl.innerHTML = `${date_due} ${firstname} ${lastname} ${amount} CHF ${date_paid}`;
    listEl.appendChild(itemEl);
  }

  return listEl;
}

async function onSearchInvoice() {}

async function selectInvoice() {}
