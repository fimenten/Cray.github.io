(() => {
  "use strict";
  var e = {
    d: (t, n) => {
      for (var r in n)
        e.o(n, r) &&
          !e.o(t, r) &&
          Object.defineProperty(t, r, { enumerable: !0, get: n[r] });
    },
    o: (e, t) => Object.prototype.hasOwnProperty.call(e, t),
  };
  e.d({}, { Pi: () => rt, xN: () => ot });
  const t = "trayData";
  function n(e, t) {
    e.labels.includes(t) || e.labels.push(t);
  }
  function r(e, t) {
    const r = document.querySelector(".label-selector");
    null == r || r.remove();
    const o = document.createElement("div");
    o.classList.add("label-selector"),
      (o.innerHTML = `\n    <select id="existingLabels">\n      <option value="">-- Select existing label --</option>\n      ${Object.entries(
        ot.getAllLabels(),
      )
        .map(
          ([e, t]) =>
            `<option value="${e}" style="background-color: ${t};">${e}</option>`,
        )
        .join(
          "",
        )}\n    </select>\n    <button id="selectExistingLabel">Select</button>\n    <div>or</div>\n    <input type="text" id="newLabelName" placeholder="New label name">\n    <input type="color" id="newLabelColor" value="#000000">\n    <button id="addNewLabel">Add new label</button>\n  `);
    const [i, a] = (function (e) {
      return e instanceof MouseEvent
        ? [e.clientX, e.clientY]
        : e instanceof TouchEvent && e.touches.length > 0
          ? [e.touches[0].clientX, e.touches[0].clientY]
          : [0, 0];
    })(t);
    (o.style.position = "fixed"),
      (o.style.top = `${a}px`),
      (o.style.left = `${i}px`),
      document.body.appendChild(o);
    const c = document.getElementById("selectExistingLabel"),
      s = document.getElementById("existingLabels"),
      l = document.getElementById("newLabelName"),
      d = document.getElementById("newLabelColor"),
      u = document.getElementById("addNewLabel");
    c &&
      s &&
      c.addEventListener("click", () => {
        const t = s.value;
        t && (n(e, t), o.remove());
      }),
      u &&
        l &&
        d &&
        u.addEventListener("click", () => {
          const t = l.value,
            r = d.value;
          if (t) {
            const i = (function (e, t, r) {
              ot.addLabel(t, r);
              const o = t;
              return n(e, o), o;
            })(e, t, r);
            n(e, i), o.remove();
          }
        }),
      document.addEventListener(
        "click",
        (e) => {
          const t = e.target;
          o.contains(t) || t.closest(".context-menu") || o.remove();
        },
        { once: !0 },
      );
  }
  function o(e, t) {
    (e.labels = e.labels.filter((e) => e !== t)),
      ot.unregisterLabeledTray(t, e);
  }
  function i(e) {
    let t = "- " + e.name + "\n";
    return (
      e.children.length > 0 &&
        e.children.forEach((e) => {
          t += i(e);
        }),
      t
    );
  }
  function a(e) {
    const t = i(e),
      n = new Blob([t], { type: "text/markdown" }),
      r = URL.createObjectURL(n),
      o = window.open("", "_blank");
    o &&
      o.document.write(
        `\n          <html>\n            <head>\n              <title>Tray Structure as Markdown</title>\n              <style>\n                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }\n                pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }\n                button { margin: 10px 5px; padding: 10px 15px; cursor: pointer; }\n              </style>\n            </head>\n            <body>\n              <h1>Tray Structure as Markdown</h1>\n              <pre>${t}</pre>\n              <button onclick="copyToClipboard()">Copy to Clipboard</button>\n              <button onclick="downloadMarkdown()">Download Markdown</button>\n              <script>\n                function copyToClipboard() {\n                  const pre = document.querySelector('pre');\n                  const textArea = document.createElement('textarea');\n                  textArea.value = pre.textContent;\n                  document.body.appendChild(textArea);\n                  textArea.select();\n                  document.execCommand('copy');\n                  document.body.removeChild(textArea);\n                  alert('Copied to clipboard!');\n                }\n\n                function downloadMarkdown() {\n                  const link = document.createElement('a');\n                  link.href = '${r}';\n                  link.download = 'tray_structure.md';\n                  document.body.appendChild(link);\n                  link.click();\n                  document.body.removeChild(link);\n                }\n              <\/script>\n            </body>\n          </html>\n        `,
      );
  }
  function c(e, t) {
    t.preventDefault(), t.stopPropagation();
    const n = document.querySelector(".context-menu");
    null == n || n.remove();
    const i = e.borderColor || "#f5f5f5",
      c = document.createElement("div");
    c.classList.add("context-menu"),
      c.setAttribute("tabindex", "-1"),
      (c.innerHTML = `\n      <div class="menu-item" data-action="fetchTrayFromServer" tabindex="0">Fetch Tray from Server</div>\n      <div class="menu-item" data-action="networkSetting" tabindex="1">networkSetting</div>\n      <div class="menu-item" data-action="open_this_in_other" tabindex="2">Open This in Other</div>\n      <div class="menu-item" data-action="toggleFlexDirection" tabindex="3">Toggle Flex Direction</div>\n      <div class="menu-item" data-action="meltTray" tabindex="0">Melt this tray</div>\n      <div class="menu-item" data-action="expandAll" tabindex="0">Expand All</div>\n\n      <div class="menu-item" data-action="copy" tabindex="0">Copy</div>\n      <div class="menu-item" data-action="paste" tabindex="0">Paste</div>\n      <div class="menu-item" data-action="cut" tabindex="0">Cut</div>\n      <div class="menu-item" data-action="delete" tabindex="0">Remove</div>\n      <div class="menu-item" data-action="add_fetch_networkTray_to_child" tabindex="0">Add Fetch NetworkTray to Child</div>\n      <div class="menu-item" data-action="add_child_from_localStorage" tabindex="0">Add Child from Local Storage</div>\n      <div class="menu-item" data-action="addLabelTray" tabindex="0">Add Label Tray</div>\n      <div class="menu-item" data-action="addLabel" tabindex="0">Add Label</div>\n      <div class="menu-item" data-action="removeLabel" tabindex="0">Edit Labels</div>\n      <div class="menu-item" data-action="outputMarkdown" tabindex="0">Output as Markdown</div>\n      <div class="menu-item" data-action="addTemplateTray" tabindex="0">Add Template Tray</div>\n      <div class="menu-item" tabindex="0">\n        <input type="color" id="borderColorPicker" value="${i}">\n      </div>\n    `),
      document.body.appendChild(c),
      (function (e, t) {
        const n = window.innerWidth,
          r = window.innerHeight;
        let o, i;
        e instanceof MouseEvent
          ? ((o = e.clientX), (i = e.clientY))
          : e instanceof TouchEvent && e.touches.length > 0
            ? ((o = e.touches[0].clientX), (i = e.touches[0].clientY))
            : ((o = 0), (i = 0)),
          (t.style.visibility = "hidden"),
          (t.style.display = "block"),
          (t.style.position = "absolute"),
          setTimeout(() => {
            const e = t.offsetWidth,
              a = t.offsetHeight;
            (o = o > n / 2 ? o - e : o),
              (i = i > r / 2 ? i - a : i),
              (o = Math.max(0, Math.min(o, n - e))),
              (i = Math.max(0, Math.min(i, r - a))),
              (t.style.left = `${o}px`),
              (t.style.top = `${i}px`),
              (t.style.visibility = "visible");
          }, 0);
      })(t, c);
    const h = c.querySelectorAll(".menu-item");
    let y = 0;
    document.addEventListener(
      "keydown",
      ((e) => {
        "ArrowDown" === e.key || "ArrowUp" === e.key
          ? (h[y].classList.remove("focused"),
            (y =
              "ArrowDown" === e.key
                ? (y + 1) % h.length
                : (y - 1 + h.length) % h.length),
            h[y].classList.add("focused"),
            h[y].focus())
          : "Enter" === e.key
            ? h[y].click()
            : "Escape" === e.key && c.remove();
      }).bind(e),
    ),
      h[0].classList.add("focused"),
      h[0].focus(),
      c.querySelector("#borderColorPicker").addEventListener("change", (t) => {
        const n = t.target;
        (e.borderColor = n.value),
          e.changeBorderColor(n.value),
          e.updateAppearance(),
          c.remove();
      });
    const m = (e) => {
      c.contains(e.target) ||
        (c.remove(), document.removeEventListener("click", m));
    };
    c.addEventListener("click", (n) => {
      const i = n.target.getAttribute("data-action");
      i &&
        (function (e, t, n, i) {
          switch (t) {
            case "copy":
              s(e);
              break;
            case "rename":
              !(function (e) {
                const t = e.element.querySelector(".tray-title");
                t && (t.setAttribute("contenteditable", "true"), _());
              })(e);
              break;
            case "cut":
              l(e);
              break;
            case "paste":
              d(e), _();
              break;
            case "addLabel":
              r(e, n);
              break;
            case "removeLabel":
              !(function (e) {
                const t = document.createElement("div");
                t.classList.add("label-remover"),
                  (t.innerHTML = `\n    <h3>Select labels to remove:</h3>\n    ${e.labels.map((e) => `\n        <div>\n          <input type="checkbox" id="${e}" value="${e}">\n          <label for="${e}">${e}</label>\n        </div>\n      `).join("")}\n    <button id="removeLabelBtn">Remove Selected Labels</button>\n  `),
                  document.body.appendChild(t);
                const n = document.getElementById("removeLabelBtn");
                n &&
                  n.addEventListener("click", () => {
                    t
                      .querySelectorAll('input[type="checkbox"]:checked')
                      .forEach((t) => {
                        o(e, t.value);
                      }),
                      t.remove();
                  });
              })(e);
              break;
            case "delete":
              u(e);
              break;
            case "toggleFlexDirection":
              e.toggleFlexDirection();
              break;
            case "networkSetting":
              !(function (e) {
                const t = prompt(
                    "ホストURLを入力してください (空欄の場合、nullになります):",
                    e.host_url || "",
                  ),
                  n = prompt(
                    "ファイル名を入力してください (空欄の場合、nullになります):",
                    e.filename || "",
                  );
                (e.host_url = t ? ("" === t.trim() ? null : t) : null),
                  (e.filename = n ? ("" === n.trim() ? null : n) : null);
              })(e),
                _();
              break;
            case "meltTray":
              !(function (e) {
                const t = Ge(e.parentId);
                e.children.map((e) => {
                  t.addChild(e);
                });
              })(e),
                _();
              break;
            case "expandAll":
              p(e);
              break;
            case "fetchTrayFromServer":
              !(function (e) {
                const t = localStorage.getItem("defaultServer") || "",
                  n = prompt("Enter server URL:", t);
                n &&
                  fetch(`${n}/tray/list`, { method: "GET" })
                    .then((e) => {
                      if (!e.ok) throw new Error("Network response was not ok");
                      return e.json();
                    })
                    .then((t) => {
                      !(function (e, t, n) {
                        const r = document.createElement("div");
                        r.classList.add("tray-selection-dialog"),
                          (r.innerHTML = `\n        <h3>Select a tray to add:</h3>\n        <select id="tray-select">\n          ${n.map((e) => `<option value="${e}">${e}</option>`).join("")}\n        </select>\n        <button id="add-tray-btn">Add Tray</button>\n        <button id="cancel-btn">Cancel</button>\n      `),
                          document.body.appendChild(r);
                        const o = document.getElementById("add-tray-btn"),
                          i = document.getElementById("cancel-btn"),
                          a = document.getElementById("tray-select");
                        o.addEventListener("click", () => {
                          const n = a.value;
                          !(function (e, t, n) {
                            f(this, void 0, void 0, function* () {
                              try {
                                const r = yield fetch(`${t}/tray/load`, {
                                  method: "GET",
                                  headers: { filename: n },
                                });
                                if (!r.ok)
                                  throw new Error(
                                    "Network response was not ok",
                                  );
                                const o = yield r.json();
                                e.addChild(S(JSON.stringify(o)));
                              } catch (e) {
                                console.error("Error:", e),
                                  alert("Failed to add tray from server.");
                              }
                            });
                          })(e, t, n),
                            r.remove();
                        }),
                          i.addEventListener("click", () => {
                            r.remove();
                          });
                      })(e, n, t.files);
                    })
                    .catch((e) => {
                      console.error("Error:", e),
                        alert("Failed to fetch tray list from server.");
                    });
              })(e);
              break;
            case "outputMarkdown":
              a(e);
          }
          i.remove();
        })(e, i, t, c);
    }),
      document.addEventListener("click", m);
  }
  function s(e) {
    const t = C(nt(e));
    navigator.clipboard.writeText(t);
  }
  function l(e) {
    const t = C(nt(e));
    navigator.clipboard.writeText(t);
  }
  function d(e) {
    navigator.clipboard.readText().then((t) => {
      try {
        let n = S(t);
        if (!n) return;
        e.addChild(n);
      } catch (n) {
        t.split("\n")
          .filter((e) => "" !== e.trim())
          .map((t) => new Ve(e.id, tt(), t))
          .map((t) => e.addChild(t));
      }
    });
  }
  function u(e) {
    const t = Ge(e.parentId),
      n = t.children.findIndex((t) => t.id === e.id);
    t.removeChild(e.id), e.element.remove(), e.moveFocusAfterDelete(t, n), _();
  }
  function p(e) {
    (e.isFolded = !1), e.children.map((e) => p(e)), e.updateAppearance();
  }
  var f = function (e, t, n, r) {
    return new (n || (n = Promise))(function (o, i) {
      function a(e) {
        try {
          s(r.next(e));
        } catch (e) {
          i(e);
        }
      }
      function c(e) {
        try {
          s(r.throw(e));
        } catch (e) {
          i(e);
        }
      }
      function s(e) {
        var t;
        e.done
          ? o(e.value)
          : ((t = e.value),
            t instanceof n
              ? t
              : new n(function (e) {
                  e(t);
                })).then(a, c);
      }
      s((r = r.apply(e, t || [])).next());
    });
  };
  function h(e) {
    return f(this, void 0, void 0, function* () {
      const t = JSON.parse(C(e));
      if (e.filename && e.host_url)
        try {
          const n = yield fetch(`${e.host_url}/tray/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              filename: e.filename,
            },
            body: JSON.stringify({ data: t }),
          });
          if (!n.ok) throw new Error("Network response was not ok");
          const r = yield n.text();
          console.log(r), m("Data uploaded successfully.");
        } catch (e) {
          throw (
            (console.error("Error:", e), m("Failed to upload data.", !0), e)
          );
        }
    });
  }
  function y(e) {
    return f(this, void 0, void 0, function* () {
      if (e.filename && e.host_url)
        try {
          const t = yield fetch(`${e.host_url}/tray/load`, {
            method: "GET",
            headers: { filename: e.filename },
          });
          if (!t.ok) throw new Error("Network response was not ok");
          return S(yield t.json());
        } catch (e) {
          throw (
            (console.error("Error:", e),
            m("データのダウンロードに失敗しました。"),
            e)
          );
        }
    });
  }
  function m(e, t = !1) {
    const n = document.createElement("div");
    (n.textContent = e),
      (n.style.position = "fixed"),
      (n.style.bottom = "20px"),
      (n.style.right = "20px"),
      (n.style.padding = "10px"),
      (n.style.borderRadius = "5px"),
      (n.style.color = "white"),
      (n.style.backgroundColor = t ? "red" : "green"),
      (n.style.zIndex = "1000"),
      document.body.appendChild(n),
      setTimeout(() => {
        (n.style.transition = "opacity 0.5s"),
          (n.style.opacity = "0"),
          setTimeout(() => {
            document.body.removeChild(n);
          }, 500);
      }, 3e3);
  }
  let b = [];
  function v() {
    const e = document.createElement("div");
    e.classList.add("left-bar"), document.body.appendChild(e);
    const n = document.createElement("div");
    n.classList.add("hamburger-menu"), (n.innerHTML = "☰"), e.appendChild(n);
    const r = document.createElement("div");
    r.classList.add("hamburger-menu-items"),
      (r.style.display = "none"),
      e.appendChild(r),
      (r.style.position = "fixed"),
      (r.innerHTML =
        '\n        <div class="menu-item" data-action="reset">トレイをリセット</div>\n        <div class="menu-item" data-action="save">現在の状態を保存</div>\n        <div class="menu-item" data-action="load">保存した状態を読み込む</div>\n        <div class="menu-item" data-action="export">データのエクスポート</div>\n        <div class="menu-item" data-action="import">データのインポート</div>\n        <div class="menu-item" data-action="set_default_server">set_default_server</div>\n        <div class="menu-item" data-action="set_secret">set_secret</div>\n        <div class="menu-item" data-action="import_network_tray_directly_as_root">import_network_tray_directly_as_root</div>\n    \n    \n      '),
      (r.innerHTML +=
        '\n      <div class="menu-item" data-action="manageLabels">ラベル管理</div>\n      <div class="menu-item" data-action="exportLabels">ラベルをエクスポート</div>\n      <div class="menu-item" data-action="importLabels">ラベルをインポート</div>\n    '),
      (r.innerHTML +=
        '\n      <div class="menu-item" data-action="editTitle">ページタイトルを編集</div>\n    '),
      (r.innerHTML +=
        '\n      <div class="menu-item" data-action="uploadAll">Upload All</div>\n    '),
      (r.innerHTML +=
        '\n      <div class="menu-item" data-action="downloadAll">Download All</div>\n    '),
      (r.innerHTML +=
        '\n    <div class="menu-item" data-action="copySelected">Copy selected</div>\n    <div class="menu-item" data-action="cutSelected">Cut selected</div>\n\n  '),
      document.body.appendChild(r);
    const o = r.querySelectorAll(".menu-item");
    return (
      o.forEach((e) => {
        (e.style.padding = "5px 10px"),
          (e.style.cursor = "pointer"),
          (e.style.transition = "background-color 0.3s");
      }),
      n.addEventListener("click", (t) => {
        if (
          ((r.style.display = "none" === r.style.display ? "block" : "none"),
          "block" === r.style.display)
        ) {
          const t = e.getBoundingClientRect();
          (r.style.left = `${t.right}px`), (r.style.top = `${t.top}px`);
        }
        t.stopPropagation();
      }),
      document.addEventListener("click", (e) => {
        const t = e.target;
        r.contains(t) || t === n || (r.style.display = "none");
      }),
      r.addEventListener("click", (e) => {
        switch (e.target.getAttribute("data-action")) {
          case "reset":
            confirm(
              "すべてのトレイをリセットしますか？この操作は元に戻せません。",
            ) &&
              (function () {
                localStorage.removeItem("trayData");
                const e = et();
                (document.body.innerHTML = ""),
                  document.body.appendChild(e.element),
                  v();
              })();
            break;
          case "export":
            !(function () {
              const e = localStorage.getItem(t);
              if (!e) return void console.error("No data found to export.");
              const n = new Blob([e], { type: "application/json" }),
                r = URL.createObjectURL(n),
                o = document.createElement("a");
              (o.href = r),
                (o.download = "tray_data.json"),
                o.click(),
                URL.revokeObjectURL(r);
            })();
            break;
          case "import":
            !(function () {
              const e = document.createElement("input");
              (e.type = "file"),
                (e.accept = ".json"),
                (e.onchange = (e) => {
                  const n = e.target,
                    r = n.files ? n.files[0] : null;
                  if (!r) return;
                  const o = new FileReader();
                  (o.onload = (e) => {
                    var n;
                    try {
                      const r =
                        null === (n = e.target) || void 0 === n
                          ? void 0
                          : n.result;
                      return JSON.parse(r), _("imported", r), void _(t, r);
                    } catch (e) {
                      return (
                        console.error("Invalid JSON file:", e),
                        void alert("無効なJSONファイルです。")
                      );
                    }
                  }),
                    o.readAsText(r, "UTF-8");
                }),
                e.click();
            })();
            break;
          case "set_default_server":
            !(function () {
              let e = localStorage.getItem("defaultServer");
              (e = prompt("set default URL", e || "")),
                e && localStorage.setItem("defaultServer", e);
            })();
            break;
          case "editTitle":
            !(function () {
              const e = document.title,
                t = prompt("新しいページタイトルを入力してください:", e);
              if (null !== t && "" !== t.trim()) {
                document.title = t.trim();
                const e = Qe("sessionId");
                e &&
                  (localStorage.setItem(e + "_title", t.trim()),
                  alert("ページタイトルを更新しました。"));
              }
            })();
            break;
          case "uploadAll":
            g();
            break;
          case "downloadAll":
            w();
            break;
          case "cutSelected":
            !(function () {
              if (0 !== b.length) {
                const e = new Ve(tt(), tt(), "selected Trays");
                b.map((t) => e.children.push(nt(t))),
                  s(e),
                  b.map((e) => u(e)),
                  (b = []),
                  document.querySelectorAll(".tray-checkbox").forEach((e) => {
                    e.checked = !1;
                  });
              }
            })();
            break;
          case "copySelected":
            !(function () {
              if (0 !== b.length) {
                const e = new Ve(tt(), tt(), "selected Trays");
                b.map((t) => e.children.push(nt(t))),
                  s(e),
                  (b = []),
                  document.querySelectorAll(".tray-checkbox").forEach((e) => {
                    e.checked = !1;
                  });
              }
            })();
        }
        r.style.display = "none";
      }),
      o.forEach((e) => {
        e.addEventListener("mouseover", () => {
          e.style.backgroundColor = "#f0f0f0";
        }),
          e.addEventListener("mouseout", () => {
            e.style.backgroundColor = "transparent";
          });
      }),
      { hamburger: n, menu: r, leftBar: e }
    );
  }
  function g(e = null) {
    e || (e = rt.get(Ze())),
      e.host_url && h(e),
      e.children.length && e.children.map((e) => g(e));
  }
  function w(e = null) {
    e || (e = rt.get(Ze())),
      e.host_url && y(e),
      e.children.length && e.children.map((e) => w(e));
  }
  function _(e = null, n = null) {
    const r = indexedDB.open("TrayDatabase", 1);
    let o;
    (r.onupgradeneeded = (e) => {
      (o = r.result),
        o.objectStoreNames.contains("trays") ||
          o.createObjectStore("trays", { keyPath: "id" });
    }),
      (r.onsuccess = () => {
        o = r.result;
        const i = Qe("sessionId"),
          a = Ze();
        if (!a) return void console.error("Root element not found");
        const c = rt.get(a),
          s = n || C(c);
        if (!s) return void console.log("serialize failed");
        let l;
        l = e || i || t;
        const d = o
          .transaction("trays", "readwrite")
          .objectStore("trays")
          .put({ id: l, value: s });
        (d.onsuccess = () => {
          console.log(l), console.log("Data saved successfully");
        }),
          (d.onerror = (e) => {
            console.error("Error saving to IndexedDB:", d.error);
          });
      });
  }
  function E() {
    return (
      (e = this),
      (n = arguments),
      (o = function* (e = t) {
        try {
          const t = yield new Promise((e, t) => {
              const n = indexedDB.open("TrayDatabase", 1);
              (n.onupgradeneeded = (e) => {
                const t = n.result;
                t.objectStoreNames.contains("trays") ||
                  t.createObjectStore("trays", { keyPath: "id" });
              }),
                (n.onsuccess = () => {
                  e(n.result);
                }),
                (n.onerror = () => {
                  t(n.error);
                });
            }),
            n = yield (function (e, t) {
              return new Promise((n, r) => {
                const o = e
                  .transaction("trays", "readonly")
                  .objectStore("trays")
                  .get(t);
                (o.onsuccess = () => {
                  n(o.result);
                }),
                  (o.onerror = () => {
                    r(o.error);
                  });
              });
            })(t, e);
          let r;
          if (n)
            try {
              r = S(n.value);
            } catch (e) {
              console.error("Error deserializing data:", e), (r = et());
            }
          else r = et();
          x(r);
        } catch (e) {
          console.error("Error loading from IndexedDB:", e), x(et());
        }
      }),
      new ((r = void 0) || (r = Promise))(function (t, i) {
        function a(e) {
          try {
            s(o.next(e));
          } catch (e) {
            i(e);
          }
        }
        function c(e) {
          try {
            s(o.throw(e));
          } catch (e) {
            i(e);
          }
        }
        function s(e) {
          var n;
          e.done
            ? t(e.value)
            : ((n = e.value),
              n instanceof r
                ? n
                : new r(function (e) {
                    e(n);
                  })).then(a, c);
        }
        s((o = o.apply(e, n || [])).next());
      })
    );
    var e, n, r, o;
  }
  function x(e) {
    (document.body.innerHTML = ""), document.body.appendChild(e.element), v();
  }
  function C(e) {
    return JSON.stringify(e);
  }
  function k(e) {
    let t;
    console.log("help"), (t = e.host_url ? e.host_url : e.url);
    let n = new Ve(
        e.parentId,
        e.id,
        e.name,
        e.borderColor,
        e.labels,
        e.created_dt,
        e.flexDirection,
        t,
        e.filename,
        !(e.isFolded instanceof Boolean) || e.isFolded,
      ),
      r = e.children;
    return (
      r.length > 0 &&
        r
          .map((e) => k(e))
          .sort(
            (e, t) =>
              new Date(e.created_dt).getTime() -
              new Date(t.created_dt).getTime(),
          )
          .map((e) => n.addChild(e)),
      n
    );
  }
  function S(e) {
    return k(JSON.parse(e));
  }
  function L(e) {
    return `Minified Redux error #${e}; visit https://redux.js.org/Errors?code=${e} for the full message or use the non-minified dev environment for full errors. `;
  }
  var T = (() =>
      ("function" == typeof Symbol && Symbol.observable) || "@@observable")(),
    D = () => Math.random().toString(36).substring(7).split("").join("."),
    O = {
      INIT: `@@redux/INIT${D()}`,
      REPLACE: `@@redux/REPLACE${D()}`,
      PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${D()}`,
    };
  function A(e) {
    if ("object" != typeof e || null === e) return !1;
    let t = e;
    for (; null !== Object.getPrototypeOf(t); ) t = Object.getPrototypeOf(t);
    return Object.getPrototypeOf(e) === t || null === Object.getPrototypeOf(e);
  }
  function N(e, t, n) {
    if ("function" != typeof e) throw new Error(L(2));
    if (
      ("function" == typeof t && "function" == typeof n) ||
      ("function" == typeof n && "function" == typeof arguments[3])
    )
      throw new Error(L(0));
    if (
      ("function" == typeof t && void 0 === n && ((n = t), (t = void 0)),
      void 0 !== n)
    ) {
      if ("function" != typeof n) throw new Error(L(1));
      return n(N)(e, t);
    }
    let r = e,
      o = t,
      i = new Map(),
      a = i,
      c = 0,
      s = !1;
    function l() {
      a === i &&
        ((a = new Map()),
        i.forEach((e, t) => {
          a.set(t, e);
        }));
    }
    function d() {
      if (s) throw new Error(L(3));
      return o;
    }
    function u(e) {
      if ("function" != typeof e) throw new Error(L(4));
      if (s) throw new Error(L(5));
      let t = !0;
      l();
      const n = c++;
      return (
        a.set(n, e),
        function () {
          if (t) {
            if (s) throw new Error(L(6));
            (t = !1), l(), a.delete(n), (i = null);
          }
        }
      );
    }
    function p(e) {
      if (!A(e)) throw new Error(L(7));
      if (void 0 === e.type) throw new Error(L(8));
      if ("string" != typeof e.type) throw new Error(L(17));
      if (s) throw new Error(L(9));
      try {
        (s = !0), (o = r(o, e));
      } finally {
        s = !1;
      }
      return (
        (i = a).forEach((e) => {
          e();
        }),
        e
      );
    }
    return (
      p({ type: O.INIT }),
      {
        dispatch: p,
        subscribe: u,
        getState: d,
        replaceReducer: function (e) {
          if ("function" != typeof e) throw new Error(L(10));
          (r = e), p({ type: O.REPLACE });
        },
        [T]: function () {
          const e = u;
          return {
            subscribe(t) {
              if ("object" != typeof t || null === t) throw new Error(L(11));
              function n() {
                const e = t;
                e.next && e.next(d());
              }
              return n(), { unsubscribe: e(n) };
            },
            [T]() {
              return this;
            },
          };
        },
      }
    );
  }
  function P(...e) {
    return 0 === e.length
      ? (e) => e
      : 1 === e.length
        ? e[0]
        : e.reduce(
            (e, t) =>
              (...n) =>
                e(t(...n)),
          );
  }
  function M(e) {
    return ({ dispatch: t, getState: n }) =>
      (r) =>
      (o) =>
        "function" == typeof o ? o(t, n, e) : r(o);
  }
  var F = M(),
    I = M,
    j = Symbol.for("immer-nothing"),
    R = Symbol.for("immer-draftable"),
    B = Symbol.for("immer-state");
  function $(e, ...t) {
    throw new Error(
      `[Immer] minified error nr: ${e}. Full error at: https://bit.ly/3cXEKWf`,
    );
  }
  var z = Object.getPrototypeOf;
  function U(e) {
    return !!e && !!e[B];
  }
  function q(e) {
    return (
      !!e &&
      (H(e) ||
        Array.isArray(e) ||
        !!e[R] ||
        !!e.constructor?.[R] ||
        V(e) ||
        G(e))
    );
  }
  var K = Object.prototype.constructor.toString();
  function H(e) {
    if (!e || "object" != typeof e) return !1;
    const t = z(e);
    if (null === t) return !0;
    const n = Object.hasOwnProperty.call(t, "constructor") && t.constructor;
    return (
      n === Object ||
      ("function" == typeof n && Function.toString.call(n) === K)
    );
  }
  function W(e, t) {
    0 === J(e)
      ? Reflect.ownKeys(e).forEach((n) => {
          t(n, e[n], e);
        })
      : e.forEach((n, r) => t(r, n, e));
  }
  function J(e) {
    const t = e[B];
    return t ? t.type_ : Array.isArray(e) ? 1 : V(e) ? 2 : G(e) ? 3 : 0;
  }
  function X(e, t) {
    return 2 === J(e) ? e.has(t) : Object.prototype.hasOwnProperty.call(e, t);
  }
  function Y(e, t, n) {
    const r = J(e);
    2 === r ? e.set(t, n) : 3 === r ? e.add(n) : (e[t] = n);
  }
  function V(e) {
    return e instanceof Map;
  }
  function G(e) {
    return e instanceof Set;
  }
  function Q(e) {
    return e.copy_ || e.base_;
  }
  function Z(e, t) {
    if (V(e)) return new Map(e);
    if (G(e)) return new Set(e);
    if (Array.isArray(e)) return Array.prototype.slice.call(e);
    const n = H(e);
    if (!0 === t || ("class_only" === t && !n)) {
      const t = Object.getOwnPropertyDescriptors(e);
      delete t[B];
      let n = Reflect.ownKeys(t);
      for (let r = 0; r < n.length; r++) {
        const o = n[r],
          i = t[o];
        !1 === i.writable && ((i.writable = !0), (i.configurable = !0)),
          (i.get || i.set) &&
            (t[o] = {
              configurable: !0,
              writable: !0,
              enumerable: i.enumerable,
              value: e[o],
            });
      }
      return Object.create(z(e), t);
    }
    {
      const t = z(e);
      if (null !== t && n) return { ...e };
      const r = Object.create(t);
      return Object.assign(r, e);
    }
  }
  function ee(e, t = !1) {
    return (
      ne(e) ||
        U(e) ||
        !q(e) ||
        (J(e) > 1 && (e.set = e.add = e.clear = e.delete = te),
        Object.freeze(e),
        t && Object.entries(e).forEach(([e, t]) => ee(t, !0))),
      e
    );
  }
  function te() {
    $(2);
  }
  function ne(e) {
    return Object.isFrozen(e);
  }
  var re,
    oe = {};
  function ie(e) {
    const t = oe[e];
    return t || $(0), t;
  }
  function ae() {
    return re;
  }
  function ce(e, t) {
    t &&
      (ie("Patches"),
      (e.patches_ = []),
      (e.inversePatches_ = []),
      (e.patchListener_ = t));
  }
  function se(e) {
    le(e), e.drafts_.forEach(ue), (e.drafts_ = null);
  }
  function le(e) {
    e === re && (re = e.parent_);
  }
  function de(e) {
    return (re = {
      drafts_: [],
      parent_: re,
      immer_: e,
      canAutoFreeze_: !0,
      unfinalizedDrafts_: 0,
    });
  }
  function ue(e) {
    const t = e[B];
    0 === t.type_ || 1 === t.type_ ? t.revoke_() : (t.revoked_ = !0);
  }
  function pe(e, t) {
    t.unfinalizedDrafts_ = t.drafts_.length;
    const n = t.drafts_[0];
    return (
      void 0 !== e && e !== n
        ? (n[B].modified_ && (se(t), $(4)),
          q(e) && ((e = fe(t, e)), t.parent_ || ye(t, e)),
          t.patches_ &&
            ie("Patches").generateReplacementPatches_(
              n[B].base_,
              e,
              t.patches_,
              t.inversePatches_,
            ))
        : (e = fe(t, n, [])),
      se(t),
      t.patches_ && t.patchListener_(t.patches_, t.inversePatches_),
      e !== j ? e : void 0
    );
  }
  function fe(e, t, n) {
    if (ne(t)) return t;
    const r = t[B];
    if (!r) return W(t, (o, i) => he(e, r, t, o, i, n)), t;
    if (r.scope_ !== e) return t;
    if (!r.modified_) return ye(e, r.base_, !0), r.base_;
    if (!r.finalized_) {
      (r.finalized_ = !0), r.scope_.unfinalizedDrafts_--;
      const t = r.copy_;
      let o = t,
        i = !1;
      3 === r.type_ && ((o = new Set(t)), t.clear(), (i = !0)),
        W(o, (o, a) => he(e, r, t, o, a, n, i)),
        ye(e, t, !1),
        n &&
          e.patches_ &&
          ie("Patches").generatePatches_(r, n, e.patches_, e.inversePatches_);
    }
    return r.copy_;
  }
  function he(e, t, n, r, o, i, a) {
    if (U(o)) {
      const a = fe(
        e,
        o,
        i && t && 3 !== t.type_ && !X(t.assigned_, r) ? i.concat(r) : void 0,
      );
      if ((Y(n, r, a), !U(a))) return;
      e.canAutoFreeze_ = !1;
    } else a && n.add(o);
    if (q(o) && !ne(o)) {
      if (!e.immer_.autoFreeze_ && e.unfinalizedDrafts_ < 1) return;
      fe(e, o),
        (t && t.scope_.parent_) ||
          "symbol" == typeof r ||
          !Object.prototype.propertyIsEnumerable.call(n, r) ||
          ye(e, o);
    }
  }
  function ye(e, t, n = !1) {
    !e.parent_ && e.immer_.autoFreeze_ && e.canAutoFreeze_ && ee(t, n);
  }
  var me = {
      get(e, t) {
        if (t === B) return e;
        const n = Q(e);
        if (!X(n, t))
          return (function (e, t, n) {
            const r = ge(t, n);
            return r
              ? "value" in r
                ? r.value
                : r.get?.call(e.draft_)
              : void 0;
          })(e, n, t);
        const r = n[t];
        return e.finalized_ || !q(r)
          ? r
          : r === ve(e.base_, t)
            ? (_e(e), (e.copy_[t] = Ee(r, e)))
            : r;
      },
      has: (e, t) => t in Q(e),
      ownKeys: (e) => Reflect.ownKeys(Q(e)),
      set(e, t, n) {
        const r = ge(Q(e), t);
        if (r?.set) return r.set.call(e.draft_, n), !0;
        if (!e.modified_) {
          const r = ve(Q(e), t),
            a = r?.[B];
          if (a && a.base_ === n)
            return (e.copy_[t] = n), (e.assigned_[t] = !1), !0;
          if (
            ((o = n) === (i = r)
              ? 0 !== o || 1 / o == 1 / i
              : o != o && i != i) &&
            (void 0 !== n || X(e.base_, t))
          )
            return !0;
          _e(e), we(e);
        }
        var o, i;
        return (
          (e.copy_[t] === n && (void 0 !== n || t in e.copy_)) ||
            (Number.isNaN(n) && Number.isNaN(e.copy_[t])) ||
            ((e.copy_[t] = n), (e.assigned_[t] = !0)),
          !0
        );
      },
      deleteProperty: (e, t) => (
        void 0 !== ve(e.base_, t) || t in e.base_
          ? ((e.assigned_[t] = !1), _e(e), we(e))
          : delete e.assigned_[t],
        e.copy_ && delete e.copy_[t],
        !0
      ),
      getOwnPropertyDescriptor(e, t) {
        const n = Q(e),
          r = Reflect.getOwnPropertyDescriptor(n, t);
        return r
          ? {
              writable: !0,
              configurable: 1 !== e.type_ || "length" !== t,
              enumerable: r.enumerable,
              value: n[t],
            }
          : r;
      },
      defineProperty() {
        $(11);
      },
      getPrototypeOf: (e) => z(e.base_),
      setPrototypeOf() {
        $(12);
      },
    },
    be = {};
  function ve(e, t) {
    const n = e[B];
    return (n ? Q(n) : e)[t];
  }
  function ge(e, t) {
    if (!(t in e)) return;
    let n = z(e);
    for (; n; ) {
      const e = Object.getOwnPropertyDescriptor(n, t);
      if (e) return e;
      n = z(n);
    }
  }
  function we(e) {
    e.modified_ || ((e.modified_ = !0), e.parent_ && we(e.parent_));
  }
  function _e(e) {
    e.copy_ || (e.copy_ = Z(e.base_, e.scope_.immer_.useStrictShallowCopy_));
  }
  function Ee(e, t) {
    const n = V(e)
      ? ie("MapSet").proxyMap_(e, t)
      : G(e)
        ? ie("MapSet").proxySet_(e, t)
        : (function (e, t) {
            const n = Array.isArray(e),
              r = {
                type_: n ? 1 : 0,
                scope_: t ? t.scope_ : ae(),
                modified_: !1,
                finalized_: !1,
                assigned_: {},
                parent_: t,
                base_: e,
                draft_: null,
                copy_: null,
                revoke_: null,
                isManual_: !1,
              };
            let o = r,
              i = me;
            n && ((o = [r]), (i = be));
            const { revoke: a, proxy: c } = Proxy.revocable(o, i);
            return (r.draft_ = c), (r.revoke_ = a), c;
          })(e, t);
    return (t ? t.scope_ : ae()).drafts_.push(n), n;
  }
  function xe(e) {
    if (!q(e) || ne(e)) return e;
    const t = e[B];
    let n;
    if (t) {
      if (!t.modified_) return t.base_;
      (t.finalized_ = !0), (n = Z(e, t.scope_.immer_.useStrictShallowCopy_));
    } else n = Z(e, !0);
    return (
      W(n, (e, t) => {
        Y(n, e, xe(t));
      }),
      t && (t.finalized_ = !1),
      n
    );
  }
  W(me, (e, t) => {
    be[e] = function () {
      return (arguments[0] = arguments[0][0]), t.apply(this, arguments);
    };
  }),
    (be.deleteProperty = function (e, t) {
      return be.set.call(this, e, t, void 0);
    }),
    (be.set = function (e, t, n) {
      return me.set.call(this, e[0], t, n, e[0]);
    });
  var Ce = new (class {
      constructor(e) {
        (this.autoFreeze_ = !0),
          (this.useStrictShallowCopy_ = !1),
          (this.produce = (e, t, n) => {
            if ("function" == typeof e && "function" != typeof t) {
              const n = t;
              t = e;
              const r = this;
              return function (e = n, ...o) {
                return r.produce(e, (e) => t.call(this, e, ...o));
              };
            }
            let r;
            if (
              ("function" != typeof t && $(6),
              void 0 !== n && "function" != typeof n && $(7),
              q(e))
            ) {
              const o = de(this),
                i = Ee(e, void 0);
              let a = !0;
              try {
                (r = t(i)), (a = !1);
              } finally {
                a ? se(o) : le(o);
              }
              return ce(o, n), pe(r, o);
            }
            if (!e || "object" != typeof e) {
              if (
                ((r = t(e)),
                void 0 === r && (r = e),
                r === j && (r = void 0),
                this.autoFreeze_ && ee(r, !0),
                n)
              ) {
                const t = [],
                  o = [];
                ie("Patches").generateReplacementPatches_(e, r, t, o), n(t, o);
              }
              return r;
            }
            $(1);
          }),
          (this.produceWithPatches = (e, t) => {
            if ("function" == typeof e)
              return (t, ...n) => this.produceWithPatches(t, (t) => e(t, ...n));
            let n, r;
            return [
              this.produce(e, t, (e, t) => {
                (n = e), (r = t);
              }),
              n,
              r,
            ];
          }),
          "boolean" == typeof e?.autoFreeze && this.setAutoFreeze(e.autoFreeze),
          "boolean" == typeof e?.useStrictShallowCopy &&
            this.setUseStrictShallowCopy(e.useStrictShallowCopy);
      }
      createDraft(e) {
        var t;
        q(e) || $(8), U(e) && (U((t = e)) || $(10), (e = xe(t)));
        const n = de(this),
          r = Ee(e, void 0);
        return (r[B].isManual_ = !0), le(n), r;
      }
      finishDraft(e, t) {
        const n = e && e[B];
        (n && n.isManual_) || $(9);
        const { scope_: r } = n;
        return ce(r, t), pe(void 0, r);
      }
      setAutoFreeze(e) {
        this.autoFreeze_ = e;
      }
      setUseStrictShallowCopy(e) {
        this.useStrictShallowCopy_ = e;
      }
      applyPatches(e, t) {
        let n;
        for (n = t.length - 1; n >= 0; n--) {
          const r = t[n];
          if (0 === r.path.length && "replace" === r.op) {
            e = r.value;
            break;
          }
        }
        n > -1 && (t = t.slice(n + 1));
        const r = ie("Patches").applyPatches_;
        return U(e) ? r(e, t) : this.produce(e, (e) => r(e, t));
      }
    })(),
    ke = Ce.produce;
  Ce.produceWithPatches.bind(Ce),
    Ce.setAutoFreeze.bind(Ce),
    Ce.setUseStrictShallowCopy.bind(Ce),
    Ce.applyPatches.bind(Ce),
    Ce.createDraft.bind(Ce),
    Ce.finishDraft.bind(Ce);
  var Se =
    "undefined" != typeof window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : function () {
          if (0 !== arguments.length)
            return "object" == typeof arguments[0]
              ? P
              : P.apply(null, arguments);
        };
  function Le(e, t) {
    function n(...n) {
      if (t) {
        let r = t(...n);
        if (!r) throw new Error(ze(0));
        return {
          type: e,
          payload: r.payload,
          ...("meta" in r && { meta: r.meta }),
          ...("error" in r && { error: r.error }),
        };
      }
      return { type: e, payload: n[0] };
    }
    return (
      (n.toString = () => `${e}`),
      (n.type = e),
      (n.match = (t) =>
        (function (e) {
          return A(e) && "type" in e && "string" == typeof e.type;
        })(t) && t.type === e),
      n
    );
  }
  "undefined" != typeof window &&
    window.__REDUX_DEVTOOLS_EXTENSION__ &&
    window.__REDUX_DEVTOOLS_EXTENSION__;
  var Te = class e extends Array {
    constructor(...t) {
      super(...t), Object.setPrototypeOf(this, e.prototype);
    }
    static get [Symbol.species]() {
      return e;
    }
    concat(...e) {
      return super.concat.apply(this, e);
    }
    prepend(...t) {
      return 1 === t.length && Array.isArray(t[0])
        ? new e(...t[0].concat(this))
        : new e(...t.concat(this));
    }
  };
  function De(e) {
    return q(e) ? ke(e, () => {}) : e;
  }
  function Oe(e, t, n) {
    if (e.has(t)) {
      let r = e.get(t);
      return n.update && ((r = n.update(r, t, e)), e.set(t, r)), r;
    }
    if (!n.insert) throw new Error(ze(10));
    const r = n.insert(t, e);
    return e.set(t, r), r;
  }
  var Ae = (e) => (t) => {
      setTimeout(t, e);
    },
    Ne =
      "undefined" != typeof window && window.requestAnimationFrame
        ? window.requestAnimationFrame
        : Ae(10);
  function Pe(e) {
    const t = {},
      n = [];
    let r;
    const o = {
      addCase(e, n) {
        const r = "string" == typeof e ? e : e.type;
        if (!r) throw new Error(ze(28));
        if (r in t) throw new Error(ze(29));
        return (t[r] = n), o;
      },
      addMatcher: (e, t) => (n.push({ matcher: e, reducer: t }), o),
      addDefaultCase: (e) => ((r = e), o),
    };
    return e(o), [t, n, r];
  }
  var Me = Symbol.for("rtk-slice-createasyncthunk");
  function Fe(e, t) {
    return `${e}/${t}`;
  }
  function Ie({ creators: e } = {}) {
    const t = e?.asyncThunk?.[Me];
    return function (e) {
      const { name: n, reducerPath: r = n } = e;
      if (!n) throw new Error(ze(11));
      const o =
          ("function" == typeof e.reducers
            ? e.reducers(
                (function () {
                  function e(e, t) {
                    return {
                      _reducerDefinitionType: "asyncThunk",
                      payloadCreator: e,
                      ...t,
                    };
                  }
                  return (
                    (e.withTypes = () => e),
                    {
                      reducer: (e) =>
                        Object.assign({ [e.name]: (...t) => e(...t) }[e.name], {
                          _reducerDefinitionType: "reducer",
                        }),
                      preparedReducer: (e, t) => ({
                        _reducerDefinitionType: "reducerWithPrepare",
                        prepare: e,
                        reducer: t,
                      }),
                      asyncThunk: e,
                    }
                  );
                })(),
              )
            : e.reducers) || {},
        i = Object.keys(o),
        a = {
          sliceCaseReducersByName: {},
          sliceCaseReducersByType: {},
          actionCreators: {},
          sliceMatchers: [],
        },
        c = {
          addCase(e, t) {
            const n = "string" == typeof e ? e : e.type;
            if (!n) throw new Error(ze(12));
            if (n in a.sliceCaseReducersByType) throw new Error(ze(13));
            return (a.sliceCaseReducersByType[n] = t), c;
          },
          addMatcher: (e, t) => (
            a.sliceMatchers.push({ matcher: e, reducer: t }), c
          ),
          exposeAction: (e, t) => ((a.actionCreators[e] = t), c),
          exposeCaseReducer: (e, t) => ((a.sliceCaseReducersByName[e] = t), c),
        };
      function s() {
        const [t = {}, n = [], r] =
            "function" == typeof e.extraReducers
              ? Pe(e.extraReducers)
              : [e.extraReducers],
          o = { ...t, ...a.sliceCaseReducersByType };
        return (function (e) {
          let t,
            [i, c, s] = Pe((e) => {
              for (let t in o) e.addCase(t, o[t]);
              for (let t of a.sliceMatchers) e.addMatcher(t.matcher, t.reducer);
              for (let t of n) e.addMatcher(t.matcher, t.reducer);
              r && e.addDefaultCase(r);
            });
          if ("function" == typeof e) t = () => De(e());
          else {
            const n = De(e);
            t = () => n;
          }
          function l(e = t(), n) {
            let r = [
              i[n.type],
              ...c.filter(({ matcher: e }) => e(n)).map(({ reducer: e }) => e),
            ];
            return (
              0 === r.filter((e) => !!e).length && (r = [s]),
              r.reduce((e, t) => {
                if (t) {
                  if (U(e)) {
                    const r = t(e, n);
                    return void 0 === r ? e : r;
                  }
                  if (q(e)) return ke(e, (e) => t(e, n));
                  {
                    const r = t(e, n);
                    if (void 0 === r) {
                      if (null === e) return e;
                      throw new Error(ze(9));
                    }
                    return r;
                  }
                }
                return e;
              }, e)
            );
          }
          return (l.getInitialState = t), l;
        })(e.initialState);
      }
      i.forEach((r) => {
        const i = o[r],
          a = {
            reducerName: r,
            type: Fe(n, r),
            createNotation: "function" == typeof e.reducers,
          };
        !(function (e) {
          return "asyncThunk" === e._reducerDefinitionType;
        })(i)
          ? (function ({ type: e, reducerName: t, createNotation: n }, r, o) {
              let i, a;
              if ("reducer" in r) {
                if (
                  n &&
                  !(function (e) {
                    return "reducerWithPrepare" === e._reducerDefinitionType;
                  })(r)
                )
                  throw new Error(ze(17));
                (i = r.reducer), (a = r.prepare);
              } else i = r;
              o.addCase(e, i)
                .exposeCaseReducer(t, i)
                .exposeAction(t, a ? Le(e, a) : Le(e));
            })(a, i, c)
          : (function ({ type: e, reducerName: t }, n, r, o) {
              if (!o) throw new Error(ze(18));
              const {
                  payloadCreator: i,
                  fulfilled: a,
                  pending: c,
                  rejected: s,
                  settled: l,
                  options: d,
                } = n,
                u = o(e, i, d);
              r.exposeAction(t, u),
                a && r.addCase(u.fulfilled, a),
                c && r.addCase(u.pending, c),
                s && r.addCase(u.rejected, s),
                l && r.addMatcher(u.settled, l),
                r.exposeCaseReducer(t, {
                  fulfilled: a || Be,
                  pending: c || Be,
                  rejected: s || Be,
                  settled: l || Be,
                });
            })(a, i, c, t);
      });
      const l = (e) => e,
        d = new Map();
      let u;
      function p(e, t) {
        return u || (u = s()), u(e, t);
      }
      function f() {
        return u || (u = s()), u.getInitialState();
      }
      function h(t, n = !1) {
        function r(e) {
          let r = e[t];
          return void 0 === r && n && (r = f()), r;
        }
        function o(t = l) {
          const r = Oe(d, n, { insert: () => new WeakMap() });
          return Oe(r, t, {
            insert: () => {
              const r = {};
              for (const [o, i] of Object.entries(e.selectors ?? {}))
                r[o] = je(i, t, f, n);
              return r;
            },
          });
        }
        return {
          reducerPath: t,
          getSelectors: o,
          get selectors() {
            return o(r);
          },
          selectSlice: r,
        };
      }
      const y = {
        name: n,
        reducer: p,
        actions: a.actionCreators,
        caseReducers: a.sliceCaseReducersByName,
        getInitialState: f,
        ...h(r),
        injectInto(e, { reducerPath: t, ...n } = {}) {
          const o = t ?? r;
          return (
            e.inject({ reducerPath: o, reducer: p }, n), { ...y, ...h(o, !0) }
          );
        },
      };
      return y;
    };
  }
  function je(e, t, n, r) {
    function o(o, ...i) {
      let a = t(o);
      return void 0 === a && r && (a = n()), e(a, ...i);
    }
    return (o.unwrapped = e), o;
  }
  var Re = Ie();
  function Be() {}
  var { assign: $e } = Object;
  function ze(e) {
    return `Minified Redux Toolkit error #${e}; visit https://redux-toolkit.js.org/Errors?code=${e} for the full message or use the non-minified dev environment for full errors. `;
  }
  Symbol.for("rtk-state-proxy-original");
  const Ue = Re({
      name: "app",
      initialState: { lastFocused: null, menuOpening: !1, autoUpload: !1 },
      reducers: {
        setLastFocused(e, t) {
          e.lastFocused = t.payload.id;
        },
        toggleMenuOpening(e) {
          e.menuOpening = !e.menuOpening;
        },
        openMenu(e) {
          e.menuOpening = !0;
        },
        closeMenu(e) {
          e.menuOpening = !1;
        },
        toggleAutoUpload(e) {
          e.autoUpload = !e.autoUpload;
        },
      },
    }),
    {
      setLastFocused: qe,
      toggleMenuOpening: Ke,
      openMenu: He,
      closeMenu: We,
      toggleAutoUpload: Je,
    } = Ue.actions,
    Xe = (function (e) {
      const t = function (e) {
          const {
            thunk: t = !0,
            immutableCheck: n = !0,
            serializableCheck: r = !0,
            actionCreatorCheck: o = !0,
          } = e ?? {};
          let i = new Te();
          return (
            t &&
              ("boolean" == typeof t ? i.push(F) : i.push(I(t.extraArgument))),
            i
          );
        },
        {
          reducer: n,
          middleware: r,
          devTools: o = !0,
          preloadedState: i,
          enhancers: a,
        } = e || {};
      let c, s;
      if ("function" == typeof n) c = n;
      else {
        if (!A(n)) throw new Error(ze(1));
        c = (function (e) {
          const t = Object.keys(e),
            n = {};
          for (let r = 0; r < t.length; r++) {
            const o = t[r];
            "function" == typeof e[o] && (n[o] = e[o]);
          }
          const r = Object.keys(n);
          let o;
          try {
            !(function (e) {
              Object.keys(e).forEach((t) => {
                const n = e[t];
                if (void 0 === n(void 0, { type: O.INIT }))
                  throw new Error(L(12));
                if (void 0 === n(void 0, { type: O.PROBE_UNKNOWN_ACTION() }))
                  throw new Error(L(13));
              });
            })(n);
          } catch (e) {
            o = e;
          }
          return function (e = {}, t) {
            if (o) throw o;
            let i = !1;
            const a = {};
            for (let o = 0; o < r.length; o++) {
              const c = r[o],
                s = n[c],
                l = e[c],
                d = s(l, t);
              if (void 0 === d) throw (t && t.type, new Error(L(14)));
              (a[c] = d), (i = i || d !== l);
            }
            return (i = i || r.length !== Object.keys(e).length), i ? a : e;
          };
        })(n);
      }
      s = "function" == typeof r ? r(t) : t();
      let l = P;
      o && (l = Se({ trace: !1, ...("object" == typeof o && o) }));
      const d = (function (...e) {
          return (t) => (n, r) => {
            const o = t(n, r);
            let i = () => {
              throw new Error(L(15));
            };
            const a = {
                getState: o.getState,
                dispatch: (e, ...t) => i(e, ...t),
              },
              c = e.map((e) => e(a));
            return (i = P(...c)(o.dispatch)), { ...o, dispatch: i };
          };
        })(...s),
        u = ((e) =>
          function (t) {
            const { autoBatch: n = !0 } = t ?? {};
            let r = new Te(e);
            return (
              n &&
                r.push(
                  (
                    (e = { type: "raf" }) =>
                    (t) =>
                    (...n) => {
                      const r = t(...n);
                      let o = !0,
                        i = !1,
                        a = !1;
                      const c = new Set(),
                        s =
                          "tick" === e.type
                            ? queueMicrotask
                            : "raf" === e.type
                              ? Ne
                              : "callback" === e.type
                                ? e.queueNotification
                                : Ae(e.timeout),
                        l = () => {
                          (a = !1), i && ((i = !1), c.forEach((e) => e()));
                        };
                      return Object.assign({}, r, {
                        subscribe(e) {
                          const t = r.subscribe(() => o && e());
                          return (
                            c.add(e),
                            () => {
                              t(), c.delete(e);
                            }
                          );
                        },
                        dispatch(e) {
                          try {
                            return (
                              (o = !e?.meta?.RTK_autoBatch),
                              (i = !o),
                              i && (a || ((a = !0), s(l))),
                              r.dispatch(e)
                            );
                          } finally {
                            o = !0;
                          }
                        },
                      });
                    }
                  )("object" == typeof n ? n : void 0),
                ),
              r
            );
          })(d);
      return N(c, i, l(...("function" == typeof a ? a(u) : u())));
    })({ reducer: { app: Ue.reducer } });
  function Ye(e, t) {
    if (e.isEditing) return;
    if (Xe.getState().app.menuOpening) return;
    let n;
    switch (t) {
      case "up":
        n = (function (e) {
          if (e.parentId) {
            const t = Ge(e.parentId),
              n = t.children.indexOf(e);
            return t.children[n - 1] || null;
          }
          return null;
        })(e);
        break;
      case "down":
        n = (function (e) {
          if (e.parentId) {
            const t = Ge(e.parentId),
              n = t.children.indexOf(e);
            return t.children[n + 1] || null;
          }
          return null;
        })(e);
        break;
      case "left":
        n = Ge(e.parentId);
        break;
      case "right":
        n = e.children[0];
    }
    n && n.element.focus();
  }
  class Ve {
    constructor(
      e,
      t,
      n,
      r = null,
      o = [],
      i = null,
      a = "column",
      c = null,
      s = null,
      l = !0,
    ) {
      (this.id = t),
        (this.name = n),
        (this.children = []),
        (this.labels = o),
        (this.parentId = e),
        (this.isFolded = l),
        (this.borderColor = r || "#f5f5f5"),
        (this.created_dt = i ? new Date(i) : new Date()),
        (this.host_url = c),
        (this.filename = s),
        (this.flexDirection = a),
        (this.element = this.createElement()),
        (this.isEditing = !1),
        (this.isSelected = !1),
        this.updateAppearance(),
        this.updateBorderColor(this.borderColor),
        this.setupFocusTracking();
    }
    createElement() {
      const e = document.createElement("div");
      e.classList.add("tray"),
        e.setAttribute("draggable", "true"),
        e.setAttribute("data-tray-id", this.id),
        (e.style.display = "block");
      const t = document.createElement("div");
      t.classList.add("tray-title-container");
      const n = document.createElement("div");
      n.classList.add("tray-checkbox-container");
      const r = document.createElement("span");
      r.classList.add("tray-created-time"),
        (r.textContent = this.formatCreatedTime()),
        (r.style.fontSize = "0.8em"),
        (r.style.color = "#888");
      const o = document.createElement("input");
      (o.type = "checkbox"),
        o.classList.add("tray-checkbox"),
        (o.checked = this.isSelected),
        o.addEventListener("change", this.onCheckboxChange.bind(this)),
        n.appendChild(o);
      const i = document.createElement("div");
      i.classList.add("tray-title"),
        i.setAttribute("contenteditable", "false"),
        (i.textContent = this.name);
      const a = document.createElement("button");
      a.classList.add("tray-context-menu-button"),
        (a.textContent = "⋮"),
        a.addEventListener("click", this.onContextMenuButtonClick.bind(this));
      const s = document.createElement("div");
      s.classList.add("tray-labels"),
        this.labels || (s.style.display = "none"),
        i.addEventListener("contextmenu", (e) => {
          e.stopPropagation(), c(this, e);
        }),
        i.addEventListener("dblclick", (e) => {
          i.setAttribute("contenteditable", "true"),
            e.stopPropagation(),
            e.target.focus();
        }),
        this.setupTitleEditing(i);
      const l = document.createElement("div");
      l.classList.add("tray-content"),
        (l.style.flexDirection = this.flexDirection),
        t.addEventListener("dblclick", this.onDoubleClick.bind(this));
      const d = document.createElement("button");
      d.classList.add("tray-fold-button"),
        (d.textContent = "▼"),
        d.addEventListener("click", this.toggleFold.bind(this));
      const u = document.createElement("button");
      u.classList.add("tray-fold-button-right"),
        (u.textContent = "▼"),
        u.addEventListener("click", this.toggleFold.bind(this)),
        (u.style.display = "none"),
        t.appendChild(d),
        t.appendChild(i),
        t.appendChild(u),
        t.appendChild(a),
        t.appendChild(r),
        t.appendChild(n),
        t.appendChild(s),
        e.appendChild(t),
        e.append(l),
        l.addEventListener("dblclick", this.onDoubleClick.bind(this)),
        rt.set(e, this),
        this.setupKeyboardNavigation(e);
      const p = document.createElement("div");
      p.classList.add("network-tray-info");
      const f = document.createElement("button");
      (f.textContent = "URL"),
        this.host_url && "" !== this.host_url.trim()
          ? ((f.style.backgroundColor = "green"), (f.style.color = "white"))
          : ((f.style.backgroundColor = "gray"), (f.style.color = "white")),
        (f.title = this.host_url || "No URL set");
      const m = document.createElement("div");
      m.textContent = `${this.filename}`;
      const b = document.createElement("div");
      b.classList.add("network-tray-buttons"),
        (b.style.display = "flex"),
        (b.style.flexDirection = "column"),
        (b.style.alignItems = "flex-start"),
        (b.style.gap = "5px");
      const v = document.createElement("button");
      (v.textContent = "Upload"), v.addEventListener("click", () => h(this));
      const g = document.createElement("button");
      return (
        (g.textContent = "Download"),
        g.addEventListener("click", () => y(this)),
        b.appendChild(f),
        b.appendChild(m),
        b.appendChild(v),
        b.appendChild(g),
        t.appendChild(p),
        null != this.filename && t.appendChild(b),
        (t.style.display = "flex"),
        (t.style.alignItems = "center"),
        (t.style.justifyContent = "space-between"),
        e
      );
    }
    setupFocusTracking() {
      this.element.addEventListener(
        "focus",
        () => {
          qe(this);
        },
        !0,
      ),
        this.element.addEventListener(
          "click",
          () => {
            qe(this);
          },
          !0,
        );
    }
    formatCreatedTime() {
      const e = new Date(this.created_dt);
      return `${e.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}\n${e.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
    }
    onCheckboxChange(e) {
      const t = e.target.checked;
      let n = [...b];
      t ? n.push(this) : (n = n.filter((e) => e.id !== this.id)),
        (b.length = 0),
        b.push(...n),
        (this.isSelected = t);
    }
    toggleFlexDirection() {
      (this.flexDirection = "column" === this.flexDirection ? "row" : "column"),
        this.updateFlexDirection(),
        this.updateChildrenAppearance(),
        _();
    }
    setupEventListeners(e) {
      let t, n, r;
      e.addEventListener("touchstart", (e) => {
        this.isEditing ||
          ((n = e.touches[0].clientX),
          (r = e.touches[0].clientY),
          (t = window.setTimeout(() => {
            this.showContextMenu(e);
          }, 500)));
      }),
        e.addEventListener("touchmove", (e) => {
          this.isEditing ||
            ((Math.abs(e.touches[0].clientX - n) > 10 ||
              Math.abs(e.touches[0].clientY - r) > 10) &&
              clearTimeout(t));
        }),
        e.addEventListener("touchend", () => {
          this.isEditing || clearTimeout(t);
        });
    }
    onLabelClick(e, t, n) {
      t.stopPropagation(),
        confirm(`Do you want to remove the label "${n}"?`) && o(e, n);
    }
    updateFlexDirection() {
      const e = this.element.querySelector(".tray-content");
      e &&
        ((e.style.flexDirection = this.flexDirection),
        (e.style.display = "flex"));
    }
    updateChildrenAppearance() {
      this.children.forEach((e) => {
        "row" === this.flexDirection
          ? (e.element.style.width = "50%")
          : (e.element.style.width = "100%");
      });
    }
    removeChild(e) {
      (this.children = this.children.filter((t) => t.id !== e)),
        this.updateAppearance();
    }
    updateBorderColor(e) {
      const t = this.element;
      t &&
        ((t.style.borderLeftColor = e),
        (t.style.borderLeftWidth = "3px"),
        (t.style.borderLeftStyle = "solid"),
        (t.style.borderBottomColor = e),
        (t.style.borderBottomWidth = "3px"),
        (t.style.borderBottomStyle = "solid"));
    }
    changeBorderColor(e) {
      this.updateBorderColor(e), _();
    }
    setupTitleEditing(e) {
      e.addEventListener("dblclick", (t) => {
        t.stopPropagation(), this.startTitleEdit(e), _();
      });
    }
    toggleFold() {
      (this.isFolded = !this.isFolded),
        this.foldChildren(),
        this.updateAppearance();
    }
    foldChildren() {
      this.isFolded &&
        this.children.forEach((e) => {
          (e.isFolded = !0), e.updateAppearance(), e.foldChildren();
        });
    }
    updateAppearance() {
      const e = this.element.querySelector(".tray-content"),
        t = this.element.querySelector(".tray-fold-button"),
        n = this.element.querySelector(".tray-fold-button-right");
      e &&
        t &&
        n &&
        (this.children.length
          ? ((t.style.display = "inline-block"),
            (n.style.display = "inline-block"),
            this.isFolded
              ? ((e.style.display = "none"),
                (t.textContent = "▶"),
                (t.style.display = "inline-block"),
                (n.textContent = "▼"),
                (n.style.display = "none"))
              : (this.updateBorderColor(this.borderColor),
                (e.style.display = "block"),
                (t.textContent = "▼"),
                (t.style.display = "none"),
                (n.textContent = "▶"),
                (n.style.display = "inline-block"),
                this.updateFlexDirection()))
          : ((e.style.display = "none"), (t.style.display = "none")));
    }
    startTitleEdit(e) {
      (this.isEditing = !0), e.setAttribute("contenteditable", "true");
      const t = document.createRange();
      t.selectNodeContents(e);
      const n = window.getSelection();
      n && (n.removeAllRanges(), n.addRange(t)),
        e.addEventListener("keydown", (t) => {
          "Enter" !== t.key || t.shiftKey || (t.preventDefault(), e.blur());
        }),
        e.addEventListener("blur", () => {
          this.finishTitleEdit(e);
        });
    }
    cancelTitleEdit(e) {
      (this.isEditing = !1),
        e.setAttribute("contenteditable", "false"),
        (e.textContent = this.name);
    }
    onContextMenuButtonClick(e) {
      e.preventDefault(), e.stopPropagation(), this.showContextMenu(e);
    }
    showContextMenu(e) {
      c(this, e);
    }
    finishTitleEdit(e) {
      e.setAttribute("contenteditable", "false"),
        (this.name = (e.textContent || "").trim()),
        (e.textContent = this.name),
        (this.isEditing = !1),
        _();
    }
    onDragStart(e) {
      e.stopPropagation(),
        e.dataTransfer &&
          (e.dataTransfer.setData("text/plain", this.id),
          (e.dataTransfer.effectAllowed = "move"));
    }
    onDragOver(e) {
      e.preventDefault(),
        e.stopPropagation(),
        e.dataTransfer && (e.dataTransfer.dropEffect = "move");
    }
    setupKeyboardNavigation(e) {
      (e.tabIndex = 0),
        e.addEventListener("keydown", (e) =>
          (function (e, t) {
            if (!Xe.getState().app.menuOpening)
              if ((t.stopPropagation(), e.isEditing))
                switch (t.key) {
                  case "Enter":
                    t.shiftKey ||
                      (t.preventDefault(), e.finishTitleEdit(t.target));
                    break;
                  case "Escape":
                    t.preventDefault(), e.cancelTitleEdit(t.target);
                }
              else
                switch ((e.element.focus(), t.key)) {
                  case "ArrowUp":
                    t.preventDefault(), Ye(e, "up");
                    break;
                  case "ArrowDown":
                    t.preventDefault(), Ye(e, "down");
                    break;
                  case "ArrowLeft":
                    t.preventDefault(), Ye(e, "left");
                    break;
                  case "ArrowRight":
                    t.preventDefault(), Ye(e, "right");
                    break;
                  case "Enter":
                    t.preventDefault(),
                      t.ctrlKey
                        ? e.addNewChild()
                        : t.shiftKey
                          ? (function (e) {
                              const t = e.element.querySelector(".tray-title");
                              t &&
                                ("true" === t.getAttribute("contenteditable")
                                  ? e.finishTitleEdit(t)
                                  : e.startTitleEdit(t));
                            })(e)
                          : e.toggleFold();
                    break;
                  case "Delete":
                    t.preventDefault(), t.ctrlKey && u(e);
                    break;
                  case "c":
                    t.ctrlKey && (t.preventDefault(), s(e));
                    break;
                  case "x":
                    t.ctrlKey && (t.preventDefault(), l(e));
                    break;
                  case "v":
                    t.ctrlKey && (t.preventDefault(), d(e));
                }
          })(this, e),
        );
    }
    addNewChild() {
      const e = new Ve(this.id, Date.now().toString(), "New Tray");
      this.addChild(e), (this.isFolded = !1), this.updateAppearance();
      const t = e.element.querySelector(".tray-title");
      e.startTitleEdit(t);
    }
    onDrop(e) {
      var t;
      e.preventDefault(),
        e.stopPropagation(),
        this.isFolded && this.toggleFold(),
        this.updateAppearance();
      const n =
        null === (t = e.dataTransfer) || void 0 === t
          ? void 0
          : t.getData("text/plain");
      if (!n) return;
      const r = Ge(n);
      if (!r) return;
      const o = Ge(r.parentId);
      o && o.removeChild(n), this.children.unshift(r), (r.parentId = this.id);
      const i = this.element.querySelector(".tray-content");
      i && i.insertBefore(r.element, i.firstChild),
        (r.element.style.display = "block"),
        (this.isFolded = !1),
        this.updateAppearance(),
        _();
    }
    onDragEnd(e) {
      e.stopPropagation(),
        this.element.classList.remove("drag-over"),
        (this.element.style.display = "block");
    }
    onDoubleClick(e) {
      e.stopPropagation();
      const t = new Ve(this.id, Date.now().toString(), "New Tray");
      this.addChild(t), (this.isFolded = !1), this.updateAppearance();
      const n = t.element.querySelector(".tray-title");
      n && t.startTitleEdit(n);
    }
    onMouseOver(e) {}
    addChild(e) {
      this.children.unshift(e), (e.parentId = this.id);
      const t = this.element.querySelector(".tray-content");
      if (
        (t && t.insertBefore(e.element, t.firstChild),
        1 === this.children.length)
      ) {
        const e =
          "#f5f5f5" == this.borderColor
            ? (function () {
                let e = "#";
                for (let t = 0; t < 6; t++)
                  e += "0123456789ABCDEF"[Math.floor(16 * Math.random())];
                return e;
              })()
            : this.borderColor;
        console.log("#f5f5f5" === this.borderColor, e, this.borderColor),
          (this.borderColor = e),
          this.updateBorderColor(this.borderColor),
          this.updateAppearance();
      }
    }
    moveFocusAfterDelete(e, t) {
      let n;
      (n =
        e.children.length > 0
          ? t < e.children.length
            ? e.children[t].element
            : e.children[e.children.length - 1].element
          : e.element),
        n && n.focus();
    }
    add_child_from_localStorage() {
      const e = prompt("Input the sessionId", "");
      if (!e) return;
      const t = localStorage.getItem(e);
      if (t) {
        const e = S(JSON.parse(t));
        e && this.addChild(e);
      }
    }
  }
  function Ge(e) {
    const t = document.querySelector(`[data-tray-id="${e}"]`);
    return rt.get(t);
  }
  function Qe(e) {
    e = e.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var t = new RegExp("[\\?&]" + e + "=([^&#]*)").exec(location.search);
    return null === t
      ? ""
      : decodeURIComponent(t[1].replace(/\+/g, " ")).trim();
  }
  function Ze() {
    return document.querySelector("body > div.tray") || null;
  }
  function et() {
    const e = new Ve("0", "0", "Root Tray"),
      t =
        (e.element.querySelector(".tray-content"), new Ve(e.id, tt(), "ToDo")),
      n = new Ve(e.id, tt(), "Doing"),
      r = new Ve(e.id, tt(), "Done");
    return e.addChild(t), e.addChild(n), e.addChild(r), e;
  }
  function tt() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (e) {
        var t = (16 * Math.random()) | 0;
        return ("x" == e ? t : (3 & t) | 8).toString(16);
      },
    );
  }
  function nt(e) {
    let t = JSON.parse(JSON.stringify(e));
    return (t.id = tt()), t;
  }
  const rt = new WeakMap(),
    ot =
      (new Map(),
      new (class {
        constructor() {
          (this.labels = {}),
            this.initializeDefaultLabels(),
            (this.label_tray = new Set());
        }
        initializeDefaultLabels() {
          this.addLabel("DONE", "#4CAF50"),
            this.addLabel("WIP", "#FFC107"),
            this.addLabel("PLANNING", "#2196F3"),
            this.addLabel("ARCHIVE", "#9E9E9E");
        }
        addLabel(e, t) {
          this.labels[e] = t;
        }
        getLabel(e) {
          return this.labels[e];
        }
        getAllLabels() {
          return this.labels;
        }
        exportLabels() {
          return JSON.stringify(this.labels);
        }
        importLabels(e) {
          this.labels = JSON.parse(e);
        }
        registLabeledTray(e, t) {
          this.label_tray.add([e, t]);
        }
        unregisterLabeledTray(e, t) {
          this.label_tray.delete([e, t]);
        }
      })());
  function it() {
    const e = Ge(Xe.getState().app.lastFocused),
      t = Ge(e.parentId);
    if (t) {
      const e = new Ve(t.id, Date.now().toString(), "New Tray");
      t.addChild(e), (t.isFolded = !1), t.updateAppearance(), e.element.focus();
      const n = e.element.querySelector(".tray-title");
      e.startTitleEdit(n);
    }
  }
  function at() {
    const e = Xe.getState().app.lastFocused;
    if (!e) return;
    const t = Ge(e);
    if (!t) return;
    const n = new Ve(t.id, Date.now().toString(), "New Tray");
    t.addChild(n), (t.isFolded = !1), t.updateAppearance(), n.element.focus();
    const r = n.element.querySelector(".tray-title");
    n.startTitleEdit(r);
  }
  window.addEventListener("DOMContentLoaded", () => {
    let e = Qe("sessionId");
    if ("new" == e) {
      let e = tt();
      window.location.replace(
        window.location.href.replace("?sessionId=new", "?sessionId=" + e),
      );
    }
    if ((e ? E(e) : E(), console.log("loaded"), e)) {
      const t = localStorage.getItem(e + "_title");
      t && (document.title = t);
    }
    const { leftBar: t } = v();
    document.body.insertBefore(t, document.body.firstChild);
    const n = (function () {
      const e = document.createElement("div");
      e.classList.add("action-buttons");
      const t = document.createElement("button");
      (t.textContent = "+"),
        t.classList.add("action-button", "add-button"),
        t.addEventListener("click", it);
      const n = document.createElement("button");
      return (
        (n.textContent = "↩"),
        n.classList.add("action-button", "insert-button"),
        n.addEventListener("click", at),
        e.appendChild(t),
        e.appendChild(n),
        e
      );
    })();
    document.body.appendChild(n);
    const r = Ze();
    qe(rt.get(r)), r.focus();
  });
})();
