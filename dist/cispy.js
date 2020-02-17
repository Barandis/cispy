/*!
 * Copyright (c) 2017-2020 Thomas Otterson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
!(function(t, e) {
  "object" == typeof exports && "object" == typeof module
    ? (module.exports = e())
    : "function" == typeof define && define.amd
    ? define([], e)
    : "object" == typeof exports
    ? (exports.cispy = e())
    : (t.cispy = e());
})(window, function() {
  return (function(t) {
    var e = {};
    function n(r) {
      if (e[r]) return e[r].exports;
      var o = (e[r] = { i: r, l: !1, exports: {} });
      return t[r].call(o.exports, o, o.exports, n), (o.l = !0), o.exports;
    }
    return (
      (n.m = t),
      (n.c = e),
      (n.d = function(t, e, r) {
        n.o(t, e) || Object.defineProperty(t, e, { enumerable: !0, get: r });
      }),
      (n.r = function(t) {
        "undefined" != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }),
          Object.defineProperty(t, "__esModule", { value: !0 });
      }),
      (n.t = function(t, e) {
        if ((1 & e && (t = n(t)), 8 & e)) return t;
        if (4 & e && "object" == typeof t && t && t.__esModule) return t;
        var r = Object.create(null);
        if (
          (n.r(r),
          Object.defineProperty(r, "default", { enumerable: !0, value: t }),
          2 & e && "string" != typeof t)
        )
          for (var o in t)
            n.d(
              r,
              o,
              function(e) {
                return t[e];
              }.bind(null, o),
            );
        return r;
      }),
      (n.n = function(t) {
        var e =
          t && t.__esModule
            ? function() {
                return t.default;
              }
            : function() {
                return t;
              };
        return n.d(e, "a", e), e;
      }),
      (n.o = function(t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }),
      (n.p = ""),
      n((n.s = 6))
    );
  })([
    function(t, e, n) {
      "use strict";
      n.d(e, "a", function() {
        return r;
      }),
        n.d(e, "d", function() {
          return o;
        }),
        n.d(e, "c", function() {
          return u;
        }),
        n.d(e, "b", function() {
          return c;
        }),
        n.d(e, "e", function() {
          return a;
        });
      const r = Symbol("EMPTY");
      function o() {
        return {
          store: [],
          pointer: 0,
          get count() {
            return this.store.length - this.pointer;
          },
          get empty() {
            return 0 === this.store.length;
          },
          enqueue(t) {
            this.store.push(t);
          },
          dequeue() {
            if (this.empty) return r;
            const t = this.store[this.pointer];
            return (
              2 * ++this.pointer >= this.store.length &&
                ((this.store = this.store.slice(this.pointer)),
                (this.pointer = 0)),
              t
            );
          },
          peek() {
            return this.empty ? r : this.store[this.pointer];
          },
          filter(t) {
            for (let e = 0, { count: n } = this; e < n; ++e) {
              const e = this.dequeue();
              t(e) && this.enqueue(e);
            }
          },
        };
      }
      function i(t) {
        const e = o();
        return {
          get queue() {
            return e;
          },
          get size() {
            return t;
          },
          get count() {
            return this.queue.count;
          },
          remove() {
            return this.queue.dequeue();
          },
        };
      }
      function u(t) {
        return Object.assign(
          Object.create(i(t), {
            full: {
              get() {
                return this.queue.count >= this.size;
              },
            },
          }),
          {
            add(...t) {
              for (const e of t) this.queue.enqueue(e);
            },
          },
        );
      }
      function c(t) {
        return Object.assign(Object.create(i(t), { full: { get: () => !1 } }), {
          add(...t) {
            for (const e of t)
              this.queue.count < this.size && this.queue.enqueue(e);
          },
        });
      }
      function a(t) {
        return Object.assign(Object.create(i(t), { full: { get: () => !1 } }), {
          add(...t) {
            for (const e of t)
              this.queue.count === this.size && this.queue.dequeue(),
                this.queue.enqueue(e);
          },
        });
      }
    },
    function(t, e, n) {
      "use strict";
      (function(t) {
        n.d(e, "b", function() {
          return i;
        }),
          n.d(e, "a", function() {
            return u;
          }),
          n.d(e, "c", function() {
            return c;
          }),
          n.d(e, "d", function() {
            return l;
          }),
          n.d(e, "e", function() {
            return m;
          });
        var r = n(0);
        const o = Object(r.d)(),
          i = Symbol("SET_IMMEDIATE"),
          u = Symbol("MESSAGE_CHANNEL"),
          c = Symbol("SET_TIMEOUT"),
          a = { batchSize: 1024, dispatchMethod: i };
        let s = p();
        function l(t) {
          for (const e in a)
            Object.prototype.hasOwnProperty.call(t, e) &&
              ((a[e] = t[e]), "dispatchMethod" === e && (s = p()));
        }
        let f = !1,
          d = !1;
        function p() {
          switch (
            (function() {
              switch (a.dispatchMethod) {
                case u:
                  return "undefined" != typeof MessageChannel ? u : c;
                case c:
                  return c;
                default:
                  return void 0 !== t
                    ? i
                    : "undefined" != typeof MessageChannel
                    ? u
                    : c;
              }
            })()
          ) {
            case i:
              return () => {
                (d && f) || ((d = !0), t(h));
              };
            case u: {
              const t = new MessageChannel();
              return (
                (t.port1.onmessage = () => h()),
                () => {
                  (d && f) || ((d = !0), t.port2.postMessage(0));
                }
              );
            }
            case c:
              return () => {
                (d && f) || ((d = !0), setTimeout(h, 0));
              };
          }
        }
        function h() {
          (f = !0), (d = !1);
          let t = 0;
          for (;;) {
            const e = o.dequeue();
            if (e === r.a) break;
            if ((e(), t >= a.taskBatchSize)) break;
            t++;
          }
          (f = !1), o.length && s();
        }
        function m(t) {
          o.enqueue(t), s();
        }
      }.call(this, n(3).setImmediate));
    },
    function(t, e) {
      var n;
      n = (function() {
        return this;
      })();
      try {
        n = n || new Function("return this")();
      } catch (t) {
        "object" == typeof window && (n = window);
      }
      t.exports = n;
    },
    function(t, e, n) {
      (function(t) {
        var r =
            (void 0 !== t && t) ||
            ("undefined" != typeof self && self) ||
            window,
          o = Function.prototype.apply;
        function i(t, e) {
          (this._id = t), (this._clearFn = e);
        }
        (e.setTimeout = function() {
          return new i(o.call(setTimeout, r, arguments), clearTimeout);
        }),
          (e.setInterval = function() {
            return new i(o.call(setInterval, r, arguments), clearInterval);
          }),
          (e.clearTimeout = e.clearInterval = function(t) {
            t && t.close();
          }),
          (i.prototype.unref = i.prototype.ref = function() {}),
          (i.prototype.close = function() {
            this._clearFn.call(r, this._id);
          }),
          (e.enroll = function(t, e) {
            clearTimeout(t._idleTimeoutId), (t._idleTimeout = e);
          }),
          (e.unenroll = function(t) {
            clearTimeout(t._idleTimeoutId), (t._idleTimeout = -1);
          }),
          (e._unrefActive = e.active = function(t) {
            clearTimeout(t._idleTimeoutId);
            var e = t._idleTimeout;
            e >= 0 &&
              (t._idleTimeoutId = setTimeout(function() {
                t._onTimeout && t._onTimeout();
              }, e));
          }),
          n(4),
          (e.setImmediate =
            ("undefined" != typeof self && self.setImmediate) ||
            (void 0 !== t && t.setImmediate) ||
            (this && this.setImmediate)),
          (e.clearImmediate =
            ("undefined" != typeof self && self.clearImmediate) ||
            (void 0 !== t && t.clearImmediate) ||
            (this && this.clearImmediate));
      }.call(this, n(2)));
    },
    function(t, e, n) {
      (function(t, e) {
        !(function(t, n) {
          "use strict";
          if (!t.setImmediate) {
            var r,
              o,
              i,
              u,
              c,
              a = 1,
              s = {},
              l = !1,
              f = t.document,
              d = Object.getPrototypeOf && Object.getPrototypeOf(t);
            (d = d && d.setTimeout ? d : t),
              "[object process]" === {}.toString.call(t.process)
                ? (r = function(t) {
                    e.nextTick(function() {
                      h(t);
                    });
                  })
                : !(function() {
                    if (t.postMessage && !t.importScripts) {
                      var e = !0,
                        n = t.onmessage;
                      return (
                        (t.onmessage = function() {
                          e = !1;
                        }),
                        t.postMessage("", "*"),
                        (t.onmessage = n),
                        e
                      );
                    }
                  })()
                ? t.MessageChannel
                  ? (((i = new MessageChannel()).port1.onmessage = function(t) {
                      h(t.data);
                    }),
                    (r = function(t) {
                      i.port2.postMessage(t);
                    }))
                  : f && "onreadystatechange" in f.createElement("script")
                  ? ((o = f.documentElement),
                    (r = function(t) {
                      var e = f.createElement("script");
                      (e.onreadystatechange = function() {
                        h(t),
                          (e.onreadystatechange = null),
                          o.removeChild(e),
                          (e = null);
                      }),
                        o.appendChild(e);
                    }))
                  : (r = function(t) {
                      setTimeout(h, 0, t);
                    })
                : ((u = "setImmediate$" + Math.random() + "$"),
                  (c = function(e) {
                    e.source === t &&
                      "string" == typeof e.data &&
                      0 === e.data.indexOf(u) &&
                      h(+e.data.slice(u.length));
                  }),
                  t.addEventListener
                    ? t.addEventListener("message", c, !1)
                    : t.attachEvent("onmessage", c),
                  (r = function(e) {
                    t.postMessage(u + e, "*");
                  })),
              (d.setImmediate = function(t) {
                "function" != typeof t && (t = new Function("" + t));
                for (
                  var e = new Array(arguments.length - 1), n = 0;
                  n < e.length;
                  n++
                )
                  e[n] = arguments[n + 1];
                var o = { callback: t, args: e };
                return (s[a] = o), r(a), a++;
              }),
              (d.clearImmediate = p);
          }
          function p(t) {
            delete s[t];
          }
          function h(t) {
            if (l) setTimeout(h, 0, t);
            else {
              var e = s[t];
              if (e) {
                l = !0;
                try {
                  !(function(t) {
                    var e = t.callback,
                      n = t.args;
                    switch (n.length) {
                      case 0:
                        e();
                        break;
                      case 1:
                        e(n[0]);
                        break;
                      case 2:
                        e(n[0], n[1]);
                        break;
                      case 3:
                        e(n[0], n[1], n[2]);
                        break;
                      default:
                        e.apply(void 0, n);
                    }
                  })(e);
                } finally {
                  p(t), (l = !1);
                }
              }
            }
          }
        })("undefined" == typeof self ? (void 0 === t ? this : t) : self);
      }.call(this, n(2), n(5)));
    },
    function(t, e) {
      var n,
        r,
        o = (t.exports = {});
      function i() {
        throw new Error("setTimeout has not been defined");
      }
      function u() {
        throw new Error("clearTimeout has not been defined");
      }
      function c(t) {
        if (n === setTimeout) return setTimeout(t, 0);
        if ((n === i || !n) && setTimeout)
          return (n = setTimeout), setTimeout(t, 0);
        try {
          return n(t, 0);
        } catch (e) {
          try {
            return n.call(null, t, 0);
          } catch (e) {
            return n.call(this, t, 0);
          }
        }
      }
      !(function() {
        try {
          n = "function" == typeof setTimeout ? setTimeout : i;
        } catch (t) {
          n = i;
        }
        try {
          r = "function" == typeof clearTimeout ? clearTimeout : u;
        } catch (t) {
          r = u;
        }
      })();
      var a,
        s = [],
        l = !1,
        f = -1;
      function d() {
        l &&
          a &&
          ((l = !1), a.length ? (s = a.concat(s)) : (f = -1), s.length && p());
      }
      function p() {
        if (!l) {
          var t = c(d);
          l = !0;
          for (var e = s.length; e; ) {
            for (a = s, s = []; ++f < e; ) a && a[f].run();
            (f = -1), (e = s.length);
          }
          (a = null),
            (l = !1),
            (function(t) {
              if (r === clearTimeout) return clearTimeout(t);
              if ((r === u || !r) && clearTimeout)
                return (r = clearTimeout), clearTimeout(t);
              try {
                r(t);
              } catch (e) {
                try {
                  return r.call(null, t);
                } catch (e) {
                  return r.call(this, t);
                }
              }
            })(t);
        }
      }
      function h(t, e) {
        (this.fun = t), (this.array = e);
      }
      function m() {}
      (o.nextTick = function(t) {
        var e = new Array(arguments.length - 1);
        if (arguments.length > 1)
          for (var n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
        s.push(new h(t, e)), 1 !== s.length || l || c(p);
      }),
        (h.prototype.run = function() {
          this.fun.apply(null, this.array);
        }),
        (o.title = "browser"),
        (o.browser = !0),
        (o.env = {}),
        (o.argv = []),
        (o.version = ""),
        (o.versions = {}),
        (o.on = m),
        (o.addListener = m),
        (o.once = m),
        (o.off = m),
        (o.removeListener = m),
        (o.removeAllListeners = m),
        (o.emit = m),
        (o.prependListener = m),
        (o.prependOnceListener = m),
        (o.listeners = function(t) {
          return [];
        }),
        (o.binding = function(t) {
          throw new Error("process.binding is not supported");
        }),
        (o.cwd = function() {
          return "/";
        }),
        (o.chdir = function(t) {
          throw new Error("process.chdir is not supported");
        }),
        (o.umask = function() {
          return 0;
        });
    },
    function(t, e, n) {
      "use strict";
      n.r(e);
      var r = {};
      n.r(r),
        n.d(r, "reduce", function() {
          return E;
        }),
        n.d(r, "onto", function() {
          return A;
        }),
        n.d(r, "into", function() {
          return S;
        }),
        n.d(r, "pipe", function() {
          return M;
        }),
        n.d(r, "partition", function() {
          return I;
        }),
        n.d(r, "merge", function() {
          return _;
        }),
        n.d(r, "split", function() {
          return x;
        }),
        n.d(r, "tap", function() {
          return P;
        }),
        n.d(r, "untap", function() {
          return C;
        }),
        n.d(r, "untapAll", function() {
          return L;
        }),
        n.d(r, "map", function() {
          return D;
        }),
        n.d(r, "debounce", function() {
          return N;
        }),
        n.d(r, "throttle", function() {
          return z;
        }),
        n.d(r, "selectAsync", function() {
          return $;
        }),
        n.d(r, "select", function() {
          return U;
        });
      var o = n(0),
        i = n(1);
      const u = "undefined" != typeof Symbol;
      function c(t) {
        return u ? Symbol.for(t) : `@@${t}`;
      }
      u && Symbol.iterator;
      const a = c("transducer/init"),
        s = c("transducer/step"),
        l = c("transducer/result"),
        f = c("transducer/reduced"),
        d = (c("transducer/value"), Symbol()),
        p = Symbol("CLOSED"),
        h = Symbol("DEFAULT");
      function m(t) {
        return !(!t || !t[f]);
      }
      function y(t) {
        return { value: t, box: d };
      }
      function b(t) {
        return t && t.box === d;
      }
      function g(t) {
        return {
          get active() {
            return !0;
          },
          commit: () => t,
        };
      }
      function v(t, e, n = !1, r = 64, u = 1024) {
        const c = Object(o.d)(),
          a = Object(o.d)();
        let f = 0,
          h = 0,
          b = !1;
        return {
          get closed() {
            return b;
          },
          get buffered() {
            return !!t;
          },
          get timeout() {
            return !!n;
          },
          handlePut(n, l) {
            if (n === p) throw Error("Cannot send CLOSED to a channel");
            if (b) return l.commit(), y(!1);
            let f, g;
            if (t && !t.full) {
              l.commit();
              const r = m(e[s](t, n));
              for (; 0 !== t.count && ((f = c.dequeue()), f !== o.a); )
                if (f.active) {
                  g = f.commit();
                  const e = t.remove();
                  g && Object(i.e)(() => g(e));
                }
              return r && this.close(), y(!0);
            }
            for (; (f = c.dequeue()), f !== o.a; )
              if (f.active)
                return (
                  l.commit(),
                  (g = f.commit()),
                  g && Object(i.e)(() => g(n)),
                  y(!0)
                );
            if (
              (h > r ? (a.filter(t => t.handler.active), (h = 0)) : h++,
              a.count >= u)
            )
              throw Error(
                `No more than ${u} pending sends are allowed on a single channel`,
              );
            return (
              a.enqueue(
                (function(t, e) {
                  return { handler: t, value: e, box: d };
                })(l, n),
              ),
              null
            );
          },
          handleTake(n) {
            let l, d, h;
            if (t && t.count > 0) {
              n.commit();
              const r = t.remove();
              for (; !t.full && ((l = a.dequeue()), l !== o.a); )
                (d = l.handler),
                  d.active &&
                    ((h = d.commit()),
                    h && Object(i.e)(() => h(!0)),
                    m(e[s](t, l.value)) && this.close());
              return y(r);
            }
            for (; (l = a.dequeue()), l !== o.a; )
              if (((d = l.handler), d.active))
                return (
                  (h = d.commit()), h && Object(i.e)(() => h(!0)), y(l.value)
                );
            if (b) return n.commit(), y(p);
            if (
              (f > r ? (c.filter(t => t.active), (f = 0)) : f++, c.count >= u)
            )
              throw Error(
                `No more than ${u} pending receives are allowed on a single channel`,
              );
            return c.enqueue(n), null;
          },
          close() {
            if (b) return;
            let n, r, u;
            if (((b = !0), t))
              for (e[l](t); 0 !== t.count && ((n = c.dequeue()), n !== o.a); )
                if (n.active) {
                  u = n.commit();
                  const e = t.remove();
                  u && Object(i.e)(() => u(e));
                }
            for (; (n = c.dequeue()), n !== o.a; )
              n.active && ((u = n.commit()), u && Object(i.e)(() => u(p)));
            for (; (r = a.dequeue()), r !== o.a; )
              r.handler.active &&
                ((u = r.handler.commit()), u && Object(i.e)(() => u(!1)));
          },
          putAsync(t, e = () => {}) {
            const n = this.handlePut(t, g(e));
            n && e && e(n.value);
          },
          takeAsync(t = () => {}) {
            const e = this.handleTake(g(t));
            e && t && t(e.value);
          },
          put(t) {
            return new Promise(e => {
              this.putAsync(t, e);
            });
          },
          take() {
            return new Promise(t => {
              this.takeAsync(t);
            });
          },
          takeOrThrow() {
            return new Promise((t, e) => {
              this.takeAsync(n => {
                Object.prototype.isPrototypeOf.call(Error.prototype, n)
                  ? e(n)
                  : t(n);
              });
            });
          },
        };
      }
      const w = () => p;
      function T(t, e, n) {
        const r = e(n);
        return r !== p && t.add(r), t;
      }
      function O(t, e = w) {
        return {
          [s](n, r) {
            try {
              return t[s](n, r);
            } catch (t) {
              return T(n, e, t);
            }
          },
          [l](n) {
            try {
              return t[l](n);
            } catch (t) {
              return T(n, e, t);
            }
          },
        };
      }
      const j = {
        [a]() {
          throw Error("init not available");
        },
        [s]: (t, e) => (t.add(e), t),
        [l]: t => t,
      };
      function k(
        t = 0,
        {
          transducer: e,
          handler: n,
          maxDirty: r = 64,
          maxQueued: i = 1024,
          timeout: u = null,
        } = {},
      ) {
        const c = 0 === t ? null : t,
          a = "number" == typeof c ? Object(o.c)(c) : c;
        if (e && !a) throw Error("Only buffered channels can use transformers");
        const s = null !== u,
          l = v(a, O(e ? e(j) : j, n), s, r, i);
        return s && setTimeout(() => l.close(), u), l;
      }
      function E(t, e, n) {
        const r = k();
        return (
          (async function() {
            let o = n;
            for (;;) {
              const n = await e.take();
              if (n === p) return void r.putAsync(o, () => r.close());
              o = t(o, n);
            }
          })(),
          r
        );
      }
      function A(t, e) {
        const [n, r] = Array.isArray(t) ? [k(t.length), t] : [t, e];
        return (
          (async function() {
            for (const t of r) await n.put(t);
            n.close();
          })(),
          n
        );
      }
      function S(t, e) {
        const [n, r] = Array.isArray(t) ? [t, e] : [[], t];
        return E((t, e) => (t.push(e), t), r, n.slice());
      }
      const q = { taps: Symbol("multitap/taps") };
      function M(t, e, n) {
        return (
          (async function() {
            for (;;) {
              const r = await t.take();
              if (r === p) {
                n || e.close();
                break;
              }
              if (!(await e.put(r))) break;
            }
          })(),
          e
        );
      }
      function I(t, e, n = 0, r = 0) {
        const o = k(n),
          i = k(r);
        return (
          (async function() {
            for (;;) {
              const n = await e.take();
              if (n === p) {
                o.close(), i.close();
                break;
              }
              await (t(n) ? o : i).put(n);
            }
          })(),
          [o, i]
        );
      }
      function _(t, e = 0) {
        const n = k(e),
          r = t.slice();
        return (
          (async function() {
            for (; 0 !== r.length; ) {
              const { value: t, channel: e } = await U(r);
              if (t !== p) await n.put(t);
              else {
                const t = r.indexOf(e);
                r.splice(t, 1);
              }
            }
            n.close();
          })(),
          n
        );
      }
      function x(t, ...e) {
        const n = [];
        let r = 0 === e.length ? [2] : e;
        if (
          1 === r.length &&
          ((o = r[0]),
          "[object Number]" === Object.prototype.toString.call(o) &&
            isFinite(o))
        ) {
          const t = r[0];
          r = [];
          for (let e = 0; e < t; ++e) r.push(0);
        }
        var o;
        for (const t of r) n.push(k(t));
        const i = k();
        let u = 0;
        function c() {
          0 == --u && i.putAsync();
        }
        return (
          (async function() {
            for (;;) {
              const e = await t.take();
              if (e === p) {
                for (const t of n) t.close();
                break;
              }
              u = n.length;
              for (const t of n) t.putAsync(e, c);
              await i.take();
            }
          })(),
          n
        );
      }
      function P(t, e = k()) {
        return (
          t[q.taps] ||
            (function(t) {
              Object.defineProperty(t, q.taps, {
                configurable: !0,
                writable: !0,
                value: [],
              });
              const e = k();
              let n = 0;
              function r() {
                0 == --n && e.putAsync();
              }
              !(async function() {
                for (;;) {
                  const o = await t.take();
                  if (o === p || 0 === t[q.taps].length) {
                    delete t[q.taps];
                    break;
                  }
                  n = t[q.taps].length;
                  for (const e of t[q.taps]) e.putAsync(o, r);
                  await e.take();
                }
              })();
            })(t),
          ~t[q.taps].indexOf(e) || t[q.taps].push(e),
          e
        );
      }
      function C(t, e) {
        const n = t[q.taps];
        if (n) {
          const r = n.indexOf(e);
          -1 !== r && (n.splice(r, 1), 0 === n.length && t.putAsync());
        }
      }
      function L(t) {
        t[q.taps] && ((t[q.taps] = []), t.putAsync());
      }
      function D(t, e, n = 0) {
        const r = k(n),
          o = e.length,
          i = [],
          u = [],
          c = k();
        let a;
        for (let t = 0; t < o; ++t)
          u[t] = (t => e => {
            (i[t] = e), 0 == --a && c.putAsync(i.slice());
          })(t);
        return (
          (async function() {
            for (;;) {
              a = o;
              for (let t = 0; t < o; ++t) e[t].takeAsync(u[t]);
              const n = await c.take();
              for (const t of n) if (t === p) return void r.close();
              await r.put(t(...n));
            }
          })(),
          r
        );
      }
      function F(t) {
        return (
          "[object Number]" === Object.prototype.toString.call(t) && isFinite(t)
        );
      }
      function N(t, e, n, r) {
        const o = { leading: !1, trailing: !0, maxDelay: 0, cancel: k() },
          i = F(n) ? e : 0,
          u = F(n) ? n : e,
          c = Object.assign(o, (F(n) ? r : n) || {}),
          a = k(i),
          { leading: s, trailing: l, maxDelay: f, cancel: d } = c;
        return (
          (async function() {
            let e = k(),
              n = k(),
              r = p;
            for (;;) {
              const { value: o, channel: i } = await U([t, e, n, d]);
              if (i === d) {
                a.close();
                break;
              }
              if (i === t) {
                if (o === p) {
                  a.close();
                  break;
                }
                const t = e.timeout;
                (e = k(0, { timeout: u })),
                  !t && f > 0 && (n = k(0, { timeout: f })),
                  s ? (t ? (r = o) : await a.put(o)) : l && (r = o);
              } else
                (e = k()), (n = k()), l && r !== p && (await a.put(r), (r = p));
            }
          })(),
          a
        );
      }
      function z(t, e, n, r) {
        const o = { leading: !0, trailing: !0, cancel: k() },
          i = F(n) ? e : 0,
          u = F(n) ? n : e,
          c = Object.assign(o, (F(n) ? r : n) || {}),
          a = k(i),
          { leading: s, trailing: l, cancel: f } = c;
        return (
          (async function() {
            let e = k(),
              n = p;
            for (;;) {
              const { value: r, channel: o } = await U([t, e, f]);
              if (o === f) {
                a.close();
                break;
              }
              if (o === t) {
                if (r === p) {
                  a.close();
                  break;
                }
                const t = e.timeout;
                t || (e = k(0, { timeout: u })),
                  s ? (t ? l && (n = r) : await a.put(r)) : l && (n = r);
              } else
                l && n !== p
                  ? ((e = k(0, { timeout: u })), await a.put(n), (n = p))
                  : (e = k());
            }
          })(),
          a
        );
      }
      function $(t, e, n = {}) {
        const r = t.length;
        if (0 === r) throw Error("Alts called with no operations");
        const o = !!n.priority,
          i = o
            ? []
            : (function(t) {
                const e = [];
                for (let n = 0; n < t; ++n) e.push(n);
                for (let n = t - 1; n > 0; --n) {
                  const t = Math.floor(Math.random() * (n + 1)),
                    r = e[n];
                  (e[n] = e[t]), (e[t] = r);
                }
                return e;
              })(r),
          u = y(!0);
        function c(t) {
          return (function(t, e) {
            return {
              get active() {
                return t.value;
              },
              commit: () => ((t.value = !1), e),
            };
          })(u, n => {
            e({ value: n, channel: t });
          });
        }
        let a;
        for (let n = 0; n < r; ++n) {
          const r = t[o ? n : i[n]];
          let u, s;
          if (
            (Array.isArray(r)
              ? (([u, s] = r), (a = u.handlePut(s, c(u))))
              : ((u = r), (a = u.handleTake(c(u)))),
            b(a))
          ) {
            e({ value: a.value, channel: u });
            break;
          }
        }
        !b(a) &&
          Object.prototype.hasOwnProperty.call(n, "default") &&
          u.value &&
          ((u.value = !1), e({ value: n.default, channel: h }));
      }
      function U(t, e = {}) {
        return new Promise(n => {
          $(t, n, e);
        });
      }
      n.d(e, "Buffer", function() {
        return B;
      }),
        n.d(e, "Channel", function() {
          return G;
        }),
        n.d(e, "Process", function() {
          return H;
        }),
        n.d(e, "Dispatcher", function() {
          return Y;
        }),
        n.d(e, "Channels", function() {
          return Q;
        });
      const B = { fixed: o.c, sliding: o.e, dropping: o.b, EMPTY: o.a },
        G = { chan: k, CLOSED: p, DEFAULT: h },
        H = {
          sleep: function(t = 0) {
            return new Promise(e => {
              const n = k();
              setTimeout(() => n.close(), t), n.takeAsync(e);
            });
          },
          go: function(t, ...e) {
            return t(...e);
          },
        },
        Y = {
          config: i.d,
          SET_IMMEDIATE: i.b,
          MESSAGE_CHANNEL: i.a,
          SET_TIMEOUT: i.c,
        },
        Q = r;
    },
  ]);
});
