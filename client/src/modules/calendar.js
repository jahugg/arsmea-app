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

  getHTML(date = this.selectedDate) {
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

    for (let week = 0; week < weeksCount; week++) {
      const weekEl = document.createElement("tr");
      weekEl.classList.add("calendar__week");

      for (let day = 0; day < 7; day++) {
        const dayEl = document.createElement("td");
        dayEl.classList.add("calendar__day");
        dayEl.dataset.date = nextInCalendar.getDate();
        dayEl.dataset.month = nextInCalendar.getMonth();
        dayEl.dataset.year = nextInCalendar.getFullYear();
        dayEl.addEventListener("click", this.onSelectDate.bind(this));
        dayEl.dataset.month == date.getMonth() ? (dayEl.dataset.currentMonth = "") : "";
        nextInCalendar.toDateString() === date.toDateString() ? (dayEl.dataset.selected = "") : "";
        weekEl.appendChild(dayEl);

        // select next day
        nextInCalendar.setDate(nextInCalendar.getDate() + 1);
      }
      bodyEl.appendChild(weekEl);
    }

    return calendarEl;
  }

  onSelectDate(event) {
    const year = Number(event.target.dataset.year);
    const month = Number(event.target.dataset.month);
    const day = Number(event.target.dataset.date);
    const date = new Date(year, month, day);

    this.selectDate(date);
  }

  async selectDate(date) {
    this.selectedDate = date;
    this.selectedRange.start = date;
    this.selectedRange.end = date;

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
        tileDate.toDateString() === date.toDateString() ? (tile.dataset.selected = "") : "";
      }
    }
    // get orders within range
    const orderList = await request.ordersWithinRange(this.selectedRange);
    this.renderOrders(orderList);
  }

  renderOrders(orderList) {
    for (const order of orderList) {
      let dueDate = new Date(order.datetime_due);
      console.log(`${dueDate.getHours()}:${dueDate.getMinutes()}`);
    }
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
