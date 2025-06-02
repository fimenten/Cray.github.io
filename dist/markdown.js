/** 再帰的に Tray → Markdown */
export function trayToMarkdown(tray, depth = 0) {
    const indent = "  ".repeat(depth); // インデントを半角 2 で統一
    const title = tray.name.replace(/\n/g, " "); // 改行を 1 行に
    let md = `${indent}- ${title}\n`;
    for (const child of tray.children) {
        md += trayToMarkdown(child, depth + 1);
    }
    return md;
}
/** Markdown をクリップボードに書き込み & 自動ダウンロード */
export function exportMarkdown(root) {
    const md = trayToMarkdown(root);
    // ① クリップボード
    if (navigator.clipboard) {
        navigator.clipboard.writeText(md).catch(console.error);
    }
    // ② 自動ダウンロード
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${root.name || "tray"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
