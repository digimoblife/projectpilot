/**
 * Helper utilitas untuk ekspor dan pengunduhan file Markdown secara aman di browser.
 * Memastikan object URL selalu dibersihkan (revoked) setelah unduhan dipicu.
 */
export function downloadMarkdownFile(title: string, content: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cleanFileName = (title.trim() || "dokumen-markdown").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanFileName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Lepas object URL setelah jeda agar peramban selesai memproses unduhan
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch (err) {
    console.error("Gagal mengunduh file markdown:", err);
    return false;
  }
}
