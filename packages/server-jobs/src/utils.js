export function formatDuration(value) {
  if (isNaN(value)) {
    throw new Error(`Value must be a number: ${value}`);
  }
  value = Math.floor(value);
  const ms = value % 1000;
  value = Math.floor(value / 1000);
  const sec = value % 60;
  value = Math.floor(value / 60);
  const min = value % 60;
  value = Math.floor(value / 60);
  const hour = value;
  const lessThanOneMinute = hour === 0 && min === 0;
  let str = '';
  if (hour > 0) {
    str += `${hour}h`;
  }
  if (min > 0) {
    str += `${min}m`;
  }
  if (lessThanOneMinute || sec > 0 || ms > 0) {
    str += lessThanOneMinute ? `${sec}.${ms}s` : `${sec}s`;
  }
  return str;
}
