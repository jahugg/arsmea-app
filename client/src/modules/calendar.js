import * as request from "./serverRequests";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default class Calendar {
  constructor() {
    this.selectedDate = new Date();
    this.selectedRange = {
      start: new Date(),
      end: new Date(),
    };
  }

  async getHTML(date = this.selectedDate) {
    const year = date.getFullYear();
    const monthName = this.nameOfMonth(date);

    const calendarEl = document.createElement("table");
    calendarEl.classList.add("calendar");
    calendarEl.innerHTML = `
        <thead class="calendar__head">
            <tr class="calendar__year"><th colspan="7">${year}</th></tr>
            <tr class="calendar__month"><th colspan="7">${monthName}</th></tr>
            <tr class="calendar__weekdays"></tr>
        </thead>
        <tbody class="calendar__body"></tbod>
    `;

    // populate weekdays header
    const weekdaysEl = calendarEl.querySelector(".calendar__weekdays");
    weekdays.forEach((name, index) => {
      const el = document.createElement("th");
      el.classList.add("calendar__weekdays__day");
      el.dataset.weekday = index;
      el.innerHTML = name.substring(0, 3);
      weekdaysEl.appendChild(el);
    });

    // populate dates
    const bodyEl = calendarEl.querySelector(".calendar__body");
    const weeksCount = this.weeksInMonth(date);
    const firstOfCurrentMonth = this.firstDayOfMonth(date);
    let nextInCalendar = new Date(firstOfCurrentMonth);
    nextInCalendar.setDate(nextInCalendar.getDate() - firstOfCurrentMonth.getDay());
    const firstDayOfView = new Date(nextInCalendar);

    for (let week = 0; week < weeksCount; week++) {
      const weekEl = document.createElement("tr");
      weekEl.classList.add("calendar__week");

      for (let day = 0; day < 7; day++) {
        const dayEl = document.createElement("td");
        dayEl.classList.add("calendar__day");
        dayEl.dataset.date = nextInCalendar.getDate();
        dayEl.dataset.month = nextInCalendar.getMonth();
        dayEl.dataset.year = nextInCalendar.getFullYear();
        dayEl.addEventListener("click", this.onClickDate.bind(this));
        dayEl.dataset.month == date.getMonth() ? (dayEl.dataset.currentMonth = "") : "";
        nextInCalendar.toDateString() === date.toDateString() ? (dayEl.dataset.selected = "") : "";

        // add order container
        const orders = document.createElement("div");
        orders.classList.add("calender__day__orders");
        dayEl.appendChild(orders);

        weekEl.appendChild(dayEl);

        // select next day
        nextInCalendar.setDate(nextInCalendar.getDate() + 1);
      }
      bodyEl.appendChild(weekEl);
    }

    // request orders of the current view
    const lastDayOfView = new Date(nextInCalendar);
    lastDayOfView.setDate(nextInCalendar.getDate() - 1);
    const orderList = await request.ordersWithinRange(firstDayOfView, lastDayOfView);

    for (const order of orderList) {
      const thisDate = new Date(order.datetime_due);
      const date = thisDate.getDate();
      const month = thisDate.getMonth();
      const year = thisDate.getFullYear();

      // add indicator to calendar
      const selector = `.calendar__day[data-date="${date}"][data-month="${month}"][data-year="${year}"] .calender__day__orders`;
      const ordersEl = calendarEl.querySelector(selector);
      if (ordersEl) ordersEl.innerHTML += "\u{1F98A}";
    }

    return calendarEl;
  }

  onClickDate(event) {

    const target = event.target.closest(".calendar__day");

    const year = Number(target.dataset.year);
    const month = Number(target.dataset.month);
    const day = Number(target.dataset.date);
    const date = new Date(year, month, day);

    this.selectRange(date, date);
  }

  async selectRange(startDate, endDate) {
    // this.selectedRange.start = startDate;
    // this.selectedRange.end = endDate;

    // mark range in calendar
    const calendar = document.querySelector(".calendar");
    if (calendar) {
      const days = document.getElementsByClassName("calendar__day");
      for (const tile of days) {
        delete tile.dataset.selected;

        const year = Number(tile.dataset.year);
        const month = Number(tile.dataset.month);
        const day = Number(tile.dataset.date);
        const tileDate = new Date(year, month, day);
        tileDate.toDateString() === startDate.toDateString() ? (tile.dataset.selected = "") : "";
      }
    }
    // get orders within range
    const orderList = await request.ordersWithinRange(startDate, endDate);

    const nodeEl = document.getElementById("order-list-wrapper");
    this.renderOrders(orderList, nodeEl);
  }

  renderOrders(orderList, node) {

    const listEl = document.createElement("ul");
    listEl.id = "order-list";

    for (const order of orderList) {
      const { id, datetime_due, status, firstname, lastname } = order;
      let itemEl = document.createElement("li");
      itemEl.dataset.orderId = id;

      let dueDate = new Date(datetime_due);
      let time = `${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`;
      itemEl.innerHTML = `${datetime_due} ${firstname} ${lastname ? lastname : ""} ${status}`;

      itemEl.addEventListener("click", (event) => selectOrder(event.target.dataset.orderId));
      listEl.appendChild(itemEl);
    }
        
    node.replaceChildren(listEl);
  }

  // calendar functionalities
  nameOfMonth = (date) => months[date.getMonth()];
  nameOfWeekday = (date) => weekdays[date.getDay()];
  firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  lastDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 0).getDate();

  weeksInMonth(date, fromMonday = false) {
    const first = this.firstDayOfMonth(date);
    const last = this.lastDayOfMonth(date);
    let dayOfWeek = first.getDay();

    if (fromMonday && dayOfWeek === 0) dayOfWeek = 7;

    let days = dayOfWeek + last.getDate();
    if (fromMonday) days -= 1;

    return Math.ceil(days / 7);
  }
}
