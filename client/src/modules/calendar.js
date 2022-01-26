const today = new Date();
let selectedDate;
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default class Calendar {
  constructor() {}

  getHTML(date = today) {
    const year = date.getFullYear();
    const month = this.nameOfMonth(date);

    const calendarEl = document.createElement("table");
    calendarEl.classList.add("calendar");
    calendarEl.innerHTML = `
        <thead class="calendar__head>
            <tr class="calendar__year"><th colspan="7">${year}</th></tr>
            <tr class="calendar__month"><th colspan="7">${month}</th></tr>
            <tr class="calendar__weekdays">
            </tr>
        </thead>
        <tbody class="calendar__body">
            <tr class="calendar__week">
                <td class="calendar__day" data-day="1">1</td>
                <td class="calendar__day" data-day="2">2</td>
                <td class="calendar__day" data-day="3">3</td>
                <td class="calendar__day" data-day="4">4</td>
                <td class="calendar__day" data-day="5">5</td>
                <td class="calendar__day" data-day="6">6</td>
                <td class="calendar__day" data-day="7">7</td>
            </tr>
        </tbod>
    `;

    // populate weekdays
    const weekdaysEl = calendarEl.querySelector(".calendar__weekdays");
    weekdays.forEach((name, index) => {
      const el = document.createElement("th");
      el.classList.add("calendar__weekdays__day");
      el.dataset.weekday = index;
      el.innerHTML = name.substring(0, 3);
      weekdaysEl.appendChild(el);
    });

    // populate body
    const bodyEl = calendarEl.querySelector(".calendar__body");
    const daysCount = this.daysInMonth(date);
    const weeksCount = this.weeksInMonth(date);
    for (const i = 0; i < daysCount; i++) {
        

    }

    console.log(this.weeksInMonth(date));
    return calendarEl;
  }

  set selectedDate(date) {
    this.selectedDate = date;
  }

  nameOfMonth(date) {
    return months[date.getMonth()];
  }

  nameOfWeekday(date) {
    return weekdays[date.getDay()];
  }

  daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
  }

  weeksInMonth(date, fromMonday = true) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    let dayOfWeek = first.getDay();

    if (fromMonday && dayOfWeek === 0) dayOfWeek = 7;

    let days = dayOfWeek + last.getDate();
    if (fromMonday) days -= 1;

    return Math.ceil(days / 7);
  }
}
