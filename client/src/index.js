const defaultPage = 'dashboard';
const pages = {
  dashboard: {
    title: 'Dashboard',
    slug: '/',
    module: import('./modules/dashboard.js'),
  },
  contacts: {
    title: 'Contacts',
    slug: '/contacts',
    module: import('./modules/contacts.js'),
  },
  orders: {
    title: 'Orders',
    slug: '/orders',
    module: import('./modules/orders.js'),
  },
  subscriptions: {
    title: 'Subscriptions',
    slug: '/subscriptions',
    module: import('./modules/subscriptions.js'),
  },
  invoices: {
    title: 'Invoices',
    slug: '/invoices',
    module: import('./modules/invoices.js'),
  },
};

function init() {
  // navigate to current URL after content has been loaded
  document.addEventListener('DOMContentLoaded', function () {
    let url = new URL(window.location);
    let stateObj = buildStateObjFromUrl(url);
    buildPage(stateObj);
  });

  // build page on history navigation event
  window.addEventListener('popstate', (event) => {
    if (event.state) buildPage(event.state, false); // navigate to page provided by state object
    else buildPage({ pageKey: 'dashboard' }, false); // fallback to default page
  });

  // build navigation from page object
  const navigation = document.getElementById('app-navigation');
  const list = document.createElement('ul');
  for (const key in pages) {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = pages[key].slug;
    link.innerHTML = pages[key].title;
    listItem.appendChild(link);
    list.appendChild(listItem);
    link.addEventListener('click', handlePageLinks);
  }
  navigation.replaceChildren(list);
}

async function buildPage(stateObj, addToHistory = true) {
  let pageKey = stateObj.pageKey;
  let page = pages[pageKey];
  document.title = 'Blumen | ' + page.title;

  // update navigation
  const linkList = document.querySelectorAll('#app-navigation li a');
  for (let link of linkList) {
    listItem = link.closest('li');
    if (link.getAttribute('href') === page.slug) listItem.dataset.active = '';
    else delete listItem.dataset.active;
  }

  // push page to browser history
  if (addToHistory) {
    let url = new URL(page.slug, window.location);

    // add id to url search parameters
    if (stateObj.id != undefined) url.searchParams.set('id', stateObj.id);
    // push history entry
    window.history.pushState(stateObj, page.title, url.href);
  }

  // load page module
  const target = document.getElementsByTagName('MAIN')[0];
  const module = await page.module;
  const content = await module.default(); // render
  target.replaceChildren(content);
  module.init?.(); // if function exists
}

/**
 * Prevent local links from reloading entire page
 * @param {Object} event event data
 */
function handlePageLinks(event) {
  event.preventDefault();
  if (event.target.host === window.location.host) {
    let url = new URL(event.target);
    let stateObj = buildStateObjFromUrl(url);
    buildPage(stateObj);
  }
}

function buildStateObjFromUrl(url) {
  let pageKey = '';
  for (let key in pages) if (pages[key].slug === url.pathname) pageKey = key;

  let stateObj = { pageKey: pageKey };

  if (url.searchParams.get('id')) stateObj.id = url.searchParams.get('id');

  return stateObj;
}

init();
