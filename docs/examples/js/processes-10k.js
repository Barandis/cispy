/* global cispy */
/* eslint-disable no-constant-condition */
const { go, sleep, chan, Channel } = cispy;

const width = 100;
const height = 100;

const rate = 40; // number of milliseconds between display cycles
const colors = 6; // number of non-black colors displayed

let group = 0; // The render group, used to choose a color for queued renders

// Run on initialization, creates 100 table rows of 100 table cells
// each, each cell filled with a black 0
function createUi(el) {
  const html = [];
  for (let y = 0; y < height; ++y) {
    html.push("<tr>");
    for (let x = 0; x < width; ++x) {
      html.push(`<td id="cell-${x + y * width}">0</td>`);
    }
    html.push("</tr>");
  }
  el.innerHTML = html.join("");
}

// Actually renders changes to the table cells. The queue that
// it accepts is full of two-element arrays containing the cell index
// and the new digit.
function render(queue) {
  for (const [index, value] of queue) {
    const cell = document.getElementById(`cell-${index}`);
    const cls = `group-${group}`;
    cell.innerHTML = value;
    cell.className = cls;
    group = (group + 1) % colors;
  }
}

function renderLoop(rate) {
  // 1000-element buffered channel that will accept 4096 queued operations
  const main = chan(1000, { maxQueued: 4096 });
  let refresh = chan({ timeout: rate });
  let queue = [];

  // The single process that controls the rendering
  go(async () => {
    // The main rendering loop. Takes two-element arrays off the main
    // channel and queues them, pausing to call render() every time
    // the refresh channel times out.
    while (true) {
      const { value, channel } = await Channel.select([main, refresh]);
      if (channel === refresh) {
        render(queue);
        await sleep();
        queue = [];
        refresh = chan({ timeout: rate });
      } else {
        queue.push(value);
      }
    }
  });

  return main;
}

createUi(document.getElementById("process-10k"));

const ch = renderLoop(rate);
for (let i = 0, limit = width * height; i < limit; ++i) {
  // One process per table cell
  go(async () => {
    while (true) {
      // Sleep from 1-10 seconds
      await sleep(1000 + Math.floor(Math.random() * 9000));
      // This is what puts the two-element arrays onto the main
      // channel, which eventually get queued and sent to
      // render().
      await ch.put([i, Math.floor(Math.random() * 10)]);
    }
  });
}
