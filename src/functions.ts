import { Tray} from "./tray";
import { getTrayFromId } from "./utils";

export function meltTray(tray:Tray){
    const parentTray = getTrayFromId(tray.parentId) as Tray;
    tray.children.map(t=>{parentTray.addChild(t)})
}
export function outputAsMarkdown(tray:Tray) {
    let markdown = "- " + tray.name + "\n";

    if (tray.children.length > 0) {
      tray.children.forEach((child) => {
        markdown += outputAsMarkdown(child);
      });
    }

    return markdown;
  }
export function showMarkdownOutput(tray:Tray) {
      const markdown = outputAsMarkdown(tray);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);

      const outputWindow = window.open("", "_blank");
      if (!outputWindow){return}
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