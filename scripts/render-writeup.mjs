import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
const md = readFileSync("docs/assignment-writeup.md", "utf8");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
function render(text) {
  let html = "",
    table = false;
  for (const line of text.replace(/([^\n])\n(?![\n|#]|\d+\.)/g, "$1 ").split("\n")) {
    if (line.startsWith("|")) {
      if (/^\|[-| ]+\|$/.test(line)) continue;
      if (!table) {
        html += "<table>";
        table = true;
      }
      html +=
        "<tr>" +
        line
          .slice(1, -1)
          .split("|")
          .map((c) => "<td>" + inline(c.trim()) + "</td>")
          .join("") +
        "</tr>";
      continue;
    }
    if (table) {
      html += "</table>";
      table = false;
    }
    if (line.startsWith("# ")) html += "<h1>" + inline(line.slice(2)) + "</h1>";
    else if (line.startsWith("## "))
      html += "<h2>" + inline(line.slice(3)) + "</h2>";
    else if (line.trim()) html += "<p>" + inline(line) + "</p>";
  }
  if (table) html += "</table>";
  return html;
}
const parts = md.split("## Page 2");
const html = `<!doctype html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:15mm 15mm 13mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#263b2e;margin:0;font-size:10.5px;line-height:1.43}h1{font-size:23px;line-height:1.2;margin:0 0 8px;letter-spacing:-.7px}h2{font-size:10px;color:#70845a;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;padding-bottom:9px;border-bottom:1px solid #dce3d4}p{margin:9px 0}strong{color:#264f34}table{border-collapse:collapse;width:100%;font-size:9.2px;line-height:1.4;margin:11px 0}td{padding:5px 7px;vertical-align:top;border-bottom:1px solid #dfe5d8}tr:first-child td{background:#edf2e5;font-weight:bold}tr:nth-child(2n+3){background:#f8faf5}.page{break-after:page}.page:last-child{break-after:auto}.page-number{font-size:8px;color:#7b8872;margin-top:12px;text-align:right}code{font-size:8px}a{color:#31593d}</style></head><body><section class="page">${render(parts[0])}<div class="page-number">GRIT · NIAT assignment prototype / 01</div></section><section class="page">${render("## Page 2" + parts[1])}<div class="page-number">GRIT · NIAT assignment prototype / 02</div></section></body></html>`;
writeFileSync("docs/assignment-writeup.html", html);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({
  path: "docs/assignment-writeup.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
const pdf = await PDFDocument.load(readFileSync("docs/assignment-writeup.pdf"));
const count = pdf.getPageCount();
console.log("PDF pages:", count);
if (count !== 2) throw new Error("Expected exactly two pages");
await page.setViewportSize({ width: 794, height: 1123 });
await page.screenshot({ path: "docs/writeup-layout.png", fullPage: true });
await browser.close();
copyFileSync("docs/assignment-writeup.pdf", "public/assignment-writeup.pdf");
