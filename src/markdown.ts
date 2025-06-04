import { Tray } from "./tray";
import { generateUUID } from "./utils";

/** 再帰的に Tray → Markdown */
export function trayToMarkdown(tray: Tray, depth = 0): string {
  const indent = "  ".repeat(depth);           // インデントを半角 2 で統一
  const title  = tray.name.replace(/\n/g, " "); // 改行を 1 行に
  let md = `${indent}- ${title}\n`;
  for (const child of tray.children) {
    md += trayToMarkdown(child, depth + 1);
  }
  return md;
}

/** Markdown をクリップボードに書き込み & 自動ダウンロード */
export function exportMarkdown(root: Tray) {
  const md = trayToMarkdown(root);

  // ① クリップボード
  if (navigator.clipboard) {
    navigator.clipboard.writeText(md).catch(console.error);
  }

  // ② 自動ダウンロード
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href        = url;
  a.download    = `${root.name || "tray"}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse a markdown list and append the entries as children of the given tray. */
export function addMarkdownToTray(markdown: string, parent: Tray) {
  const lines = markdown.split(/\r?\n/).filter((l) => l.trim() !== "");
  const lastAt: Tray[] = [];
  for (const line of lines) {
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    const trimmed = line.trim().replace(/^[-*]\s*/, "");
    const p = indent === 0 ? parent : lastAt[indent - 1] || parent;
    const child = new Tray(p.id, generateUUID(), trimmed);
    p.addChild(child);
    lastAt[indent] = child;
    lastAt.length = indent + 1;
  }
}
