(()=>{"use strict";var e={d:(t,n)=>{for(var i in n)e.o(n,i)&&!e.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:n[i]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t)};function t(e){const t=document.querySelector(`[data-tray-id="${e}"]`);return w.get(t)}function n(e){e=e.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");var t=new RegExp("[\\?&]"+e+"=([^&#]*)").exec(location.search);return null===t?"":decodeURIComponent(t[1].replace(/\+/g," ")).trim()}function i(){return document.querySelector("body > div:nth-child(1) > div")}function o(){const e=new T("0","0","Root Tray"),t=(e.element.querySelector(".tray-content"),new T(e.id,a(),"ToDo")),n=new T(e.id,a(),"Doing"),i=new T(e.id,a(),"Done");return e.addChild(t),e.addChild(n),e.addChild(i),e}function a(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(e){var t=16*Math.random()|0;return("x"==e?t:3&t|8).toString(16)}))}function l(e){let t=JSON.parse(JSON.stringify(e));return t.id=a(),t}e.d({},{fZ:()=>T,Pi:()=>w});const s="trayData";var r=function(e,t,n,i){return new(n||(n=Promise))((function(o,a){function l(e){try{r(i.next(e))}catch(e){a(e)}}function s(e){try{r(i.throw(e))}catch(e){a(e)}}function r(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(l,s)}r((i=i.apply(e,t||[])).next())}))};function d(e){return r(this,void 0,void 0,(function*(){const t=JSON.parse(g(e));if(e.filename&&e.host_url)try{const n=yield fetch(`${e.host_url}/tray/save`,{method:"POST",headers:{"Content-Type":"application/json",filename:e.filename},body:JSON.stringify({data:t})});if(!n.ok)throw new Error("Network response was not ok");const i=yield n.text();console.log(i),u("Data uploaded successfully.")}catch(e){throw console.error("Error:",e),u("Failed to upload data.",!0),e}}))}function c(e){return r(this,void 0,void 0,(function*(){if(e.filename&&e.host_url)try{const t=yield fetch(`${e.host_url}/tray/load`,{method:"GET",headers:{filename:e.filename}});if(!t.ok)throw new Error("Network response was not ok");return x(yield t.json())}catch(e){throw console.error("Error:",e),u("データのダウンロードに失敗しました。"),e}}))}function u(e,t=!1){const n=document.createElement("div");n.textContent=e,n.style.position="fixed",n.style.bottom="20px",n.style.right="20px",n.style.padding="10px",n.style.borderRadius="5px",n.style.color="white",n.style.backgroundColor=t?"red":"green",n.style.zIndex="1000",document.body.appendChild(n),setTimeout((()=>{n.style.transition="opacity 0.5s",n.style.opacity="0",setTimeout((()=>{document.body.removeChild(n)}),500)}),3e3)}let h=[];function m(){const e=document.createElement("div");e.classList.add("left-bar"),document.body.appendChild(e);const t=document.createElement("div");t.classList.add("hamburger-menu"),t.innerHTML="☰",e.appendChild(t);const i=document.createElement("div");i.classList.add("hamburger-menu-items"),i.style.display="none",e.appendChild(i),i.style.position="fixed",i.innerHTML='\n        <div class="menu-item" data-action="reset">トレイをリセット</div>\n        <div class="menu-item" data-action="save">現在の状態を保存</div>\n        <div class="menu-item" data-action="load">保存した状態を読み込む</div>\n        <div class="menu-item" data-action="export">データのエクスポート</div>\n        <div class="menu-item" data-action="import">データのインポート</div>\n        <div class="menu-item" data-action="set_default_server">set_default_server</div>\n        <div class="menu-item" data-action="set_secret">set_secret</div>\n        <div class="menu-item" data-action="import_network_tray_directly_as_root">import_network_tray_directly_as_root</div>\n    \n    \n      ',i.innerHTML+='\n      <div class="menu-item" data-action="manageLabels">ラベル管理</div>\n      <div class="menu-item" data-action="exportLabels">ラベルをエクスポート</div>\n      <div class="menu-item" data-action="importLabels">ラベルをインポート</div>\n    ',i.innerHTML+='\n      <div class="menu-item" data-action="editTitle">ページタイトルを編集</div>\n    ',i.innerHTML+='\n      <div class="menu-item" data-action="uploadAll">Upload All</div>\n    ',i.innerHTML+='\n      <div class="menu-item" data-action="downloadAll">Download All</div>\n    ',i.innerHTML+='\n    <div class="menu-item" data-action="copySelected">Copy selected</div>\n    <div class="menu-item" data-action="cutSelected">Cut selected</div>\n\n  ',document.body.appendChild(i);const r=i.querySelectorAll(".menu-item");return r.forEach((e=>{e.style.padding="5px 10px",e.style.cursor="pointer",e.style.transition="background-color 0.3s"})),t.addEventListener("click",(t=>{if(i.style.display="none"===i.style.display?"block":"none","block"===i.style.display){const t=e.getBoundingClientRect();i.style.left=`${t.right}px`,i.style.top=`${t.top}px`}t.stopPropagation()})),document.addEventListener("click",(e=>{const n=e.target;i.contains(n)||n===t||(i.style.display="none")})),i.addEventListener("click",(e=>{switch(e.target.getAttribute("data-action")){case"reset":confirm("すべてのトレイをリセットしますか？この操作は元に戻せません。")&&function(){localStorage.removeItem("trayData");const e=o();document.body.innerHTML="",document.body.appendChild(e.element),m()}();break;case"export":!function(){const e=localStorage.getItem(s);if(!e)return void console.error("No data found to export.");const t=new Blob([e],{type:"application/json"}),n=URL.createObjectURL(t),i=document.createElement("a");i.href=n,i.download="tray_data.json",i.click(),URL.revokeObjectURL(n)}();break;case"import":!function(){const e=document.createElement("input");e.type="file",e.accept=".json",e.onchange=e=>{const t=e.target,n=t.files?t.files[0]:null;if(!n)return;const i=new FileReader;i.onload=e=>{var t;try{const n=null===(t=e.target)||void 0===t?void 0:t.result;return JSON.parse(n),b("imported",n),void b(s,n)}catch(e){return console.error("Invalid JSON file:",e),void alert("無効なJSONファイルです。")}},i.readAsText(n,"UTF-8")},e.click()}();break;case"set_default_server":!function(){let e=localStorage.getItem("defaultServer");e=prompt("set default URL",e||""),e&&localStorage.setItem("defaultServer",e)}();break;case"editTitle":!function(){const e=document.title,t=prompt("新しいページタイトルを入力してください:",e);if(null!==t&&""!==t.trim()){document.title=t.trim();const e=n("sessionId");e&&(localStorage.setItem(e+"_title",t.trim()),alert("ページタイトルを更新しました。"))}}();break;case"uploadAll":p();break;case"downloadAll":y();break;case"cutSelected":!function(){if(0!==h.length){const e=new T(a(),a(),"selected Trays");h.map((t=>e.children.push(l(t)))),e.copyTray(),h.map((e=>e.deleteTray())),h=[],document.querySelectorAll(".tray-checkbox").forEach((e=>{e.checked=!1}))}}();break;case"copySelected":!function(){if(0!==h.length){const e=new T(a(),a(),"selected Trays");h.map((t=>e.children.push(l(t)))),e.copyTray(),h=[],document.querySelectorAll(".tray-checkbox").forEach((e=>{e.checked=!1}))}}()}i.style.display="none"})),r.forEach((e=>{e.addEventListener("mouseover",(()=>{e.style.backgroundColor="#f0f0f0"})),e.addEventListener("mouseout",(()=>{e.style.backgroundColor="transparent"}))})),{hamburger:t,menu:i,leftBar:e}}function p(e=null){e||(e=w.get(i())),e.host_url&&d(e),e.children.length&&e.children.map((e=>p(e)))}function y(e=null){e||(e=w.get(i())),e.host_url&&c(e),e.children.length&&e.children.map((e=>y(e)))}function b(e=null,t=null){const o=indexedDB.open("TrayDatabase",1);let a;o.onupgradeneeded=e=>{a=o.result,a.objectStoreNames.contains("trays")||a.createObjectStore("trays",{keyPath:"id"})},o.onsuccess=()=>{a=o.result;const l=n("sessionId"),r=i();if(!r)return void console.error("Root element not found");const d=w.get(r),c=t||g(d);let u;u=e||l||s;const h=a.transaction("trays","readwrite").objectStore("trays").put({id:u,value:c});h.onsuccess=()=>{console.log(u),console.log("Data saved successfully")},h.onerror=e=>{console.error("Error saving to IndexedDB:",h.error)}}}function f(){return e=this,t=arguments,i=function*(e=s){try{const t=yield new Promise(((e,t)=>{const n=indexedDB.open("TrayDatabase",1);n.onupgradeneeded=e=>{const t=n.result;t.objectStoreNames.contains("trays")||t.createObjectStore("trays",{keyPath:"id"})},n.onsuccess=()=>{e(n.result)},n.onerror=()=>{t(n.error)}})),n=yield function(e,t){return new Promise(((n,i)=>{const o=e.transaction("trays","readonly").objectStore("trays").get(t);o.onsuccess=()=>{n(o.result)},o.onerror=()=>{i(o.error)}}))}(t,e);let i;if(n)try{i=x(n.value)}catch(e){console.error("Error deserializing data:",e),i=o()}else i=o();v(i)}catch(e){console.error("Error loading from IndexedDB:",e),v(o())}},new((n=void 0)||(n=Promise))((function(o,a){function l(e){try{r(i.next(e))}catch(e){a(e)}}function s(e){try{r(i.throw(e))}catch(e){a(e)}}function r(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(l,s)}r((i=i.apply(e,t||[])).next())}));var e,t,n,i}function v(e){document.body.innerHTML="",document.body.appendChild(e.element),m()}function g(e){return JSON.stringify(e)}function L(e){let t;console.log("help"),t=e.host_url?e.host_url:e.url;let n=new T(e.parentId,e.id,e.name,e.borderColor,e.labels,e.created_dt,e.flexDirection,t,e.filename,!(e.isFolded instanceof Boolean)||e.isFolded),i=e.children;return i.length>0&&i.map((e=>L(e))).sort(((e,t)=>new Date(e.created_dt).getTime()-new Date(t.created_dt).getTime())).map((e=>n.addChild(e))),n}function x(e){return L(JSON.parse(e))}let E;var C=!1;const w=new WeakMap;new Map;const k=new class{constructor(){this.labels={},this.initializeDefaultLabels(),this.label_tray=new Set}initializeDefaultLabels(){this.addLabel("DONE","#4CAF50"),this.addLabel("WIP","#FFC107"),this.addLabel("PLANNING","#2196F3"),this.addLabel("ARCHIVE","#9E9E9E")}addLabel(e,t){this.labels[e]=t}getLabel(e){return this.labels[e]}getAllLabels(){return this.labels}exportLabels(){return JSON.stringify(this.labels)}importLabels(e){this.labels=JSON.parse(e)}registLabeledTray(e,t){this.label_tray.add([e,t])}unregisterLabeledTray(e,t){this.label_tray.delete([e,t])}};class T{constructor(e,t,n,i=null,o=[],a=null,l="column",s=null,r=null,d=!0){this.id=t,this.name=n,this.children=[],this.labels=o,this.parentId=e,this.isFolded=d,this.borderColor=i||"#f5f5f5",this.created_dt=a?new Date(a):new Date,this.host_url=s,this.filename=r,this.flexDirection=l,this.element=this.createElement(),this.isEditing=!1,this.isSelected=!1,this.updateLabels(),this.updateAppearance(),this.updateBorderColor(this.borderColor),this.setupFocusTracking()}createElement(){const e=document.createElement("div");e.classList.add("tray"),e.setAttribute("draggable","true"),e.setAttribute("data-tray-id",this.id),e.style.display="block";const t=document.createElement("div");t.classList.add("tray-title-container");const n=document.createElement("div");n.classList.add("tray-checkbox-container");const i=document.createElement("div");i.classList.add("tray-click-area"),i.style.flexGrow="1",i.style.cursor="pointer";const o=document.createElement("span");o.classList.add("tray-created-time"),o.textContent=this.formatCreatedTime(),o.style.fontSize="0.8em",o.style.color="#888";const a=document.createElement("input");a.type="checkbox",a.classList.add("tray-checkbox"),a.checked=this.isSelected,a.addEventListener("change",this.onCheckboxChange.bind(this)),n.appendChild(a);const l=document.createElement("div");l.classList.add("tray-title"),l.setAttribute("contenteditable","false"),l.textContent=this.name;const s=document.createElement("button");s.classList.add("tray-context-menu-button"),s.textContent="⋮",s.addEventListener("click",this.onContextMenuButtonClick.bind(this));const r=document.createElement("div");r.classList.add("tray-labels"),this.labels||(r.style.display="none"),e.addEventListener("contextmenu",this.onContextMenu.bind(this)),l.addEventListener("contextmenu",(e=>{e.stopPropagation(),this.onContextMenu(e)})),l.addEventListener("dblclick",(e=>{l.setAttribute("contenteditable","true"),e.stopPropagation(),e.target.focus()})),this.setupTitleEditing(l);const u=document.createElement("div");u.classList.add("tray-content"),u.style.flexDirection=this.flexDirection,t.addEventListener("dblclick",this.onDoubleClick.bind(this));const h=document.createElement("button");h.classList.add("tray-fold-button"),h.textContent="▼",h.addEventListener("click",this.toggleFold.bind(this));const m=document.createElement("button");m.classList.add("tray-fold-button-right"),m.textContent="▼",m.addEventListener("click",this.toggleFold.bind(this)),m.style.display="none",t.appendChild(h),t.appendChild(n),t.appendChild(l),t.appendChild(m),t.appendChild(s),t.appendChild(o),t.appendChild(r),e.appendChild(t),e.append(u),e.addEventListener("dragstart",this.onDragStart.bind(this)),e.addEventListener("dragover",this.onDragOver.bind(this)),e.addEventListener("drop",this.onDrop.bind(this)),u.addEventListener("dblclick",this.onDoubleClick.bind(this)),w.set(e,this),this.setupKeyboardNavigation(e);const p=document.createElement("div");p.classList.add("network-tray-info");const y=document.createElement("button");y.textContent="URL",this.host_url&&""!==this.host_url.trim()?(y.style.backgroundColor="green",y.style.color="white"):(y.style.backgroundColor="gray",y.style.color="white"),y.title=this.host_url||"No URL set";const b=document.createElement("div");b.textContent=`${this.filename}`;const f=document.createElement("div");f.classList.add("network-tray-buttons"),f.style.display="flex",f.style.flexDirection="column",f.style.alignItems="flex-start",f.style.gap="5px";const v=document.createElement("button");v.textContent="Upload",v.addEventListener("click",(()=>d(this)));const g=document.createElement("button");return g.textContent="Download",g.addEventListener("click",(()=>c(this))),f.appendChild(y),f.appendChild(b),f.appendChild(v),f.appendChild(g),t.appendChild(p),null!=this.filename&&t.appendChild(f),t.style.display="flex",t.style.alignItems="center",t.style.justifyContent="space-between",e}setupFocusTracking(){this.element.addEventListener("focus",(()=>{E=this}),!0),this.element.addEventListener("click",(()=>{E=this}),!0)}formatCreatedTime(){const e=new Date(this.created_dt);return`${e.toLocaleDateString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"})}\n${e.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}`}onCheckboxChange(e){const t=e.target.checked;let n=[...h];t?n.push(this):n=n.filter((e=>e.id!==this.id)),h.length=0,h.push(...n),this.isSelected=t}toggleFlexDirection(){this.flexDirection="column"===this.flexDirection?"row":"column",this.updateFlexDirection(),this.updateChildrenAppearance(),b()}addLabel(e){const t=document.createElement("div");t.classList.add("label-selector"),console.log(k.getAllLabels()),t.innerHTML=`\n      <select id="existingLabels">\n        <option value="">-- 既存のラベルを選択 --</option>\n        ${Object.entries(k.getAllLabels()).map((([e,t])=>`<option value="${e}" style="background-color: ${t};">${e}</option>`)).join("")}\n      </select>\n      <button id="selectExistingLabel">選択</button>\n      <div>または</div>\n      <input type="text" id="newLabelName" placeholder="新しいラベル名">\n      <input type="color" id="newLabelColor" value="#000000">\n      <button id="addNewLabel">新しいラベルを追加</button>\n    `;const n=e.target.getBoundingClientRect();t.style.position="absolute",t.style.top=`${n.bottom+window.scrollY}px`,t.style.left=`${n.left+window.scrollX}px`,document.body.appendChild(t);const i=document.getElementById("selectExistingLabel"),o=document.getElementById("existingLabels"),a=document.getElementById("newLabelName"),l=document.getElementById("newLabelColor");i&&o&&i.addEventListener("click",(()=>{const e=o.value;e&&(this.addExistingLabel(e),t.remove())}));const s=document.getElementById("addNewLabel");s&&a&&l&&s.addEventListener("click",(()=>{const e=a.value,n=l.value;if(e){const i=this.addNewLabelToManager(e,n);this.addExistingLabel(i),t.remove()}})),document.addEventListener("click",(n=>{const i=n.target;t.contains(i)||i===e.target||t.remove()}),{once:!0})}addExistingLabel(e){this.labels.includes(e)||(this.labels.push(e),this.updateLabels(),b())}addNewLabelToManager(e,t){k.addLabel(e,t);const n=e;return this.addExistingLabel(n),b(),n}setupEventListeners(e){let t,n,i;e.addEventListener("touchstart",(e=>{this.isEditing||(n=e.touches[0].clientX,i=e.touches[0].clientY,t=window.setTimeout((()=>{this.showContextMenu(e)}),500))})),e.addEventListener("touchmove",(e=>{this.isEditing||(Math.abs(e.touches[0].clientX-n)>10||Math.abs(e.touches[0].clientY-i)>10)&&clearTimeout(t)})),e.addEventListener("touchend",(()=>{this.isEditing||clearTimeout(t)}))}updateLabels(){let e=this.element.querySelector(".tray-labels");if(!e){const t=this.element.querySelector(".tray-title-container");t&&(e=document.createElement("div"),e.classList.add("tray-labels"),t.appendChild(e))}e&&(e.innerHTML="",this.labels&&this.labels.length>0&&(e.style.display="block"),this.labels.forEach((t=>{const n=k.getLabel(t);if(n){const i=document.createElement("span");i.classList.add("tray-label"),i.textContent=t,i.style.backgroundColor=n,i.addEventListener("click",(e=>this.onLabelClick(e,t))),e.appendChild(i),k.registLabeledTray(t,this)}})))}onLabelClick(e,t){e.stopPropagation(),confirm(`Do you want to remove the label "${t}"?`)&&this.removeLabel(t)}removeLabel(e){this.labels=this.labels.filter((t=>t!==e)),k.unregisterLabeledTray(e,this),this.updateLabels(),b()}updateFlexDirection(){const e=this.element.querySelector(".tray-content");e&&(e.style.flexDirection=this.flexDirection,e.style.display="flex")}updateChildrenAppearance(){this.children.forEach((e=>{"row"===this.flexDirection?e.element.style.width="50%":e.element.style.width="100%"}))}removeChild(e){this.children=this.children.filter((t=>t.id!==e)),this.updateAppearance()}updateBorderColor(e){const t=this.element;t&&(t.style.borderLeftColor=e,t.style.borderLeftWidth="3px",t.style.borderLeftStyle="solid",t.style.borderBottomColor=e,t.style.borderBottomWidth="3px",t.style.borderBottomStyle="solid")}changeBorderColor(e){this.updateBorderColor(e),b()}setupTitleEditing(e){e.addEventListener("dblclick",(t=>{t.stopPropagation(),this.startTitleEdit(e),b()}))}toggleFold(){this.isFolded=!this.isFolded,this.foldChildren(),this.updateAppearance()}foldChildren(){this.isFolded&&this.children.forEach((e=>{e.isFolded=!0,e.updateAppearance(),e.foldChildren()}))}updateAppearance(){const e=this.element.querySelector(".tray-content"),t=this.element.querySelector(".tray-fold-button"),n=this.element.querySelector(".tray-fold-button-right");e&&t&&n&&(this.children.length?(t.style.display="inline-block",n.style.display="inline-block",this.isFolded?(e.style.display="none",t.textContent="▶",t.style.display="inline-block",n.textContent="▼",n.style.display="none"):(this.updateBorderColor(this.borderColor),e.style.display="block",t.textContent="▼",t.style.display="none",n.textContent="▶",n.style.display="inline-block",this.updateFlexDirection())):(e.style.display="none",t.style.display="none"))}startTitleEdit(e){this.isEditing=!0,e.setAttribute("contenteditable","true");const t=document.createRange();t.selectNodeContents(e);const n=window.getSelection();n&&(n.removeAllRanges(),n.addRange(t)),e.addEventListener("keydown",(t=>{"Enter"!==t.key||t.shiftKey||(t.preventDefault(),e.blur())})),e.addEventListener("blur",(()=>{this.finishTitleEdit(e)}))}cancelTitleEdit(e){this.isEditing=!1,e.setAttribute("contenteditable","false"),e.textContent=this.name}onContextMenuButtonClick(e){e.preventDefault(),e.stopPropagation(),this.showContextMenu(e)}showContextMenu(e){this.onContextMenu(e)}finishTitleEdit(e){e.setAttribute("contenteditable","false"),this.name=(e.textContent||"").trim(),e.textContent=this.name,this.isEditing=!1,b()}onDragStart(e){e.stopPropagation(),e.dataTransfer&&(e.dataTransfer.setData("text/plain",this.id),e.dataTransfer.effectAllowed="move")}onDragOver(e){e.preventDefault(),e.stopPropagation(),e.dataTransfer&&(e.dataTransfer.dropEffect="move")}setupKeyboardNavigation(e){e.tabIndex=0,e.addEventListener("keydown",this.handleKeyDown.bind(this))}handleKeyDown(e){if(!C)if(e.stopPropagation(),this.isEditing)switch(e.key){case"Enter":e.shiftKey||(e.preventDefault(),this.finishTitleEdit(e.target));break;case"Escape":e.preventDefault(),this.cancelTitleEdit(e.target)}else switch(this.element.focus(),e.key){case"ArrowUp":e.preventDefault(),this.moveFocus("up");break;case"ArrowDown":e.preventDefault(),this.moveFocus("down");break;case"ArrowLeft":e.preventDefault(),this.moveFocus("left");break;case"ArrowRight":e.preventDefault(),this.moveFocus("right");break;case"Enter":e.preventDefault(),e.ctrlKey?this.addNewChild():e.shiftKey?this.toggleEditMode():this.toggleFold();break;case"Delete":e.preventDefault(),e.ctrlKey&&this.deleteTray();break;case"c":e.ctrlKey&&(e.preventDefault(),this.copyTray());break;case"x":e.ctrlKey&&(e.preventDefault(),this.cutTray());break;case"v":e.ctrlKey&&(e.preventDefault(),this.pasteTray())}}moveFocus(e){if(this.isEditing)return;if(C)return;let n;switch(e){case"up":n=this.getPreviousSibling();break;case"down":n=this.getNextSibling();break;case"left":n=t(this.parentId);break;case"right":n=this.children[0]}n&&n.element.focus()}getPreviousSibling(){if(this.parentId){const e=t(this.parentId),n=e.children.indexOf(this);return e.children[n-1]||null}return null}getNextSibling(){if(this.parentId){const e=t(this.parentId),n=e.children.indexOf(this);return e.children[n+1]||null}return null}toggleEditMode(){const e=this.element.querySelector(".tray-title");e&&("true"===e.getAttribute("contenteditable")?this.finishTitleEdit(e):this.startTitleEdit(e))}addNewChild(){const e=new T(this.id,Date.now().toString(),"New Tray");this.addChild(e),this.isFolded=!1,this.updateAppearance();const t=e.element.querySelector(".tray-title");e.startTitleEdit(t)}onDrop(e){var n;e.preventDefault(),e.stopPropagation(),this.isFolded&&this.toggleFold(),this.updateAppearance();const i=null===(n=e.dataTransfer)||void 0===n?void 0:n.getData("text/plain");if(!i)return;const o=t(i);if(!o)return;const a=t(o.parentId);a&&a.removeChild(i),this.children.unshift(o),o.parentId=this.id;const l=this.element.querySelector(".tray-content");l&&l.insertBefore(o.element,l.firstChild),o.element.style.display="block",this.isFolded=!1,this.updateAppearance(),b()}onDragEnd(e){e.stopPropagation(),this.element.classList.remove("drag-over"),this.element.style.display="block"}onDoubleClick(e){e.stopPropagation();const t=new T(this.id,Date.now().toString(),"New Tray");this.addChild(t),this.isFolded=!1,this.updateAppearance();const n=t.element.querySelector(".tray-title");n&&t.startTitleEdit(n)}onMouseOver(e){}addChild(e){this.children.unshift(e),e.parentId=this.id;const t=this.element.querySelector(".tray-content");if(t&&t.insertBefore(e.element,t.firstChild),1===this.children.length){const e="#f5f5f5"==this.borderColor?function(){let e="#";for(let t=0;t<6;t++)e+="0123456789ABCDEF"[Math.floor(16*Math.random())];return e}():this.borderColor;console.log("#f5f5f5"===this.borderColor,e,this.borderColor),this.borderColor=e,this.updateBorderColor(this.borderColor),this.updateAppearance()}}onContextMenu(e){e.preventDefault(),e.stopPropagation(),C=!0;const t=document.querySelector(".context-menu");null==t||t.remove();const n=this.borderColor||"#f5f5f5",i=document.createElement("div");i.classList.add("context-menu"),i.setAttribute("tabindex","-1"),i.innerHTML=`\n      <div class="menu-item" data-action="fetchTrayFromServer" tabindex="0">Fetch Tray from Server</div>\n      <div class="menu-item" data-action="networkSetting" tabindex="1">networkSetting</div>\n      <div class="menu-item" data-action="open_this_in_other" tabindex="2">Open This in Other</div>\n      <div class="menu-item" data-action="toggleFlexDirection" tabindex="3">Toggle Flex Direction</div>\n      <div class="menu-item" data-action="copy" tabindex="0">Copy</div>\n      <div class="menu-item" data-action="paste" tabindex="0">Paste</div>\n      <div class="menu-item" data-action="cut" tabindex="0">Cut</div>\n      <div class="menu-item" data-action="delete" tabindex="0">Remove</div>\n      <div class="menu-item" data-action="add_fetch_networkTray_to_child" tabindex="0">Add Fetch NetworkTray to Child</div>\n      <div class="menu-item" data-action="add_child_from_localStorage" tabindex="0">Add Child from Local Storage</div>\n      <div class="menu-item" data-action="addLabelTray" tabindex="0">Add Label Tray</div>\n      <div class="menu-item" data-action="addLabel" tabindex="0">Add Label</div>\n      <div class="menu-item" data-action="removeLabel" tabindex="0">Edit Labels</div>\n      <div class="menu-item" data-action="outputMarkdown" tabindex="0">Output as Markdown</div>\n      <div class="menu-item" data-action="addTemplateTray" tabindex="0">Add Template Tray</div>\n      <div class="menu-item" tabindex="0">\n        <input type="color" id="borderColorPicker" value="${n}">\n      </div>\n    `,document.body.appendChild(i),this.positionMenu(e,i);const o=i.querySelectorAll(".menu-item");let a=0;document.addEventListener("keydown",(e=>{"ArrowDown"===e.key||"ArrowUp"===e.key?(o[a].classList.remove("focused"),a="ArrowDown"===e.key?(a+1)%o.length:(a-1+o.length)%o.length,o[a].classList.add("focused"),o[a].focus()):"Enter"===e.key?o[a].click():"Escape"===e.key&&i.remove()}).bind(this)),o[0].classList.add("focused"),o[0].focus(),i.querySelector("#borderColorPicker").addEventListener("change",(e=>{const t=e.target;this.borderColor=t.value,this.changeBorderColor(t.value),this.updateAppearance(),i.remove()}));const l=e=>{i.contains(e.target)||(i.remove(),document.removeEventListener("click",l),C=!1)};i.addEventListener("click",(t=>{const n=t.target.getAttribute("data-action");n&&this.executeMenuAction(n,e,i)})),document.addEventListener("click",l),this.setupKeyboardNavigation(this.element),C=!1}positionMenu(e,t){const n=window.innerWidth,i=window.innerHeight;let o,a;e instanceof MouseEvent?(o=e.clientX,a=e.clientY):e instanceof TouchEvent&&e.touches.length>0?(o=e.touches[0].clientX,a=e.touches[0].clientY):(o=0,a=0),t.style.visibility="hidden",t.style.display="block",t.style.position="absolute",setTimeout((()=>{const e=t.offsetWidth,l=t.offsetHeight;o=o>n/2?o-e:o,a=a>i/2?a-l:a,o=Math.max(0,Math.min(o,n-e)),a=Math.max(0,Math.min(a,i-l)),t.style.left=`${o}px`,t.style.top=`${a}px`,t.style.visibility="visible"}),0)}executeMenuAction(e,t,n){switch(e){case"copy":this.copyTray();break;case"rename":this.renameTray();break;case"cut":this.cutTray();break;case"paste":this.pasteTray();break;case"addLabel":this.showLabelSelector(t);break;case"removeLabel":this.showLabelRemover();break;case"delete":this.deleteTray();break;case"toggleFlexDirection":this.toggleFlexDirection();break;case"networkSetting":!function(e){const t=prompt("ホストURLを入力してください (空欄の場合、nullになります):",e.host_url||""),n=prompt("ファイル名を入力してください (空欄の場合、nullになります):",e.filename||"");e.host_url=t?""===t.trim()?null:t:null,e.filename=n?""===n.trim()?null:n:null}(this),b();break;case"add_child_from_localStorage":this.add_child_from_localStorage();break;case"fetchTrayFromServer":!function(e){const t=localStorage.getItem("defaultServer")||"",n=prompt("Enter server URL:",t);n&&fetch(`${n}/tray/list`,{method:"GET"}).then((e=>{if(!e.ok)throw new Error("Network response was not ok");return e.json()})).then((t=>{!function(e,t,n){const i=document.createElement("div");i.classList.add("tray-selection-dialog"),i.innerHTML=`\n        <h3>Select a tray to add:</h3>\n        <select id="tray-select">\n          ${n.map((e=>`<option value="${e}">${e}</option>`)).join("")}\n        </select>\n        <button id="add-tray-btn">Add Tray</button>\n        <button id="cancel-btn">Cancel</button>\n      `,document.body.appendChild(i);const o=document.getElementById("add-tray-btn"),a=document.getElementById("cancel-btn"),l=document.getElementById("tray-select");o.addEventListener("click",(()=>{const n=l.value;!function(e,t,n){r(this,void 0,void 0,(function*(){try{const i=yield fetch(`${t}/tray/load`,{method:"GET",headers:{filename:n}});if(!i.ok)throw new Error("Network response was not ok");const o=yield i.json();e.addChild(x(JSON.stringify(o)))}catch(e){console.error("Error:",e),alert("Failed to add tray from server.")}}))}(e,t,n),i.remove()})),a.addEventListener("click",(()=>{i.remove()}))}(e,n,t.files)})).catch((e=>{console.error("Error:",e),alert("Failed to fetch tray list from server.")}))}(this)}n.remove()}showLabelSelector(e){const t=document.querySelector(".label-selector");null==t||t.remove();const n=document.createElement("div");n.classList.add("label-selector"),n.innerHTML=`\n      <select id="existingLabels">\n        <option value="">-- Select existing label --</option>\n        ${Object.entries(k.getAllLabels()).map((([e,t])=>`<option value="${e}" style="background-color: ${t};">${e}</option>`)).join("")}\n      </select>\n      <button id="selectExistingLabel">Select</button>\n      <div>or</div>\n      <input type="text" id="newLabelName" placeholder="New label name">\n      <input type="color" id="newLabelColor" value="#000000">\n      <button id="addNewLabel">Add new label</button>\n    `;const[i,o]=this.getEventCoordinates(e);n.style.position="fixed",n.style.top=`${o}px`,n.style.left=`${i}px`,document.body.appendChild(n);const a=document.getElementById("selectExistingLabel"),l=document.getElementById("existingLabels"),s=document.getElementById("newLabelName"),r=document.getElementById("newLabelColor"),d=document.getElementById("addNewLabel");a&&l&&a.addEventListener("click",(()=>{const e=l.value;e&&(this.addExistingLabel(e),n.remove())})),d&&s&&r&&d.addEventListener("click",(()=>{const e=s.value,t=r.value;if(e){const i=this.addNewLabelToManager(e,t);this.addExistingLabel(i),n.remove()}})),document.addEventListener("click",(e=>{const t=e.target;n.contains(t)||t.closest(".context-menu")||n.remove()}),{once:!0})}getEventCoordinates(e){return e instanceof MouseEvent?[e.clientX,e.clientY]:e instanceof TouchEvent&&e.touches.length>0?[e.touches[0].clientX,e.touches[0].clientY]:[0,0]}showLabelRemover(){const e=document.createElement("div");e.classList.add("label-remover"),e.innerHTML=`\n      <h3>Select labels to remove:</h3>\n      ${this.labels.map((e=>`\n          <div>\n            <input type="checkbox" id="${e}" value="${e}">\n            <label for="${e}">${e}</label>\n          </div>\n        `)).join("")}\n      <button id="removeLabelBtn">Remove Selected Labels</button>\n    `,document.body.appendChild(e);const t=document.getElementById("removeLabelBtn");t&&t.addEventListener("click",(()=>{e.querySelectorAll('input[type="checkbox"]:checked').forEach((e=>{this.removeLabel(e.value)})),e.remove()}))}copyTray(){const e=g(l(this));navigator.clipboard.writeText(e)}renameTray(){const e=this.element.querySelector(".tray-title");e&&(e.setAttribute("contenteditable","true"),b())}cutTray(){const e=g(l(this));navigator.clipboard.writeText(e)}pasteTray(){navigator.clipboard.readText().then((e=>{try{let t=x(e);if(!t)return;this.addChild(t)}catch(t){e.split("\n").filter((e=>""!==e.trim())).map((e=>new T(this.id,a(),e))).map((e=>this.addChild(e)))}}))}deleteTray(){const e=t(this.parentId),n=e.children.findIndex((e=>e.id===this.id));e.removeChild(this.id),this.element.remove(),this.moveFocusAfterDelete(e,n),b()}moveFocusAfterDelete(e,t){let n;n=e.children.length>0?t<e.children.length?e.children[t].element:e.children[e.children.length-1].element:e.element,n&&n.focus()}add_child_from_localStorage(){const e=prompt("Input the sessionId","");if(!e)return;const t=localStorage.getItem(e);if(t){const e=x(JSON.parse(t));e&&this.addChild(e)}}showNetworkOptions(){let e;e=this.host_url?this.host_url:localStorage.getItem("defaultServer");const t=prompt("Enter URL:",e||""),n=prompt("Enter filename:",this.filename?this.filename:"");t&&(this.host_url=t),n&&(this.filename=n),b()}}T.colorPalette=["#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#98D8C8","#F7DC6F","#BB8FCE","#82E0AA","#F8C471","#85C1E9","#f5f5f5"],T.templates={Task:{name:"tasker",children:["PLANNING","PLANNED","PROGRESS","DONE"],labels:[]},"Project Structure":{name:"Project Structure",children:[{name:"思索"},{name:"実装方針"},{name:"実装中"}]},importance_urgence:{name:"importance - urgence",children:["1-1","1-0","0-1","0-0"]},importance:{name:"konsaruImportance",children:["MUST","SHOULD","COULD","WONT"]}},window.addEventListener("DOMContentLoaded",(()=>{let e=n("sessionId");if("new"==e){let e=a();window.location.replace(window.location.href.replace("?sessionId=new","?sessionId="+e))}if(e?f(e):f(),console.log("loaded"),e){const t=localStorage.getItem(e+"_title");t&&(document.title=t)}const{leftBar:t}=m();document.body.insertBefore(t,document.body.firstChild);const o=D();document.body.appendChild(o);const l=i();E=w.get(l),l.focus()}));const S=D();function D(){const e=document.createElement("div");e.classList.add("action-buttons");const t=document.createElement("button");t.textContent="+",t.classList.add("action-button","add-button"),t.addEventListener("click",A);const n=document.createElement("button");return n.textContent="↩",n.classList.add("action-button","insert-button"),n.addEventListener("click",_),e.appendChild(t),e.appendChild(n),e}function A(){const e=t(E.parentId);if(e){const t=new T(e.id,Date.now().toString(),"New Tray");e.addChild(t),e.isFolded=!1,e.updateAppearance(),t.element.focus();const n=t.element.querySelector(".tray-title");t.startTitleEdit(n)}}function _(){if(!E)return;const e=new T(E.id,Date.now().toString(),"New Tray");E.addChild(e),E.isFolded=!1,E.updateAppearance(),e.element.focus();const t=e.element.querySelector(".tray-title");e.startTitleEdit(t)}document.body.appendChild(S)})();