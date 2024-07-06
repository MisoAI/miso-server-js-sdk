import TaskControl from './base.js';
import CollectiveTaskControl from './collective.js';
import WaterMarkTaskControl from './watermark.js';
import ThrottledTaskControl from './throttle.js';

export function createTaskControl({
  highWaterMark,
  throttle,
} = {}) {
  const controls = [];
  if (highWaterMark) {
    controls.push(new WaterMarkTaskControl({
      highWaterMark,
    }));
  }
  if (throttle) {
    controls.push(new ThrottledTaskControl({
      interval: throttle,
    }));
  }
  return controls.length > 0 ? new CollectiveTaskControl(...controls) : new TaskControl();
}
