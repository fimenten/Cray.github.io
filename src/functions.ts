import { deserialize, saveToIndexedDB, serialize } from "./io";
import { Tray } from "./tray";
import { cloneTray, generateUUID, getTrayFromId } from "./utils";
import { addMarkdownToTray } from "./markdown";

export function meltTray(tray: Tray) {
  const parentTray = getTrayFromId(tray.parentId) as Tray;
  tray.children.map((t) => {
    parentTray.addChild(t);
  });
}
export function outputAsMarkdown(tray: Tray, depth = 0): string {
  // 深さに応じたスペース（ここでは2スペースずつ）
  const indent = "  ".repeat(depth);
  // 現ノードを出力
  let markdown = `${indent}- ${tray.name}\n`;

  // 子要素は depth+1 で再帰
  for (const child of tray.children) {
    markdown += outputAsMarkdown(child, depth + 1);
  }

  return markdown;
}

export function showMarkdownOutput(tray: Tray) {
  const markdown = outputAsMarkdown(tray);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const outputWindow = window.open("", "_blank");
  if (!outputWindow) {
    return;
  }
  outputWindow.document.write(`
          <html>
            <head>
              <title>Tray Structure as Markdown</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
                button { margin: 10px 5px; padding: 10px 15px; cursor: pointer; }
              </style>
            </head>
            <body>
              <h1>Tray Structure as Markdown</h1>
              <pre>${markdown}</pre>
              <button onclick="copyToClipboard()">Copy to Clipboard</button>
              <button onclick="downloadMarkdown()">Download Markdown</button>
              <script>
                function copyToClipboard() {
                  const pre = document.querySelector('pre');
                  const textArea = document.createElement('textarea');
                  textArea.value = pre.textContent;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  alert('Copied to clipboard!');
                }

                function downloadMarkdown() {
                  const link = document.createElement('a');
                  link.href = '${url}';
                  link.download = 'tray_structure.md';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              </script>
            </body>
          </html>
        `);
}

export function copyMarkdownToClipboard(tray: Tray) {
  const markdown = outputAsMarkdown(tray);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown).catch(() => {});
  }
}

export function downloadMarkdown(tray: Tray) {
  const markdown = outputAsMarkdown(tray);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tray_structure.md";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}


export function getEventCoordinates(
  event: MouseEvent | TouchEvent,
): [number, number] {
  if (event instanceof MouseEvent) {
    return [event.clientX, event.clientY];
  } else if (event instanceof TouchEvent && event.touches.length > 0) {
    return [event.touches[0].clientX, event.touches[0].clientY];
  }
  return [0, 0];
}

export function copyTray(tray: Tray) {
  const serialized = serialize(cloneTray(tray));
  navigator.clipboard.writeText(serialized);
}

export function renameTray(tray: Tray) {
  const title = tray.element.querySelector(".tray-title");
  if (!title) {
    return;
  }
  title.setAttribute("contenteditable", "true");
  // title.focus();
  saveToIndexedDB();
}

export function cutTray(tray: Tray) {
  const serialized = serialize(cloneTray(tray));
  navigator.clipboard.writeText(serialized);
}

export async function pasteFromClipboardInto(tray: Tray) {
  if (navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const url = URL.createObjectURL(blob);
            const newTray = new Tray(tray.id, generateUUID(), url);
            tray.addChild(newTray);
            return;
          }
        }
      }
    } catch {
      // ignore errors and fall back to readText
    }
  }
  const str = await navigator.clipboard.readText();
  try {
    let newTray = deserialize(str);
    if (!newTray) {
      return;
    }
    tray.addChild(newTray);
  } catch {
    addMarkdownToTray(str, tray);
  }
}

export function deleteTray(tray: Tray) {
  const parent = getTrayFromId(tray.parentId) as Tray;
  const indexInParent = parent.children.findIndex(
    (child) => child.id === tray.id,
  );

  parent.removeChild(tray.id);
  tray.element.remove();

  tray.moveFocusAfterDelete(parent, indexInParent);

  saveToIndexedDB();
}