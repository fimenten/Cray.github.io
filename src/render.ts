import { Tray } from "./tray";
  
export const graph: Record<string, Tray> = {};          // ← 既存のデシリアライズ結果をここに
export const rootEl = document.getElementById("root")!; // ← ルート要素
  
  // Safari 対策: requestIdleCallback ポリフィル
  const ric = window.requestIdleCallback ??
    ((cb: IdleRequestCallback) => setTimeout(() => cb({
        didTimeout: false,
        timeRemaining: () => 0
    } as any), 1));
  
  export function hydrateGraph(rootId: string) {
    rootEl.replaceChildren();                      // 1回だけ空に
    const top = createTrayLazy(graph[rootId]);
    rootEl.appendChild(top);                       // 最小限描画
  }
  
  /* ────────────────────────── *
   *  Tray 要素を“遅延ロード”で生成
   * ────────────────────────── */
  function createTrayLazy(tray: Tray): HTMLElement {
    // <details><summary> で折りたたみ UI
    const details = document.createElement("details");
    if (!tray.isFolded) details.open = true;
  
    const summary = document.createElement("summary");
    summary.textContent = tray.name;
    details.appendChild(summary);
  
    // ===== 子ノード遅延描画 =====
    if (tray.children.length) {
      const loadChildren = () => {
        // 既に描画済みならスキップ
        if (details.childElementCount > 1) return;
  
        ric((deadLine) => {
          const frag = document.createDocumentFragment();
          let i = 0;
          const BATCH = 50;                          // 1フレームで描く最大件数
  
          function work() {
            while (i < tray.children.length && deadLine.timeRemaining() > 0) {
              for (let j = 0; j < BATCH && i < tray.children.length; ++j, ++i) {
                const childId = tray.children[i].id;
                frag.appendChild(createTrayLazy(graph[childId]));
              }
            }
            details.appendChild(frag);
  
            // まだ残りがある場合は次の idle で続き
            if (i < tray.children.length) ric(work);
          }
          work();
        });
      };
  
      // ▼ ユーザが展開した瞬間だけロード
      summary.addEventListener("click", () => {
        if (details.open) loadChildren();
      }, { once: true });
  
      // 既に open=true でロードが必要な場合
      if (!tray.isFolded) loadChildren();
    }
    return details;
  }
