export function downloadBlob(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  downloadBlob(blob, filename);
}
