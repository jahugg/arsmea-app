window.appConfig = {
  apiUrl: 'http://localhost:5123',
};

// Object with all pages and reference to the contents
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

/**
 * Initializes the application by setting up event listeners for DOMContentLoaded and popstate events.
 * Navigates to the current URL after the content has been loaded and builds the page based on the URL's state object.
 * Handles history navigation events by building the page corresponding to the state object or falling back to the default page.
 * Builds navigation links based on the pages object and sets up event listeners for click events.
 *
 * @returns {void}
 */
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

/**
 * Builds a page based on the provided state object and updates browser history if specified.
 * Sets the document title, updates navigation based on the active page, and pushes a new history entry if addToHistory is true.
 * Loads the module associated with the page and renders its content to the target element.
 * Optionally initializes the module if an init function exists.
 *
 * @param {Object} stateObj - The state object representing the page state.
 * @param {boolean} [addToHistory=true] - Indicates whether to add the page to browser history.
 * @returns {Promise<void>} A promise that resolves after the page is built and rendered.
 */
async function buildPage(stateObj, addToHistory = true) {
  let pageKey = stateObj.pageKey;
  let page = pages[pageKey];
  document.title = 'ars mea | ' + page.title;

  // update navigation
  const linkList = document.querySelectorAll('#app-navigation li a');
  for (let link of linkList) {
    let listItem = link.closest('li');
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
  module.init?.(); // initialize if init function exists
}

/**
 * Handles clicks on page links.
 * Prevents the default action, checks if the clicked link is within the same host as the current window,
 * and builds a page based on the URL if it matches the current host.
 *
 * @param {Event} event - The click event.
 * @returns {void}
 */
function handlePageLinks(event) {
  event.preventDefault();
  if (event.target.host === window.location.host) {
    let url = new URL(event.target);
    let stateObj = buildStateObjFromUrl(url);
    buildPage(stateObj);
  }
}

/**
 * Builds a state object from the given URL.
 * Iterates through the pages object to find a matching slug in the URL's pathname
 * and assigns the corresponding page key to the state object. 
 * If the URL contains an 'id' query parameter, it assigns it to the state object.
 *
 * @param {URL} url - The URL object from which to build the state object.
 * @returns {Object} The state object built from the URL.
 */
function buildStateObjFromUrl(url) {
  let pageKey = '';
  for (let key in pages) if (pages[key].slug === url.pathname) pageKey = key;
  let stateObj = { pageKey: pageKey };
  if (url.searchParams.get('id')) stateObj.id = url.searchParams.get('id');
  return stateObj;
}

init();
