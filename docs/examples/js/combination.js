/* global cispy, xduce */
/* eslint no-constant-condition: ["error", { "checkLoops": false }] */

const { go, chan, timeout, alts, putAsync } = cispy;
const { map } = xduce.transducers;

// Shorter alias for getElementById
function byId(id) {
  return document.getElementById(id);
}

// Sets the HTML of the element with the given ID
function setHtml(id, html) {
  byId(id).innerHTML = html;
}

function listen(el, type, ch = chan()) {
  el.addEventListener(type, event => putAsync(ch, event));
  return ch;
}

// Returns a function that always returns x
function constantly(x) {
  return () => x;
}

// unique values for each of the entries
const A = Symbol();
const B = Symbol();
const C = Symbol();

const MAX_TIME = 5000;
const COMBINATION = [A, B, A, C, A, B];

function setStatus(html) {
  let text = html;
  if (Array.isArray(text)) {
    const array = text.slice();
    text = '';
    for (const x of array) {
      text += x === A ? ' A' : x === B ? ' B' : ' C';
    }
  }
  setHtml('status', text);
}

const chA = listen(byId('button-a'), 'click', chan(1, map(constantly(A))));
const chB = listen(byId('button-b'), 'click', chan(1, map(constantly(B))));
const chC = listen(byId('button-c'), 'click', chan(1, map(constantly(C))));

go(async () => {
  let clicks = [];
  let chZ = chan();

  while (true) {
    const alt = await alts([chA, chB, chC, chZ]);
    clicks.push(alt.value);

    if (alt.channel === chZ) {
      // If the channel taken from was the timeout channel, that means it closed and our time has expired
      setStatus("You're not fast enough, try again!");
      clicks = [];
      chZ = chan();
    } else if (alt.value === COMBINATION[clicks.length - 1]) {
      // If the value is the correct next value, check to see if we have the correct number.
      // If so, we've solved the combination.
      // If not, we just continue, starting the clock if this was the first click.
      if (clicks.length === COMBINATION.length) {
        setStatus('Combination unlocked!');
        clicks = [];
        chZ = chan();
      } else {
        setStatus(clicks);
        if (!chZ.timeout) {
          chZ = timeout(MAX_TIME);
        }
      }
    } else {
      // The value must not equal the correct next value.
      // We've failed to solve the combination.
      // Reset the clicked values and continue, starting the clock if this was the first tick.
      setStatus('Wrong combination, try again');
      if (!chZ.timeout) {
        chZ = timeout(MAX_TIME);
      }
      clicks = [];
    }
  }
});
