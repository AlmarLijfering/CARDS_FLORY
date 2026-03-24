const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');


function readFilename(headers) {
  const disposition = headers.get('content-disposition');
  if (!disposition) {
    return 'therapy-card-report.pdf';
  }

  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || 'therapy-card-report.pdf';
}


export async function downloadPdf(payload) {
  const response = await fetch(`${API_URL}/api/generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to generate the PDF report.');
  }

  const blob = await response.blob();
  const filename = readFilename(response.headers);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

