import * as request from "./serverRequests";
import DateExt from "./dateExtended";

export default class Calendar {
  constructor() {
    this.selectedDate = new DateExt();
    this.selectedRange = {
      start: new DateExt(),
      end: new DateExt(),
    };
    this.firstDayOfView = new DateExt();
    this.lastDayOfView = new DateExt();
  }

  async getHTML(date = this.selectedDate) {
    const year = date.getFullYear();
    const monthName = date.nameOfMonth();

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
    new DateExt().weekdays.forEach((name, index) => {
      const el = document.createElement("th");
      el.classList.add("calendar__weekdays__day");
      el.dataset.weekday = index;
      el.innerHTML = name.substring(0, 3);
      weekdaysEl.appendChild(el);
    });

    // populate dates
    const bodyEl = calendarEl.querySelector(".calendar__body");
    const weeksCount = date.weeksInMonth();
    const firstOfCurrentMonth = date.firstDayOfMonth();
    let nextInCalendar = new DateExt(firstOfCurrentMonth);
    nextInCalendar.setDate(nextInCalendar.getDate() - firstOfCurrentMonth.getDay());
    this.firstDayOfView.setDate(nextInCalendar.getDate);

    for (let week = 0; week < weeksCount; week++) {
      const weekEl = document.createElement("tr");
      weekEl.classList.add("calendar__week");

      for (let day = 0; day < 7; day++) {
        const dayEl = document.createElement("td");
        dayEl.classList.add("calendar__day");

        const dateString = nextInCalendar.getDateString();
        dayEl.dataset.date = dateString;
        dayEl.dataset.day = nextInCalendar.getDate();
        dayEl.addEventListener("click", this.onClickDate.bind(this));

        // mark if current month
        dayEl.dataset.date.startsWith(date.toJSON().slice(0, 7)) ? (dayEl.dataset.currentMonth = "") : "";
        nextInCalendar.toDateString() === date.toDateString() ? (dayEl.dataset.selected = "") : "";

        // add event container
        const events = document.createElement("div");
        events.classList.add("calendar__day__events");
        dayEl.appendChild(events);
        weekEl.appendChild(dayEl);

        // jump to next day
        nextInCalendar.setDate(nextInCalendar.getDate() + 1);
      }
      bodyEl.appendChild(weekEl);
    }

    // request orders of the current view
    this.lastDayOfView.setDate(nextInCalendar.getDate() - 1);

    // const orderList = await request.ordersWithinRange(firstDayOfView, lastDayOfView);

    // for (const order of orderList) {
    //   const thisDate = new DateExt(order.datetime_due);
    //   const date = thisDate.toJSON().slice(0, 10);

    //   // add event to calendar
    //   const selector = `.calendar__day[data-date="${date}"] .calendar__day__events`;
    //   const ordersEl = calendarEl.querySelector(selector);
    //   if (ordersEl) ordersEl.innerHTML += "\u{1F98A}";
    // }

    return calendarEl;
  }

  onClickDate(event) {
    const target = event.target.closest(".calendar__day");
    const date = new DateExt(target.dataset.date);
    this.selectRange(date, date);
  }

  async selectRange(startDate, endDate) {
    this.selectedRange = {
      start: startDate,
      end: endDate,
    };

    // mark range in calendar
    const calendar = document.querySelector(".calendar");
    if (calendar) {
      const days = document.getElementsByClassName("calendar__day");
      for (const tile of days) {
        delete tile.dataset.selected;
        const tileDate = new DateExt(tile.dataset.date);
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
      const { id, datetime_due, status, price, firstname, lastname } = order;
      let itemEl = document.createElement("li");
      itemEl.dataset.orderId = id;

      let dueDate = new DateExt(datetime_due);
      let dateString = dueDate.toLocaleDateString().replace(/\//g, ".");
      let timeString = `${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`;
      itemEl.innerHTML = `${timeString} ${firstname} ${lastname ? lastname : ""} ${price}CHF ${status}`;

      itemEl.addEventListener("click", (event) => selectOrder(event.target.dataset.orderId));
      listEl.appendChild(itemEl);
    }

    node.replaceChildren(listEl);
  }
}
