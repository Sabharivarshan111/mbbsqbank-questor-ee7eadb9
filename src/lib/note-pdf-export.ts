import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";

export interface ExportableNote {
  id: string;
  title: string;
  content: string;
  drawing_data?: string | null;
  updated_at?: string;
}

const A4 = { w: 595.28, h: 841.89 }; // pt
const MARGIN = 36;

const sanitize = (name: string) =>
  (name || "note").replace(/[^a-z0-9\-_ ]/gi, "").trim().slice(0, 60) || "note";

async function renderHtmlBlock(html: string): Promise<HTMLCanvasElement | null> {
  if (!html.trim()) return null;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:720px;padding:24px;background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;";
  host.innerText = html;
  document.body.appendChild(host);
  try {
    return await html2canvas(host, { backgroundColor: "#ffffff", scale: 2 });
  } finally {
    document.body.removeChild(host);
  }
}

function addImageWithPagination(pdf: jsPDF, canvas: HTMLCanvasElement, startY: number) {
  const imgW = A4.w - MARGIN * 2;
  const ratio = canvas.height / canvas.width;
  const imgH = imgW * ratio;
  const pageInner = A4.h - MARGIN * 2;
  let remaining = imgH;
  let yOffset = 0;
  let cursorY = startY;

  if (cursorY + Math.min(imgH, pageInner) > A4.h - MARGIN) {
    pdf.addPage();
    cursorY = MARGIN;
  }

  // Slice the canvas across pages
  while (remaining > 0) {
    const available = A4.h - MARGIN - cursorY;
    const sliceH = Math.min(remaining, available);
    const sourceY = (yOffset / imgH) * canvas.height;
    const sourceH = (sliceH / imgH) * canvas.height;

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sourceH;
    const ctx = slice.getContext("2d");
    if (ctx) ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);

    pdf.addImage(slice.toDataURL("image/png"), "PNG", MARGIN, cursorY, imgW, sliceH);
    remaining -= sliceH;
    yOffset += sliceH;
    if (remaining > 0) {
      pdf.addPage();
      cursorY = MARGIN;
    }
  }
}

function addFooter(pdf: jsPDF) {
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(140);
    pdf.text(
      `Made with Orbit MBBS QBank  ·  Page ${i} of ${pages}`,
      A4.w / 2,
      A4.h - 14,
      { align: "center" }
    );
  }
}

async function triggerDownload(pdf: jsPDF, filename: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const base64 = pdf.output("datauristring").split(",")[1];
      const res = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title: filename, url: res.uri });
      return;
    } catch {
      // fall through to web download
    }
  }
  pdf.save(filename);
}

export async function exportNoteToPdf(note: ExportableNote): Promise<void> {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(20);
  pdf.text(note.title || "Untitled", MARGIN, y + 6);
  y += 28;

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(110);
  const dateStr = note.updated_at
    ? new Date(note.updated_at).toLocaleString()
    : new Date().toLocaleString();
  pdf.text(dateStr, MARGIN, y);
  y += 18;

  // Divider
  pdf.setDrawColor(220);
  pdf.line(MARGIN, y, A4.w - MARGIN, y);
  y += 14;

  // Body text
  if (note.content?.trim()) {
    const textCanvas = await renderHtmlBlock(note.content);
    if (textCanvas) addImageWithPagination(pdf, textCanvas, y);
  } else if (!note.drawing_data) {
    pdf.setFontSize(11);
    pdf.setTextColor(150);
    pdf.text("(empty note)", MARGIN, y + 14);
  }

  // Drawing on a fresh page if present
  if (note.drawing_data) {
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setTextColor(80);
    pdf.text("Drawing", MARGIN, MARGIN);
    const img = new Image();
    img.src = note.drawing_data;
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    });
    if (img.width && img.height) {
      const maxW = A4.w - MARGIN * 2;
      const maxH = A4.h - MARGIN * 2 - 30;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      pdf.addImage(note.drawing_data, "PNG", (A4.w - w) / 2, MARGIN + 18, w, h);
    }
  }

  addFooter(pdf);
  await triggerDownload(pdf, `${sanitize(note.title)}-orbit.pdf`);
}
