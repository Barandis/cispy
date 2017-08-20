/* global cispy, xduce */
/* eslint no-constant-condition: ["error", { "checkLoops": false }] */

const { chan, go, put, take, alts, sleep, putAsync, util } = cispy;
const { debounce, throttle } = util;
const { map } = xduce;

/*
 * Multiple processes running simultaneously, sharing a single channel. Three of the processes sleep for varying
 * periods of time and then put a value onto the channel before repeating. the fourth process blocks while it waits
 * for values to be put in the channel, and then prints out which process put that value.
 */
const ch = chan();

go(function*() {
  while (true) {
    yield sleep(250);
    yield put(ch, 1);
  }
});
go(function*() {
  while (true) {
    yield sleep(1000);
    yield put(ch, 2);
  }
});
go(function*() {
  while (true) {
    yield sleep(1500);
    yield put(ch, 3);
  }
});

go(function*() {
  const processDiv = document.querySelector('#processes');
  const lines = [];

  while (true) {
    const index = yield take(ch);
    lines.unshift(`<div class="proc-${index}">Process ${index}</div>`);
    if (lines.length > 10) {
      lines.pop();
    }
    processDiv.innerHTML = lines.join('');
  }
});

/*
 * Multiple channels used as event streams. These are tied to the mousemove and click events over the bottom div.
 * A separate process watches both channels and, when either of them indicate a new event, update the text in the div
 * to show where the mouse move or click happened.
 */

function listen(el, type, ch = chan()) {
  el.addEventListener(type, event => putAsync(ch, event));
  return ch;
}

go(function*() {
  const el = document.querySelector('#events');
  const mouseCh = listen(el, 'mousemove');
  const clickCh = listen(el, 'click');
  let mousePos = [0, 0];
  let clickPos = [0, 0];

  while (true) {
    const v = yield alts([mouseCh, clickCh]);
    const event = v.value;
    if (v.channel === mouseCh) {
      mousePos = [event.layerX || event.clientX, event.layerY || event.clientY];
    } else {
      clickPos = [event.layerX || event.clientX, event.layerY || event.clientY];
    }
    el.innerHTML = `${mousePos[0]}, ${mousePos[1]} : ${clickPos[0]}, ${clickPos[1]}`;
  }
});

/*
 * Same as above, except this one uses a transducer to map the event objects to their translated coordinates so that
 * the presented coordinates are relative to the page, rather than to the element. Note the map transducer that not
 * only performs the translation but also converts the event object into its coordinates, simplifying the assignment to
 * position variables in the event loop.
 *
 * This is basically functional reactive programming (FRP): creating a stream, transforming that stream to produce more
 * useful values, and observing the stream for new values to consume. In this case the channels act as streams and the
 * `alts` call acts as an observer.
 */

function coordinates(el) {
  const top = el.offsetTop;
  const left = el.offsetLeft;
  return event => {
    const x = (event.layerX || event.clientX) + left;
    const y = (event.layerY || event.clientY) + top;
    return { x, y };
  };
}

go(function*() {
  const el = document.querySelector('#transducers');
  const mouseCh = listen(el, 'mousemove', chan(1, map(coordinates(el))));
  const clickCh = listen(el, 'click', chan(1, map(coordinates(el))));
  let mousePos = { x: 0, y: 0 };
  let clickPos = { x: 0, y: 0 };

  while (true) {
    const v = yield alts([mouseCh, clickCh]);
    if (v.channel === mouseCh) {
      mousePos = v.value;
    } else {
      clickPos = v.value;
    }
    el.innerHTML = `${mousePos.x}, ${mousePos.y} : ${clickPos.x}, ${clickPos.y}`;
  }
});

/*
 * Same as above, except that the mousemove channel is debounced or throttled with a 500ms delay interval.
 */

go(function*() {
  const el = document.querySelector('#debounce');
  const mouseCh = debounce(listen(el, 'mousemove', chan(1, map(coordinates(el)))), 500);
  const clickCh = listen(el, 'click', chan(1, map(coordinates(el))));
  let mousePos = { x: 0, y: 0 };
  let clickPos = { x: 0, y: 0 };

  while (true) {
    const v = yield alts([mouseCh, clickCh]);
    if (v.channel === mouseCh) {
      mousePos = v.value;
    } else {
      clickPos = v.value;
    }
    el.innerHTML = `${mousePos.x}, ${mousePos.y} : ${clickPos.x}, ${clickPos.y}`;
  }
});

go(function*() {
  const el = document.querySelector('#throttle');
  const mouseCh = throttle(listen(el, 'mousemove', chan(1, map(coordinates(el)))), 500);
  const clickCh = listen(el, 'click', chan(1, map(coordinates(el))));
  let mousePos = { x: 0, y: 0 };
  let clickPos = { x: 0, y: 0 };

  while (true) {
    const v = yield alts([mouseCh, clickCh]);
    if (v.channel === mouseCh) {
      mousePos = v.value;
    } else {
      clickPos = v.value;
    }
    el.innerHTML = `${mousePos.x}, ${mousePos.y} : ${clickPos.x}, ${clickPos.y}`;
  }
});
