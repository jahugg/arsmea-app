import * as request from "./serverRequests";

export class Calendar {
  constructor() {
    this.today = new DateExt();
    this.selectedRange = {};
    this.activeMonthDate;
    this.datesOfView;
    this.setActiveMonth(this.today);
  }

  getDatesOfView(date = new DateExt()) {
    let datesOfView = [];
    const firstDayOfMonth = date.firstDayOfMonth();
    let nextDayOfView = new DateExt(firstDayOfMonth);
    nextDayOfView.setDate(nextDayOfView.getDate() - firstDayOfMonth.getDayStartMonday());

    const daysInView = date.weeksInMonth(true) * 7;
    for (let i = 0; i < daysInView; i++) {
      datesOfView.push(new DateExt(nextDayOfView));
      nextDayOfView.setDate(nextDayOfView.getDate() + 1);
    }

    return datesOfView;
  }

  setActiveMonth(date) {
    this.activeMonthDate = date.firstDayOfMonth();
    this.datesOfView = this.getDatesOfView(this.activeMonthDate);
  }

  populateCalendar() {
    const year = document.querySelector(".calendar__year");
    year.innerHTML = this.activeMonthDate.getFullYear();

    const month = document.querySelector(".calendar__month");
    month.innerHTML = this.activeMonthDate.nameOfMonth();

    const previousBtn = document.querySelector(".calendar__month__previous");
    previousBtn.dataset.date = this.activeMonthDate.getDateString();

    const nextBtn = document.querySelector(".calendar__month__next");
    nextBtn.dataset.date = this.activeMonthDate.getDateString();

    const bodyEl = document.querySelector(".calendar__body");
    bodyEl.replaceChildren();

    // populate calendar days
    let weekEl;
    this.datesOfView.forEach((date, index) => {
      // start new week
      if (index == 0 || !(index % 7)) {
        weekEl = document.createElement("tr");
        weekEl.classList.add("calendar__week");
        bodyEl.appendChild(weekEl);
      }

      const dayEl = document.createElement("td");
      dayEl.classList.add("calendar__day");

      dayEl.dataset.date = date.getDateString();
      dayEl.dataset.day = date.getDate();
      dayEl.addEventListener("click", this.onClickDate.bind(this));

      // mark today
      date.getDateString() === this.today.getDateString() ? (dayEl.dataset.today = "") : "";

      // mark current month
      dayEl.dataset.date.startsWith(this.activeMonthDate.getDateString().slice(0, 7)) ? (dayEl.dataset.currentMonth = "") : "";

      // add event container
      const events = document.createElement("div");
      events.classList.add("calendar__day__events");
      dayEl.appendChild(events);

      weekEl.appendChild(dayEl);
    });

    //dispatching custom event
    bodyEl.dispatchEvent(
      new CustomEvent("monthloaded", {
        bubbles: true,
        detail: {
          date: this.activeMonthDate,
        },
      })
    );
  }

  getHTML(date = this.activeMonthDate) {
    const calendarEl = document.createElement("table");
    calendarEl.classList.add("calendar");
    calendarEl.innerHTML = `
        <thead class="calendar__head">
            <tr><th colspan="7"> 
              <div class="calendar__controls">
                <button type="button" data-date="${date.getDateString()}" class="calendar__month__previous">&lsaquo;</button>
                <div><span class="calendar__month">${date.nameOfMonth()}</span> <span class="calendar__year"> ${date.getFullYear()}</span></div>
                <button type="button" data-date="${date.getDateString()}" class="calendar__month__next">&rsaquo;</button>
              </div>
              </th></tr>
            <tr class="calendar__weekdays"></tr>
        </thead>
        <tbody class="calendar__body"></tbod>
    `;

    const prevBtn = calendarEl.querySelector(".calendar__month__previous");
    prevBtn.addEventListener("click", this.onClickPreviousMonth.bind(this));

    const nextBtn = calendarEl.querySelector(".calendar__month__next");
    nextBtn.addEventListener("click", this.onClickNextMonth.bind(this));

    // populate weekdays header
    const weekdaysEl = calendarEl.querySelector(".calendar__weekdays");
    new DateExt().weekdays.forEach((name, index) => {
      const el = document.createElement("th");
      el.classList.add("calendar__weekdays__day");
      el.dataset.weekday = index;
      el.innerHTML = name.substring(0, 3);
      weekdaysEl.appendChild(el);
    });

    return calendarEl;
  }

  onClickPreviousMonth(event) {
    const currentDate = new DateExt(event.target.dataset.date);
    this.setActiveMonth(currentDate.getPreviousMonth());
    this.populateCalendar();
  }

  onClickNextMonth(event) {
    const currentDate = new DateExt(event.target.dataset.date);
    this.setActiveMonth(currentDate.getNextMonth());
    this.populateCalendar();
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

export class DateExt extends Date {
  months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  getDateString = () => `${this.getFullYear()}-${String(this.getMonth() + 1).padStart(2, "0")}-${String(this.getDate()).padStart(2, "0")}`;
  nameOfMonth = () => this.months[this.getMonth()];
  nameOfWeekday = () => this.weekdays[this.getDay()];
  firstDayOfMonth = () => new DateExt(this.getFullYear(), this.getMonth(), 1);
  lastDayOfMonth = () => new DateExt(this.getFullYear(), this.getMonth() + 1, 0);
  daysInMonth = () => new DateExt(this.getFullYear(), this.getMonth(), 0).getDate();
  getDayStartMonday = () => (this.getDay() === 0 ? 6 : this.getDay() - 1);
  getNextMonth = () => new DateExt(this.getFullYear(), this.getMonth() + 1, 1);
  getPreviousMonth = () => new DateExt(this.getFullYear(), this.getMonth() - 1, 1);

  weeksInMonth(fromMonday = false) {
    //WRONG RESULTS WHEN SET TO START MONDAY
    const first = this.firstDayOfMonth(this.date);
    const last = this.lastDayOfMonth(this.date);
    let dayOfWeek;
    fromMonday ? (dayOfWeek = first.getDay()) : (dayOfWeek = first.getDayStartMonday());
    let days = dayOfWeek + last.getDate();

    return Math.ceil(days / 7);
  }
}
