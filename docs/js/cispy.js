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
      n((n.s = 10))
    );
  })([
    function(t, e, n) {
      "use strict";
      n.d(e, "a", function() {
        return r;
      }),
        n.d(e, "d", function() {
          return u;
        }),
        n.d(e, "e", function() {
          return i;
        }),
        n.d(e, "c", function() {
          return a;
        }),
        n.d(e, "b", function() {
          return s;
        }),
        n.d(e, "f", function() {
          return f;
        });
      const r = Symbol("EMPTY"),
        o = Symbol("BUFFER");
      function u(t) {
        return Object.getOwnPropertySymbols(t).includes(o);
      }
      function i() {
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
      function c(t) {
        const e = i();
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
      function a(t) {
        return Object.assign(
          Object.create(c(t), {
            full: {
              get() {
                return this.queue.count >= this.size;
              },
            },
            [o]: { get: () => !0 },
          }),
          {
            add(...t) {
              for (const e of t) this.queue.enqueue(e);
            },
          },
        );
      }
      function s(t) {
        return Object.assign(
          Object.create(c(t), {
            full: { get: () => !1 },
            [o]: { get: () => !0 },
          }),
          {
            add(...t) {
              for (const e of t)
                this.queue.count < this.size && this.queue.enqueue(e);
            },
          },
        );
      }
      function f(t) {
        return Object.assign(
          Object.create(c(t), {
            full: { get: () => !1 },
            [o]: { get: () => !0 },
          }),
          {
            add(...t) {
              for (const e of t)
                this.queue.count === this.size && this.queue.dequeue(),
                  this.queue.enqueue(e);
            },
          },
        );
      }
    },
    function(t, e, n) {
      "use strict";
      (function(t) {
        n.d(e, "b", function() {
          return u;
        }),
          n.d(e, "a", function() {
            return i;
          }),
          n.d(e, "c", function() {
            return c;
          }),
          n.d(e, "d", function() {
            return f;
          }),
          n.d(e, "e", function() {
            return m;
          });
        var r = n(0);
        const o = Object(r.e)(),
          u = Symbol("SET_IMMEDIATE"),
          i = Symbol("MESSAGE_CHANNEL"),
          c = Symbol("SET_TIMEOUT"),
          a = { batchSize: 1024, dispatchMethod: u };
        let s = p();
        function f(t) {
          for (const e in a)
            Object.prototype.hasOwnProperty.call(t, e) &&
              ((a[e] = t[e]), "dispatchMethod" === e && (s = p()));
        }
        let l = !1,
          d = !1;
        function p() {
          switch (
            (function() {
              switch (a.dispatchMethod) {
                case i:
                  return "undefined" != typeof MessageChannel ? i : c;
                case c:
                  return c;
                default:
                  return void 0 !== t
                    ? u
                    : "undefined" != typeof MessageChannel
                    ? i
                    : c;
              }
            })()
          ) {
            case u:
              return () => {
                (d && l) || ((d = !0), t(h));
              };
            case i: {
              const t = new MessageChannel();
              return (
                (t.port1.onmessage = () => h()),
                () => {
                  (d && l) || ((d = !0), t.port2.postMessage(0));
                }
              );
            }
            case c:
              return () => {
                (d && l) || ((d = !0), setTimeout(h, 0));
              };
          }
        }
        function h() {
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
        function m(t) {
          o.enqueue(t), s();
        }
      }.call(this, n(7).setImmediate));
    },
    function(t, e) {
      t.exports = function(t) {
        this.wrapped = t;
      };
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
      var r = n(2);
      t.exports = function(t) {
        return new r(t);
      };
    },
    function(t, e, n) {
      var r = n(6);
      t.exports = function(t) {
        return function() {
          return new r(t.apply(this, arguments));
        };
      };
    },
    function(t, e, n) {
      var r = n(2);
      function o(t) {
        var e, n;
        function o(e, n) {
          try {
            var i = t[e](n),
              c = i.value,
              a = c instanceof r;
            Promise.resolve(a ? c.wrapped : c).then(
              function(t) {
                a
                  ? o("return" === e ? "return" : "next", t)
                  : u(i.done ? "return" : "normal", t);
              },
              function(t) {
                o("throw", t);
              },
            );
          } catch (t) {
            u("throw", t);
          }
        }
        function u(t, r) {
          switch (t) {
            case "return":
              e.resolve({ value: r, done: !0 });
              break;
            case "throw":
              e.reject(r);
              break;
            default:
              e.resolve({ value: r, done: !1 });
          }
          (e = e.next) ? o(e.key, e.arg) : (n = null);
        }
        (this._invoke = function(t, r) {
          return new Promise(function(u, i) {
            var c = { key: t, arg: r, resolve: u, reject: i, next: null };
            n ? (n = n.next = c) : ((e = n = c), o(t, r));
          });
        }),
          "function" != typeof t.return && (this.return = void 0);
      }
      "function" == typeof Symbol &&
        Symbol.asyncIterator &&
        (o.prototype[Symbol.asyncIterator] = function() {
          return this;
        }),
        (o.prototype.next = function(t) {
          return this._invoke("next", t);
        }),
        (o.prototype.throw = function(t) {
          return this._invoke("throw", t);
        }),
        (o.prototype.return = function(t) {
          return this._invoke("return", t);
        }),
        (t.exports = o);
    },
    function(t, e, n) {
      (function(t) {
        var r =
            (void 0 !== t && t) ||
            ("undefined" != typeof self && self) ||
            window,
          o = Function.prototype.apply;
        function u(t, e) {
          (this._id = t), (this._clearFn = e);
        }
        (e.setTimeout = function() {
          return new u(o.call(setTimeout, r, arguments), clearTimeout);
        }),
          (e.setInterval = function() {
            return new u(o.call(setInterval, r, arguments), clearInterval);
          }),
          (e.clearTimeout = e.clearInterval = function(t) {
            t && t.close();
          }),
          (u.prototype.unref = u.prototype.ref = function() {}),
          (u.prototype.close = function() {
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
          n(8),
          (e.setImmediate =
            ("undefined" != typeof self && self.setImmediate) ||
            (void 0 !== t && t.setImmediate) ||
            (this && this.setImmediate)),
          (e.clearImmediate =
            ("undefined" != typeof self && self.clearImmediate) ||
            (void 0 !== t && t.clearImmediate) ||
            (this && this.clearImmediate));
      }.call(this, n(3)));
    },
    function(t, e, n) {
      (function(t, e) {
        !(function(t, n) {
          "use strict";
          if (!t.setImmediate) {
            var r,
              o,
              u,
              i,
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
                  ? (((u = new MessageChannel()).port1.onmessage = function(t) {
                      h(t.data);
                    }),
                    (r = function(t) {
                      u.port2.postMessage(t);
                    }))
                  : l && "onreadystatechange" in l.createElement("script")
                  ? ((o = l.documentElement),
                    (r = function(t) {
                      var e = l.createElement("script");
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
                : ((i = "setImmediate$" + Math.random() + "$"),
                  (c = function(e) {
                    e.source === t &&
                      "string" == typeof e.data &&
                      0 === e.data.indexOf(i) &&
                      h(+e.data.slice(i.length));
                  }),
                  t.addEventListener
                    ? t.addEventListener("message", c, !1)
                    : t.attachEvent("onmessage", c),
                  (r = function(e) {
                    t.postMessage(i + e, "*");
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
            if (f) setTimeout(h, 0, t);
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
                  p(t), (f = !1);
                }
              }
            }
          }
        })("undefined" == typeof self ? (void 0 === t ? this : t) : self);
      }.call(this, n(3), n(9)));
    },
    function(t, e) {
      var n,
        r,
        o = (t.exports = {});
      function u() {
        throw new Error("setTimeout has not been defined");
      }
      function i() {
        throw new Error("clearTimeout has not been defined");
      }
      function c(t) {
        if (n === setTimeout) return setTimeout(t, 0);
        if ((n === u || !n) && setTimeout)
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
          n = "function" == typeof setTimeout ? setTimeout : u;
        } catch (t) {
          n = u;
        }
        try {
          r = "function" == typeof clearTimeout ? clearTimeout : i;
        } catch (t) {
          r = i;
        }
      })();
      var a,
        s = [],
        f = !1,
        l = -1;
      function d() {
        f &&
          a &&
          ((f = !1), a.length ? (s = a.concat(s)) : (l = -1), s.length && p());
      }
      function p() {
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
              if ((r === i || !r) && clearTimeout)
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
        s.push(new h(t, e)), 1 !== s.length || f || c(p);
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
          return _;
        }),
        n.d(r, "onto", function() {
          return P;
        }),
        n.d(r, "into", function() {
          return C;
        }),
        n.d(r, "pipe", function() {
          return D;
        }),
        n.d(r, "partition", function() {
          return F;
        }),
        n.d(r, "merge", function() {
          return N;
        }),
        n.d(r, "split", function() {
          return z;
        }),
        n.d(r, "tap", function() {
          return U;
        }),
        n.d(r, "untap", function() {
          return $;
        }),
        n.d(r, "untapAll", function() {
          return Q;
        }),
        n.d(r, "map", function() {
          return B;
        }),
        n.d(r, "debounce", function() {
          return H;
        }),
        n.d(r, "throttle", function() {
          return Y;
        }),
        n.d(r, "selectAsync", function() {
          return R;
        }),
        n.d(r, "select", function() {
          return J;
        });
      var o = n(0),
        u = n(4),
        i = n.n(u),
        c = n(5),
        a = n.n(c),
        s = n(1);
      const f = "undefined" != typeof Symbol;
      function l(t) {
        return f ? Symbol.for(t) : `@@${t}`;
      }
      f && Symbol.iterator;
      const d = f ? Symbol.asyncIterator : "@@asyncIterator",
        p = l("transducer/init"),
        h = l("transducer/step"),
        m = l("transducer/result"),
        y = l("transducer/reduced"),
        b = (l("transducer/value"), Symbol()),
        v = Symbol("CLOSED"),
        g = Symbol("DEFAULT");
      function w(t) {
        return !(!t || !t[y]);
      }
      function T(t) {
        return { value: t, box: b };
      }
      function O(t) {
        return t && t.box === b;
      }
      function k(t) {
        return {
          get active() {
            return !0;
          },
          commit: () => t,
        };
      }
      function j(t, e, n = !1, r = 64, u = 1024) {
        const c = Object(o.e)(),
          f = Object(o.e)();
        let l = 0,
          p = 0,
          y = !1;
        return {
          get closed() {
            return y;
          },
          get buffered() {
            return !!t;
          },
          get timeout() {
            return !!n;
          },
          [d]:
            ((g = a()(function*() {
              for (;;) {
                const t = yield i()(this.take());
                if (t === v) break;
                yield t;
              }
            })),
            function() {
              return g.apply(this, arguments);
            }),
          handlePut(n, i) {
            if (n === v) throw Error("Cannot send CLOSED to a channel");
            if (y) return i.commit(), T(!1);
            let a, l;
            if (t && !t.full) {
              i.commit();
              const r = w(e[h](t, n));
              for (; 0 !== t.count && ((a = c.dequeue()), a !== o.a); )
                if (a.active) {
                  l = a.commit();
                  const e = t.remove();
                  l && Object(s.e)(() => l(e));
                }
              return r && this.close(), T(!0);
            }
            for (; (a = c.dequeue()), a !== o.a; )
              if (a.active)
                return (
                  i.commit(),
                  (l = a.commit()),
                  l && Object(s.e)(() => l(n)),
                  T(!0)
                );
            if (
              (p > r ? (f.filter(t => t.handler.active), (p = 0)) : p++,
              f.count >= u)
            )
              throw Error(
                `No more than ${u} pending sends are allowed on a single channel`,
              );
            return (
              f.enqueue(
                (function(t, e) {
                  return { handler: t, value: e, box: b };
                })(i, n),
              ),
              null
            );
          },
          handleTake(n) {
            let i, a, d;
            if (t && t.count > 0) {
              n.commit();
              const r = t.remove();
              for (; !t.full && ((i = f.dequeue()), i !== o.a); )
                (a = i.handler),
                  a.active &&
                    ((d = a.commit()),
                    d && Object(s.e)(() => d(!0)),
                    w(e[h](t, i.value)) && this.close());
              return T(r);
            }
            for (; (i = f.dequeue()), i !== o.a; )
              if (((a = i.handler), a.active))
                return (
                  (d = a.commit()), d && Object(s.e)(() => d(!0)), T(i.value)
                );
            if (y) return n.commit(), T(v);
            if (
              (l > r ? (c.filter(t => t.active), (l = 0)) : l++, c.count >= u)
            )
              throw Error(
                `No more than ${u} pending receives are allowed on a single channel`,
              );
            return c.enqueue(n), null;
          },
          close() {
            if (y) return;
            let n, r, u;
            if (((y = !0), t))
              for (e[m](t); 0 !== t.count && ((n = c.dequeue()), n !== o.a); )
                if (n.active) {
                  u = n.commit();
                  const e = t.remove();
                  u && Object(s.e)(() => u(e));
                }
            for (; (n = c.dequeue()), n !== o.a; )
              n.active && ((u = n.commit()), u && Object(s.e)(() => u(v)));
            for (; (r = f.dequeue()), r !== o.a; )
              r.handler.active &&
                ((u = r.handler.commit()), u && Object(s.e)(() => u(!1)));
          },
          putAsync(t, e = () => {}) {
            const n = this.handlePut(t, k(e));
            n && e && e(n.value);
          },
          takeAsync(t = () => {}) {
            const e = this.handleTake(k(t));
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
        var g;
      }
      const x = () => v;
      function E(t, e, n) {
        const r = e(n);
        return r !== v && t.add(r), t;
      }
      function S(t, e = x) {
        return {
          [h](n, r) {
            try {
              return t[h](n, r);
            } catch (t) {
              return E(n, e, t);
            }
          },
          [m](n) {
            try {
              return t[m](n);
            } catch (t) {
              return E(n, e, t);
            }
          },
        };
      }
      const A = {
        [p]() {
          throw Error("init not available");
        },
        [h]: (t, e) => (t.add(e), t),
        [m]: t => t,
      };
      function I(t, e) {
        const {
          buf: n,
          transducer: r,
          handler: u,
          maxDirty: i,
          maxQueued: c,
          timeout: a,
        } = (function(t, e, n) {
          let r, u;
          t
            ? "number" == typeof t
              ? ((r = Object(o.c)(t)), (u = e))
              : Object(o.d)(t)
              ? ((r = t), (u = e))
              : ((r = null), (u = t))
            : ((r = null), (u = e));
          const {
            transducer: i,
            handler: c,
            maxDirty: a,
            maxQueued: s,
            timeout: f,
          } = Object.assign({}, n, u);
          return {
            buf: r,
            transducer: i,
            handler: c,
            maxDirty: a,
            maxQueued: s,
            timeout: f,
          };
        })(t, e, { maxDirty: 64, maxQueued: 1024 });
        if (r && !n) throw Error("Only buffered channels can use transformers");
        const s = "number" == typeof a,
          f = j(n, S(r ? r(A) : A, u), s, i, c);
        return s && setTimeout(() => f.close(), a), f;
      }
      function q(t = 0) {
        return new Promise(e => {
          const n = I();
          setTimeout(() => n.close(), t), n.takeAsync(e);
        });
      }
      function M(t, ...e) {
        return t(...e);
      }
      function _(t, e, n) {
        const r = I();
        return (
          (async function() {
            let o = n;
            for (;;) {
              const n = await e.take();
              if (n === v) return void r.putAsync(o, () => r.close());
              o = t(o, n);
            }
          })(),
          r
        );
      }
      function P(t, e) {
        const [n, r] = Array.isArray(t) ? [I(t.length), t] : [t, e];
        return (
          (async function() {
            for (const t of r) await n.put(t);
            n.close();
          })(),
          n
        );
      }
      function C(t, e) {
        const [n, r] = Array.isArray(t) ? [t, e] : [[], t];
        return _((t, e) => (t.push(e), t), r, n.slice());
      }
      const L = { taps: Symbol("multitap/taps") };
      function D(t, e, n) {
        return (
          (async function() {
            for (;;) {
              const r = await t.take();
              if (r === v) {
                n || e.close();
                break;
              }
              if (!(await e.put(r))) break;
            }
          })(),
          e
        );
      }
      function F(t, e, n = 0, r = 0) {
        const o = I(n),
          u = I(r);
        return (
          (async function() {
            for (;;) {
              const n = await e.take();
              if (n === v) {
                o.close(), u.close();
                break;
              }
              await (t(n) ? o : u).put(n);
            }
          })(),
          [o, u]
        );
      }
      function N(t, e = 0) {
        const n = I(e),
          r = t.slice();
        return (
          (async function() {
            for (; 0 !== r.length; ) {
              const { value: t, channel: e } = await J(r);
              if (t !== v) await n.put(t);
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
      function z(t, ...e) {
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
        for (const t of r) n.push(I(t));
        const u = I();
        let i = 0;
        function c() {
          0 == --i && u.putAsync();
        }
        return (
          (async function() {
            for (;;) {
              const e = await t.take();
              if (e === v) {
                for (const t of n) t.close();
                break;
              }
              i = n.length;
              for (const t of n) t.putAsync(e, c);
              await u.take();
            }
          })(),
          n
        );
      }
      function U(t, e = I()) {
        return (
          t[L.taps] ||
            (function(t) {
              Object.defineProperty(t, L.taps, {
                configurable: !0,
                writable: !0,
                value: [],
              });
              const e = I();
              let n = 0;
              function r() {
                0 == --n && e.putAsync();
              }
              !(async function() {
                for (;;) {
                  const o = await t.take();
                  if (o === v || 0 === t[L.taps].length) {
                    delete t[L.taps];
                    break;
                  }
                  n = t[L.taps].length;
                  for (const e of t[L.taps]) e.putAsync(o, r);
                  await e.take();
                }
              })();
            })(t),
          ~t[L.taps].indexOf(e) || t[L.taps].push(e),
          e
        );
      }
      function $(t, e) {
        const n = t[L.taps];
        if (n) {
          const r = n.indexOf(e);
          -1 !== r && (n.splice(r, 1), 0 === n.length && t.putAsync());
        }
      }
      function Q(t) {
        t[L.taps] && ((t[L.taps] = []), t.putAsync());
      }
      function B(t, e, n = 0) {
        const r = I(n),
          o = e.length,
          u = [],
          i = [],
          c = I();
        let a;
        for (let t = 0; t < o; ++t)
          i[t] = (t => e => {
            (u[t] = e), 0 == --a && c.putAsync(u.slice());
          })(t);
        return (
          (async function() {
            for (;;) {
              a = o;
              for (let t = 0; t < o; ++t) e[t].takeAsync(i[t]);
              const n = await c.take();
              for (const t of n) if (t === v) return void r.close();
              await r.put(t(...n));
            }
          })(),
          r
        );
      }
      function G(t) {
        return (
          "[object Number]" === Object.prototype.toString.call(t) && isFinite(t)
        );
      }
      function H(t, e, n, r) {
        const o = { leading: !1, trailing: !0, maxDelay: 0, cancel: I() },
          u = G(n) ? e : 0,
          i = G(n) ? n : e,
          c = Object.assign(o, (G(n) ? r : n) || {}),
          a = I(u),
          { leading: s, trailing: f, maxDelay: l, cancel: d } = c;
        return (
          (async function() {
            let e = I(),
              n = I(),
              r = v;
            for (;;) {
              const { value: o, channel: u } = await J([t, e, n, d]);
              if (u === d) {
                a.close();
                break;
              }
              if (u === t) {
                if (o === v) {
                  a.close();
                  break;
                }
                const t = e.timeout;
                (e = I(0, { timeout: i })),
                  !t && l > 0 && (n = I(0, { timeout: l })),
                  s ? (t ? (r = o) : await a.put(o)) : f && (r = o);
              } else
                (e = I()), (n = I()), f && r !== v && (await a.put(r), (r = v));
            }
          })(),
          a
        );
      }
      function Y(t, e, n, r) {
        const o = { leading: !0, trailing: !0, cancel: I() },
          u = G(n) ? e : 0,
          i = G(n) ? n : e,
          c = Object.assign(o, (G(n) ? r : n) || {}),
          a = I(u),
          { leading: s, trailing: f, cancel: l } = c;
        return (
          (async function() {
            let e = I(),
              n = v;
            for (;;) {
              const { value: r, channel: o } = await J([t, e, l]);
              if (o === l) {
                a.close();
                break;
              }
              if (o === t) {
                if (r === v) {
                  a.close();
                  break;
                }
                const t = e.timeout;
                t || (e = I(0, { timeout: i })),
                  s ? (t ? f && (n = r) : await a.put(r)) : f && (n = r);
              } else
                f && n !== v
                  ? ((e = I(0, { timeout: i })), await a.put(n), (n = v))
                  : (e = I());
            }
          })(),
          a
        );
      }
      function R(t, e, n = {}) {
        const r = t.length;
        if (0 === r) throw Error("Alts called with no operations");
        const o = !!n.priority,
          u = o
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
          i = T(!0);
        function c(t) {
          return (function(t, e) {
            return {
              get active() {
                return t.value;
              },
              commit: () => ((t.value = !1), e),
            };
          })(i, n => {
            e({ value: n, channel: t });
          });
        }
        let a;
        for (let n = 0; n < r; ++n) {
          const r = t[o ? n : u[n]];
          let i, s;
          if (
            (Array.isArray(r)
              ? (([i, s] = r), (a = i.handlePut(s, c(i))))
              : ((i = r), (a = i.handleTake(c(i)))),
            O(a))
          ) {
            e({ value: a.value, channel: i });
            break;
          }
        }
        !O(a) &&
          Object.prototype.hasOwnProperty.call(n, "default") &&
          i.value &&
          ((i.value = !1), e({ value: n.default, channel: g }));
      }
      function J(t, e = {}) {
        return new Promise(n => {
          R(t, n, e);
        });
      }
      n.d(e, "Buffer", function() {
        return K;
      }),
        n.d(e, "Channel", function() {
          return V;
        }),
        n.d(e, "EMPTY", function() {
          return o.a;
        }),
        n.d(e, "chan", function() {
          return I;
        }),
        n.d(e, "CLOSED", function() {
          return v;
        }),
        n.d(e, "DEFAULT", function() {
          return g;
        }),
        n.d(e, "sleep", function() {
          return q;
        }),
        n.d(e, "go", function() {
          return M;
        }),
        n.d(e, "config", function() {
          return s.d;
        }),
        n.d(e, "SET_IMMEDIATE", function() {
          return s.b;
        }),
        n.d(e, "MESSAGE_CHANNEL", function() {
          return s.a;
        }),
        n.d(e, "SET_TIMEOUT", function() {
          return s.c;
        });
      const K = { fixed: o.c, sliding: o.f, dropping: o.b },
        V = r;
    },
  ]);
});
