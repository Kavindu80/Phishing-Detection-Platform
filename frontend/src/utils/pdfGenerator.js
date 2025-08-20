/**
 * Utility functions for PDF generation
 */

export const optimizeImageForPDF = (canvas, maxWidth = 1200) => {
  if (canvas.width <= maxWidth) {
    return canvas.toDataURL('image/jpeg', 0.85);
  }
  
  // Create a smaller canvas for optimization
  const scale = maxWidth / canvas.width;
  const optimizedCanvas = document.createElement('canvas');
  const ctx = optimizedCanvas.getContext('2d');
  
  optimizedCanvas.width = maxWidth;
  optimizedCanvas.height = canvas.height * scale;
  
  ctx.drawImage(canvas, 0, 0, optimizedCanvas.width, optimizedCanvas.height);
  
  return optimizedCanvas.toDataURL('image/jpeg', 0.85);
};

export const addPageNumbers = (pdf, totalPages) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages}`, 
      pageWidth - 30, 
      pageHeight - 10,
      { align: 'right' }
    );
  }
};

export const addWatermark = (pdf, text = 'CONFIDENTIAL') => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.setFontSize(50);
  pdf.setTextColor(200, 200, 200);
  pdf.text(
    text,
    pageWidth / 2,
    pageHeight / 2,
    {
      align: 'center',
      angle: 45
    }
  );
};

export const createTableOfContents = (sections) => {
  return `
    <div style="page-break-after: always; padding: 20px;">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
        Table of Contents
      </h2>
      <div style="font-size: 14px; line-height: 2;">
        ${sections.map((section, index) => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc;">
            <span>${index + 1}. ${section.title}</span>
            <span>${section.page}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  return `${Number(value).toFixed(decimals)}%`;
};

export const getSecurityRiskLevel = (phishingCount, totalCount) => {
  if (totalCount === 0) return { level: 'UNKNOWN', color: '#6b7280' };
  
  const phishingRatio = phishingCount / totalCount;
  
  if (phishingRatio >= 0.1) return { level: 'HIGH', color: '#dc2626' };
  if (phishingRatio >= 0.05) return { level: 'MEDIUM', color: '#eab308' };
  return { level: 'LOW', color: '#22c55e' };
};

export const generateExecutiveSummary = (data) => {
  const totalScans = data.scanHistory?.length || 0;
  const phishingScans = data.scanHistory?.filter(scan => scan.verdict === 'phishing').length || 0;
  const riskLevel = getSecurityRiskLevel(phishingScans, totalScans);
  
  return {
    totalScans,
    phishingScans,
    riskLevel: riskLevel.level,
    riskColor: riskLevel.color,
    avgConfidence: totalScans > 0 
      ? (data.scanHistory.reduce((sum, scan) => sum + (scan.confidence || 0), 0) / totalScans).toFixed(1)
      : 0
  };
};

export default {
  optimizeImageForPDF,
  addPageNumbers,
  addWatermark,
  createTableOfContents,
  formatCurrency,
  formatPercentage,
  getSecurityRiskLevel,
  generateExecutiveSummary
}; 