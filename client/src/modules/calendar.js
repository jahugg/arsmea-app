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

  updateView() {
    // setting first and last day here is cleaner
  }

  async getHTML(date = this.selectedDate) {
    const calendarEl = document.createElement("table");
    calendarEl.classList.add("calendar");
    calendarEl.innerHTML = `
        <thead class="calendar__head">
            <tr class="calendar__year"><th colspan="7">${date.getFullYear()}</th></tr>
            <tr class="calendar__month"><th colspan="7">${date.nameOfMonth()}</th></tr>
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
    this.firstDayOfView.setTime(nextInCalendar.getTime());

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

    // determine last day of view
    this.lastDayOfView.setTime(nextInCalendar.getTime());
    this.lastDayOfView.setDate(this.lastDayOfView.getDate() - 1);

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
  }
}
