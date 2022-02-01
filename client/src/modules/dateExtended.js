export default class DateExt extends Date {
  months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  getDateString = () => `${this.getFullYear()}-${String(this.getMonth() + 1).padStart(2, "0")}-${String(this.getDate()).padStart(2, "0")}`;
  nameOfMonth = () => this.months[this.getMonth()];
  nameOfWeekday = () => this.weekdays[this.getDay()];
  firstDayOfMonth = () => new DateExt(this.getFullYear(), this.getMonth(), 1);
  lastDayOfMonth = () => new DateExt(this.getFullYear(), this.getMonth() + 1, 0);
  daysInMonth = () => new DateExt(this.getFullYear(), this.getMonth(), 0).getDate();

  weeksInMonth(fromMonday = false) {
    const first = this.firstDayOfMonth(this.date);
    const last = this.lastDayOfMonth(this.date);
    let dayOfWeek = first.getDay();

    if (fromMonday && dayOfWeek === 0) dayOfWeek = 7;

    let days = dayOfWeek + last.getDate();
    if (fromMonday) days -= 1;

    return Math.ceil(days / 7);
  }
}
