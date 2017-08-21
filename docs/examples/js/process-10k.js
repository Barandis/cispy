/* global cispy */
/* eslint-disable no-constant-condition */
const { go, chan, timeout, alts, sleep, put } = cispy;

const width = 100;
const height = 100;

let group = 0;

function byId(id) {
  return document.getElementById(id);
}

function setHtml(el, html) {
  el.innerHTML = html;
}

function setClass(el, cls) {
  el.className = cls;
}

function randInt(upper) {
  return parseInt(Math.random() * upper);
}

function createUi(el) {
  const html = [];
  for (let y = 0; y < height; ++y) {
    html.push('<tr>');
    for (let x = 0; x < width; ++x) {
      html.push(`<td id="cell-${x + y * width}">0</td>`);
    }
    html.push('</tr>');
  }
  setHtml(el, html.join(''));
}

function render(queue) {
  for (const [index, value] of queue) {
    const cell = byId(`cell-${index}`);
    const cls = `group-${group}`;
    setHtml(cell, value);
    setClass(cell, cls);
    group = (group + 1) % 6;
  }
}

function renderLoop(rate) {
  const input = chan(1000);
  let refresh = timeout(rate);
  let queue = [];

  go(function*() {
    while (true) {
      const { value, channel } = yield alts([input, refresh]);
      if (channel === refresh) {
        render(queue);
        yield sleep();
        queue = [];
        refresh = timeout(rate);
      } else {
        queue.push(value);
      }
    }
  });

  return input;
}

createUi(byId('process-10k'));

const ch = renderLoop(40);
for (let i = 0, limit = width * height; i < limit; ++i) {
  go(function*() {
    while (true) {
      yield sleep(1000 + randInt(9000));
      yield put(ch, [randInt(10000), randInt(10)]);
    }
  });
}
