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
            return f;
          }),
          n.d(e, "e", function() {
            return h;
          });
        var r = n(0);
        const o = Object(r.d)(),
          i = Symbol("SET_IMMEDIATE"),
          u = Symbol("MESSAGE_CHANNEL"),
          c = Symbol("SET_TIMEOUT"),
          a = { batchSize: 1024, dispatchMethod: i };
        let s = m();
        function f(t) {
          for (const e in a)
            Object.prototype.hasOwnProperty.call(t, e) &&
              ((a[e] = t[e]), "dispatchMethod" === e && (s = m()));
        }
        let l = !1,
          d = !1;
        function m() {
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
                (d && l) || ((d = !0), t(p));
              };
            case u: {
              const t = new MessageChannel();
              return (
                (t.port1.onmessage = () => p()),
                () => {
                  (d && l) || ((d = !0), t.port2.postMessage(0));
                }
              );
            }
            case c:
              return () => {
                (d && l) || ((d = !0), setTimeout(p, 0));
              };
          }
        }
        function p() {
          (l = !0), (d = !1);
          let t = 0;
          for (;;) {
            const e = o.dequeue();
            if (e === r.a) break;
            if ((e(), t >= a.taskBatchSize)) break;
            t++;
          }
          (l = !1), o.length && s();
        }
        function h(t) {
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
              f = !1,
              l = t.document,
              d = Object.getPrototypeOf && Object.getPrototypeOf(t);
            (d = d && d.setTimeout ? d : t),
              "[object process]" === {}.toString.call(t.process)
                ? (r = function(t) {
                    e.nextTick(function() {
                      p(t);
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
                      p(t.data);
                    }),
                    (r = function(t) {
                      i.port2.postMessage(t);
                    }))
                  : l && "onreadystatechange" in l.createElement("script")
                  ? ((o = l.documentElement),
                    (r = function(t) {
                      var e = l.createElement("script");
                      (e.onreadystatechange = function() {
                        p(t),
                          (e.onreadystatechange = null),
                          o.removeChild(e),
                          (e = null);
                      }),
                        o.appendChild(e);
                    }))
                  : (r = function(t) {
                      setTimeout(p, 0, t);
                    })
                : ((u = "setImmediate$" + Math.random() + "$"),
                  (c = function(e) {
                    e.source === t &&
                      "string" == typeof e.data &&
                      0 === e.data.indexOf(u) &&
                      p(+e.data.slice(u.length));
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
              (d.clearImmediate = m);
          }
          function m(t) {
            delete s[t];
          }
          function p(t) {
            if (f) setTimeout(p, 0, t);
            else {
              var e = s[t];
              if (e) {
                f = !0;
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
                  m(t), (f = !1);
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
        f = !1,
        l = -1;
      function d() {
        f &&
          a &&
          ((f = !1), a.length ? (s = a.concat(s)) : (l = -1), s.length && m());
      }
      function m() {
        if (!f) {
          var t = c(d);
          f = !0;
          for (var e = s.length; e; ) {
            for (a = s, s = []; ++l < e; ) a && a[l].run();
            (l = -1), (e = s.length);
          }
          (a = null),
            (f = !1),
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
      function p(t, e) {
        (this.fun = t), (this.array = e);
      }
      function h() {}
      (o.nextTick = function(t) {
        var e = new Array(arguments.length - 1);
        if (arguments.length > 1)
          for (var n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
        s.push(new p(t, e)), 1 !== s.length || f || c(m);
      }),
        (p.prototype.run = function() {
          this.fun.apply(null, this.array);
        }),
        (o.title = "browser"),
        (o.browser = !0),
        (o.env = {}),
        (o.argv = []),
        (o.version = ""),
        (o.versions = {}),
        (o.on = h),
        (o.addListener = h),
        (o.once = h),
        (o.off = h),
        (o.removeListener = h),
        (o.removeAllListeners = h),
        (o.emit = h),
        (o.prependListener = h),
        (o.prependOnceListener = h),
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
          return D;
        }),
        n.d(r, "onto", function() {
          return F;
        }),
        n.d(r, "into", function() {
          return N;
        }),
        n.d(r, "pipe", function() {
          return $;
        }),
        n.d(r, "partition", function() {
          return B;
        }),
        n.d(r, "merge", function() {
          return U;
        }),
        n.d(r, "split", function() {
          return G;
        }),
        n.d(r, "tap", function() {
          return H;
        }),
        n.d(r, "untap", function() {
          return Y;
        }),
        n.d(r, "untapAll", function() {
          return Q;
        }),
        n.d(r, "map", function() {
          return J;
        }),
        n.d(r, "debounce", function() {
          return R;
        }),
        n.d(r, "throttle", function() {
          return V;
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
        f = c("transducer/result"),
        l = c("transducer/reduced"),
        d = (c("transducer/value"), Symbol()),
        m = Symbol("CLOSED"),
        p = Symbol("DEFAULT");
      function h(t) {
        return !(!t || !t[l]);
      }
      function y(t) {
        return { value: t, box: d };
      }
      function b(t) {
        return t && t.box === d;
      }
      function g(t, e, n = !1, r = 64, u = 1024) {
        const c = Object(o.d)(),
          a = Object(o.d)();
        let l = 0,
          p = 0,
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
          put(n, f) {
            if (n === m) throw Error("Cannot put CLOSED on a channel");
            if (b) return f.commit(), y(!1);
            let l, g;
            if (t && !t.full) {
              f.commit();
              const r = h(e[s](t, n));
              for (; 0 !== t.count && ((l = c.dequeue()), l !== o.a); )
                if (l.active) {
                  g = l.commit();
                  const e = t.remove();
                  g && Object(i.e)(() => g(e));
                }
              return r && this.close(), y(!0);
            }
            for (; (l = c.dequeue()), l !== o.a; )
              if (l.active)
                return (
                  f.commit(),
                  (g = l.commit()),
                  g && Object(i.e)(() => g(n)),
                  y(!0)
                );
            if (
              (p > r ? (a.filter(t => t.handler.active), (p = 0)) : p++,
              a.count >= u)
            )
              throw Error(
                `No more than ${u} pending puts are allowed on a single channel`,
              );
            return (
              a.enqueue(
                (function(t, e) {
                  return { handler: t, value: e, box: d };
                })(f, n),
              ),
              null
            );
          },
          take(n) {
            let f, d, p;
            if (t && t.count > 0) {
              n.commit();
              const r = t.remove();
              for (; !t.full && ((f = a.dequeue()), f !== o.a); )
                (d = f.handler),
                  d.active &&
                    ((p = d.commit()),
                    p && Object(i.e)(() => p(!0)),
                    h(e[s](t, f.value)) && this.close());
              return y(r);
            }
            for (; (f = a.dequeue()), f !== o.a; )
              if (((d = f.handler), d.active))
                return (
                  (p = d.commit()), p && Object(i.e)(() => p(!0)), y(f.value)
                );
            if (b) return n.commit(), y(m);
            if (
              (l > r ? (c.filter(t => t.active), (l = 0)) : l++, c.count >= u)
            )
              throw Error(
                `No more than ${u} pending takes are allowed on a single channel`,
              );
            return c.enqueue(n), null;
          },
          close() {
            if (b) return;
            let n, r, u;
            if (((b = !0), t))
              for (e[f](t); 0 !== t.count && ((n = c.dequeue()), n !== o.a); )
                if (n.active) {
                  u = n.commit();
                  const e = t.remove();
                  u && Object(i.e)(() => u(e));
                }
            for (; (n = c.dequeue()), n !== o.a; )
              n.active && ((u = n.commit()), u && Object(i.e)(() => u(m)));
            for (; (r = a.dequeue()), r !== o.a; )
              r.handler.active &&
                ((u = r.handler.commit()), u && Object(i.e)(() => u(!1)));
          },
        };
      }
      const v = () => m;
      function w(t, e, n) {
        const r = e(n);
        return r !== m && t.add(r), t;
      }
      function T(t, e = v) {
        return {
          [s](n, r) {
            try {
              return t[s](n, r);
            } catch (t) {
              return w(n, e, t);
            }
          },
          [f](n) {
            try {
              return t[f](n);
            } catch (t) {
              return w(n, e, t);
            }
          },
        };
      }
      const O = {
        [a]() {
          throw Error("init not available");
        },
        [s]: (t, e) => (t.add(e), t),
        [f]: t => t,
      };
      function j(
        t = 0,
        {
          transducer: e,
          handler: n,
          maxDirty: r = 64,
          maxQueued: i = 1024,
        } = {},
      ) {
        const u = 0 === t ? null : t,
          c = "number" == typeof u ? Object(o.c)(u) : u;
        if (e && !c) throw Error("Only buffered channels can use transformers");
        return g(c, T(e ? e(O) : O, n), !1, r, i);
      }
      function E(t) {
        const e = g(null, T(O), !0);
        return setTimeout(() => S(e), t), e;
      }
      function S(t) {
        t.close();
      }
      function k(t) {
        return {
          get active() {
            return !0;
          },
          commit: () => t,
        };
      }
      function q(t, e, n = {}) {
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
              ? (([u, s] = r), (a = u.put(s, c(u))))
              : ((u = r), (a = u.take(c(u)))),
            b(a))
          ) {
            e({ value: a.value, channel: u });
            break;
          }
        }
        !b(a) &&
          Object.prototype.hasOwnProperty.call(n, "default") &&
          u.value &&
          ((u.value = !1), e({ value: n.default, channel: p }));
      }
      function M(t, e, n) {
        const r = t.put(e, k(n));
        r && n && n(r.value);
      }
      function I(t, e) {
        const n = t.take(k(e));
        n && e && e(n.value);
      }
      function _(t, e) {
        return new Promise(n => {
          M(t, e, n);
        });
      }
      function x(t) {
        return new Promise(e => {
          I(t, e);
        });
      }
      function A(t) {
        return new Promise((e, n) => {
          I(t, t => {
            Object.prototype.isPrototypeOf.call(Error.prototype, t)
              ? n(t)
              : e(t);
          });
        });
      }
      function P(t, e = {}) {
        return new Promise(n => {
          q(t, n, e);
        });
      }
      function L(t = 0) {
        return new Promise(e => {
          const n = j();
          setTimeout(() => n.close(), t), I(n, e);
        });
      }
      function C(t, ...e) {
        return t(...e);
      }
      function D(t, e, n) {
        const r = j();
        return (
          (async function() {
            let o = n;
            for (;;) {
              const n = await x(e);
              if (n === m) return void M(r, o, () => S(r));
              o = t(o, n);
            }
          })(),
          r
        );
      }
      function F(t, e) {
        const [n, r] = Array.isArray(t) ? [j(t.length), t] : [t, e];
        return (
          (async function() {
            for (const t of r) await _(n, t);
            S(n);
          })(),
          n
        );
      }
      function N(t, e) {
        const [n, r] = Array.isArray(t) ? [t, e] : [[], t];
        return D((t, e) => (t.push(e), t), r, n.slice());
      }
      const z = { taps: Symbol("multitap/taps") };
      function $(t, e, n) {
        return (
          (async function() {
            for (;;) {
              const r = await x(t);
              if (r === m) {
                n || S(e);
                break;
              }
              if (!(await _(e, r))) break;
            }
          })(),
          e
        );
      }
      function B(t, e, n = 0, r = 0) {
        const o = j(n),
          i = j(r);
        return (
          (async function() {
            for (;;) {
              const n = await x(e);
              if (n === m) {
                S(o), S(i);
                break;
              }
              await _(t(n) ? o : i, n);
            }
          })(),
          [o, i]
        );
      }
      function U(t, e = 0) {
        const n = j(e),
          r = t.slice();
        return (
          (async function() {
            for (; 0 !== r.length; ) {
              const { value: t, channel: e } = await P(r);
              if (t !== m) await _(n, t);
              else {
                const t = r.indexOf(e);
                r.splice(t, 1);
              }
            }
            S(n);
          })(),
          n
        );
      }
      function G(t, ...e) {
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
        for (const t of r) n.push(j(t));
        const i = j();
        let u = 0;
        function c() {
          0 == --u && M(i);
        }
        return (
          (async function() {
            for (;;) {
              const e = await x(t);
              if (e === m) {
                for (const t of n) S(t);
                break;
              }
              u = n.length;
              for (const t of n) M(t, e, c);
              await x(i);
            }
          })(),
          n
        );
      }
      function H(t, e = j()) {
        return (
          t[z.taps] ||
            (function(t) {
              Object.defineProperty(t, z.taps, {
                configurable: !0,
                writable: !0,
                value: [],
              });
              const e = j();
              let n = 0;
              function r() {
                0 == --n && M(e);
              }
              !(async function() {
                for (;;) {
                  const o = await x(t);
                  if (o === m || 0 === t[z.taps].length) {
                    delete t[z.taps];
                    break;
                  }
                  n = t[z.taps].length;
                  for (const e of t[z.taps]) M(e, o, r);
                  await x(e);
                }
              })();
            })(t),
          ~t[z.taps].indexOf(e) || t[z.taps].push(e),
          e
        );
      }
      function Y(t, e) {
        const n = t[z.taps];
        if (n) {
          const r = n.indexOf(e);
          -1 !== r && (n.splice(r, 1), 0 === n.length && M(t));
        }
      }
      function Q(t) {
        t[z.taps] && ((t[z.taps] = []), M(t));
      }
      function J(t, e, n = 0) {
        const r = j(n),
          o = e.length,
          i = [],
          u = [],
          c = j();
        let a;
        for (let t = 0; t < o; ++t)
          u[t] = (t => e => {
            (i[t] = e), 0 == --a && M(c, i.slice());
          })(t);
        return (
          (async function() {
            for (;;) {
              a = o;
              for (let t = 0; t < o; ++t) I(e[t], u[t]);
              const n = await x(c);
              for (const t of n) if (t === m) return void S(r);
              await _(r, t(...n));
            }
          })(),
          r
        );
      }
      function K(t) {
        return (
          "[object Number]" === Object.prototype.toString.call(t) && isFinite(t)
        );
      }
      function R(t, e, n, r) {
        const o = { leading: !1, trailing: !0, maxDelay: 0, cancel: j() },
          i = K(n) ? e : 0,
          u = K(n) ? n : e,
          c = Object.assign(o, (K(n) ? r : n) || {}),
          a = j(i),
          { leading: s, trailing: f, maxDelay: l, cancel: d } = c;
        return (
          (async function() {
            let e = j(),
              n = j(),
              r = m;
            for (;;) {
              const { value: o, channel: i } = await P([t, e, n, d]);
              if (i === d) {
                S(a);
                break;
              }
              if (i === t) {
                if (o === m) {
                  S(a);
                  break;
                }
                const t = e.timeout;
                (e = E(u)),
                  !t && l > 0 && (n = E(l)),
                  s ? (t ? (r = o) : await _(a, o)) : f && (r = o);
              } else
                (e = j()), (n = j()), f && r !== m && (await _(a, r), (r = m));
            }
          })(),
          a
        );
      }
      function V(t, e, n, r) {
        const o = { leading: !0, trailing: !0, cancel: j() },
          i = K(n) ? e : 0,
          u = K(n) ? n : e,
          c = Object.assign(o, (K(n) ? r : n) || {}),
          a = j(i),
          { leading: s, trailing: f, cancel: l } = c;
        return (
          (async function() {
            let e = j(),
              n = m;
            for (;;) {
              const { value: r, channel: o } = await P([t, e, l]);
              if (o === l) {
                S(a);
                break;
              }
              if (o === t) {
                if (r === m) {
                  S(a);
                  break;
                }
                const t = e.timeout;
                t || (e = E(u)),
                  s ? (t ? f && (n = r) : await _(a, r)) : f && (n = r);
              } else
                f && n !== m ? ((e = E(u)), await _(a, n), (n = m)) : (e = j());
            }
          })(),
          a
        );
      }
      n.d(e, "utils", function() {
        return W;
      }),
        n.d(e, "fixedBuffer", function() {
          return o.c;
        }),
        n.d(e, "slidingBuffer", function() {
          return o.e;
        }),
        n.d(e, "droppingBuffer", function() {
          return o.b;
        }),
        n.d(e, "EMPTY", function() {
          return o.a;
        }),
        n.d(e, "chan", function() {
          return j;
        }),
        n.d(e, "timeout", function() {
          return E;
        }),
        n.d(e, "close", function() {
          return S;
        }),
        n.d(e, "CLOSED", function() {
          return m;
        }),
        n.d(e, "DEFAULT", function() {
          return p;
        }),
        n.d(e, "putAsync", function() {
          return M;
        }),
        n.d(e, "takeAsync", function() {
          return I;
        }),
        n.d(e, "altsAsync", function() {
          return q;
        }),
        n.d(e, "put", function() {
          return _;
        }),
        n.d(e, "take", function() {
          return x;
        }),
        n.d(e, "takeOrThrow", function() {
          return A;
        }),
        n.d(e, "alts", function() {
          return P;
        }),
        n.d(e, "sleep", function() {
          return L;
        }),
        n.d(e, "go", function() {
          return C;
        }),
        n.d(e, "config", function() {
          return i.d;
        }),
        n.d(e, "SET_IMMEDIATE", function() {
          return i.b;
        }),
        n.d(e, "MESSAGE_CHANNEL", function() {
          return i.a;
        }),
        n.d(e, "SET_TIMEOUT", function() {
          return i.c;
        });
      const W = r;
    },
  ]);
});
