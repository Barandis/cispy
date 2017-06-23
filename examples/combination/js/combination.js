'use strict';

(function () {

var go = cispy.go
  , chan = cispy.chan
  , timeout = cispy.timeout
  , alts = cispy.alts
  , putRaw = cispy.putRaw
  ;

var map = xduce.map;

// Shorter alias for getElementById
function byId(id) {
  return document.getElementById(id);
}

// Sets the HTML of the element with the given ID
function setHtml(id, html) {
  byId(id).innerHTML = html;
}

function listen(el, type, ch) {
  ch = ch || chan();
  el.addEventListener(type, function (event) {
    putRaw(ch, event);
  });
  return ch;
}

// Returns a function that always returns x
function constantly(x) {
  return function () { return x; };
}

// unique values for each of the entries
var A = Object.create(null);
var B = Object.create(null);
var C = Object.create(null);

var MAX_TIME = 5000;
var COMBINATION = [A, B, A, C, A, B];

function setStatus(html) {
  if (Array.isArray(html)) {
    var array = html.slice();
    html = '';
    for (var i = 0, len = array.length; i < len; ++i) {
      var x = array[i];
      html += x === A ? ' A' : x === B ? ' B' : ' C';
    }
  }
  setHtml('status', html);
}

var chA = listen(byId('button-a'), 'click', chan(1, map(constantly(A))));
var chB = listen(byId('button-b'), 'click', chan(1, map(constantly(B))));
var chC = listen(byId('button-c'), 'click', chan(1, map(constantly(C))));

go(function* () {
  var clicks = [];
  var chZ = chan();

  while (true) {
    var alt = yield alts([chA, chB, chC, chZ]);
    clicks.push(alt.value);

    // If the channel taken from was the timeout channel, that means it closed and our time has expired
    if (alt.channel === chZ) {
      setStatus("You're not fast enough, try again!");
      clicks = [];
      chZ = chan();
    }
    // If the value is the correct next value, check to see if we have the correct number.
    // If so, we've solved the combination.
    // If not, we just continue, starting the clock if this was the first click.
    else if (alt.value === COMBINATION[clicks.length - 1]) {
      if (clicks.length === COMBINATION.length) {
        setStatus("Combination unlocked!");
        clicks = [];
        chZ = chan();
      }
      else {
        setStatus(clicks);
        if (!chZ.timeout) {
          chZ = timeout(MAX_TIME);
        }
      }
    }
    // The value must not equal the correct next value.
    // We've failed to solve the combination.
    // Reset the clicked values and continue, starting the clock if this was the first tick.
    else {
      setStatus("Wrong combination, try again");
      if (!chZ.timeout) {
        chZ = timeout(MAX_TIME);
      }
      clicks = [];
    }
  }
});

})();
