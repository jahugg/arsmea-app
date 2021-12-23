export async function render() {
  const module = document.createElement("div");
  module.classList.add("module");
  module.id = "order";
  module.innerHTML = `
    <div id="order-list-section">
        <button id="add-order-btn" type="button">Add Order</button>
        <form action="${process.env.SERVER}/api/searchOrders" method="POST" id="search-order">
            <label for="search-order__input">Search</label>
            <input type="text" pattern="[^0-9]*" name="input" id="search-order__input" placeholder="Search"/>
        </form>
        <div id="order-list-wrapper">
        </div>
    </div>
    <div id="order-detail-section">
    </div>`;

  const addButton = module.querySelector("#add-order-btn");
  addButton.addEventListener("click", onAddOrder);

  const searchInput = module.querySelector("#search-order__input");
  searchInput.addEventListener("input", onSearchOrder);

  const orderListWrapper = module.querySelector("#order-list-wrapper");
  const orderList = await getOrderListEl();
  orderListWrapper.appendChild(orderList);

  if (orderList.firstChild) {
    const firstOrder = orderList.firstChild;
    firstOrder.dataset.selected = "";

    const orderDetailsWrapper = module.querySelector("#order-detail-section");
    const orderDetails = await getOrderDetailsEl(firstOrder.dataset.orderId);
    orderDetailsWrapper.appendChild(orderDetails);
  }

  return module;
}

async function onSearchOrder(event) {}

async function onAddOrder(event) {
  const response = await requestNewOrder();
  const id = response.id;

  const orderListWrapper = document.getElementById("order-list-wrapper");
  const orderList = await getOrderListEl();
  orderListWrapper.replaceChildren(orderList);

  const item = document.querySelector(`#contact-list li[data-contact-id="${id}"`);
  item.dataset.selected = "";

  //   const contactDetailsWrapper = document.getElementById("contact-detail-section");
  //   const form = await getContactFormEl(id);
  //   contactDetailsWrapper.replaceChildren(form);
  //   form.querySelector("#edit-contact__firstname").select();
}

async function onSelectOrder(event) {
  const orderDetailsWrapper = document.getElementById("order-detail-section");
  const id = event.target.dataset.orderId;
  const orderDetails = await getOrderDetailsEl(id);
  orderDetailsWrapper.replaceChildren(orderDetails);

  const orderList = document.querySelectorAll("#order-list li");
  for (let item of orderList) delete item.dataset.selected;
  event.target.dataset.selected = "";
}

async function onEditOrder(event) {
  const id = event.target.dataset.orderId;
  const contactDetailsWrapper = document.getElementById("order-detail-section");
  const form = await getOrderFormEl(id);
  contactDetailsWrapper.replaceChildren(form);
}

async function onUpdateOrder(event) {
  event.preventDefault();
  console.log("on update order...");
}

async function onDeleteOrder(event) {
  console.log("on delete order...");
}

async function getOrderListEl(searchString) {
  let orders = await requestOrders(searchString);
  const list = document.createElement("ul");
  list.id = "order-list";

  for (let item of orders) {
    const { id, datetime_delivery, status, firstname, lastname } = item;
    let el = document.createElement("li");
    el.dataset.orderId = id;
    el.innerHTML = `${datetime_delivery} ${firstname} ${lastname} ${status}`;
    el.addEventListener("click", onSelectOrder);
    list.appendChild(el);
  }

  return list;
}

async function getOrderDetailsEl(id) {
  let { datetime_placed, datetime_delivery, price, description, status, firstname, lastname } = await requestOrderDetails(id);
  const wrapper = document.createElement("div");
  wrapper.id = "order-details";
  wrapper.innerHTML = `${firstname} ${lastname}<br>
  Placed: ${datetime_placed}<br>
  Delivery: ${datetime_delivery}<br>
  ${price ? price + " CHF<br>" : ""}
  ${description ? description + "<br>" : ""}
  Status: ${status}`;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "edit-btn";
  editBtn.innerHTML = "Edit";
  editBtn.dataset.orderId = id;
  editBtn.addEventListener("click", onEditOrder);

  wrapper.appendChild(editBtn);

  return wrapper;
}

async function getOrderFormEl(id) {
  const data = await requestOrderDetails(id);
  const { datetime_delivery, datetime_placed, status, price, description } = data;

  const wrapper = document.createElement("div");
  wrapper.id = "order-details";
  const form = document.createElement("form");
  form.action = `${process.env.SERVER}/api/updateOrder`;
  form.method = "POST";
  form.id = "edit-order";
  form.addEventListener("submit", onUpdateOrder);
  form.innerHTML = `<input type="hidden" id="edit-order__id" name="id" value="${id}">
    <div>
      <label for="edit-order__delivery-date">Delivery Date</label>
      <input type="date" name="delivery-date" id="edit-order__delivery-date" value="${datetime_delivery ? datetime_delivery : ""}" />
    </div>
    <div>
      <label for="edit-order__placed-date">Placed Date</label>
      <input type="date" name="placed-date" id="edit-order__placed-date" value="${datetime_placed ? datetime_placed : ""}" />
    </div>
    <div>
        <label for="edit-order__status">Status</label>
        <select id="edit-order__status">
            <option value="open">Open</option>
            <option value="closed">Ready for Pickup</option>
            <option value="delivered">Delivered</option>
        </select>
    </div>
    <div>
        <label for="edit-order__price">Price</label>
        <input id="edit-order__price" type="number" min="0.00" max="10000.00" step="0.1" value="${price}"/>CHF
    </div>
    <div>
      <label for="edit-order__description">Description</label>
      <textarea name="description" id="edit-order__description" placeholder="Notes">${description ? description : ""}</textarea>
    </div>
    <input type="submit" value="Done"/>`;

  // select current status
  const statusOptions = form.querySelectorAll("#edit-order__status option");
  for (let option of statusOptions) {
    if (option.value === status) option.setAttribute("selected", "true");
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = "Delete Order";
  deleteBtn.id = "delete-order-btn";
  deleteBtn.dataset.orderId = id;
  deleteBtn.addEventListener("click", onDeleteOrder);

  wrapper.appendChild(form);
  wrapper.appendChild(deleteBtn);

  return wrapper;
}

async function requestNewOrder() {
  let defaultData = { contact_id: "1", datetime_placed: "some date", datetime_delivery: "some date", price: 30.2, status: "open" };
  let searchParams = new URLSearchParams(defaultData);
  const response = await fetch(`${process.env.SERVER}/api/order`, {
    method: "POST",
    body: searchParams,
  });
  return await response.json();
}

async function requestOrders(searchString) {
  let response;
  if (searchString) response = await fetch(`${process.env.SERVER}/api/searchOrders/${searchString}`);
  else response = await fetch(`${process.env.SERVER}/api/orderList`);
  return await response.json();
}

async function requestOrderDetails(id) {
  const response = await fetch(`${process.env.SERVER}/api/order/${id}`);
  return await response.json();
}
