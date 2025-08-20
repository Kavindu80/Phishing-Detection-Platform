import React, { useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import Button from '../common/Button';
import jsPDF from 'jspdf';
import { useAuth } from '../../hooks/useAuth';
import Chart from 'chart.js/auto';

const ExportData = ({ data, scanHistory, timeRange = '30d' }) => {
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();

  const generateProfessionalPDFReport = async () => {
    setExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Calculate accurate statistics
      const stats = calculateAccurateStatistics(data, scanHistory);
      
      // Generate charts as images
      const chartImages = await generateChartImages(stats);
      
      let currentY = margin;
      
      // Page 1: Cover Page and Executive Summary
      currentY = addCoverPage(pdf, stats, currentY, margin, contentWidth);
      
      // Page 2: Threat Analysis with Charts
      pdf.addPage();
      currentY = margin;
      currentY = addThreatAnalysisPage(pdf, stats, chartImages, currentY, margin);
      
      // Page 3: Detailed Data Tables
      pdf.addPage();
      currentY = margin;
      currentY = addDetailedTablesPage(pdf, stats, scanHistory, currentY, margin, contentWidth);
      
      // Page 4: Recommendations and Appendix
      if (currentY > pageHeight - 50) {
        pdf.addPage();
        currentY = margin;
      }
      addRecommendationsPage(pdf, stats, currentY, margin, contentWidth);
      
      // Add page numbers and footers
      addPageNumbersAndFooters(pdf);
      
      // Download the PDF
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `PhishGuard_Security_Analysis_${user?.username || 'User'}_${timestamp}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Error generating professional PDF report:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const calculateAccurateStatistics = (analyticsData, history) => {
    const totalScans = history?.length || 0;
    const safeScans = history?.filter(scan => scan.verdict === 'safe').length || 0;
    const suspiciousScans = history?.filter(scan => scan.verdict === 'suspicious').length || 0;
    const phishingScans = history?.filter(scan => scan.verdict === 'phishing').length || 0;
    
    // Calculate accurate percentages
    const safePercentage = totalScans > 0 ? ((safeScans / totalScans) * 100).toFixed(1) : 0;
    const suspiciousPercentage = totalScans > 0 ? ((suspiciousScans / totalScans) * 100).toFixed(1) : 0;
    const phishingPercentage = totalScans > 0 ? ((phishingScans / totalScans) * 100).toFixed(1) : 0;
    
    // Calculate confidence statistics
    const confidenceScores = history?.map(scan => scan.confidence || 0) || [];
    const avgConfidence = confidenceScores.length > 0 
      ? (confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length).toFixed(1)
      : 0;
    const maxConfidence = confidenceScores.length > 0 ? Math.max(...confidenceScores).toFixed(1) : 0;
    const minConfidence = confidenceScores.length > 0 ? Math.min(...confidenceScores).toFixed(1) : 0;
    
    // Language distribution
    const languageStats = {};
    history?.forEach(scan => {
      const lang = scan.language || 'Unknown';
      languageStats[lang] = (languageStats[lang] || 0) + 1;
    });
    
    // Time-based analysis
    const last7Days = getRecentScans(history, 7);
    const last30Days = getRecentScans(history, 30);
    
    // Threat level assessment
    const threatLevel = assessThreatLevel(phishingScans, suspiciousScans, totalScans);
    
    // Accuracy metrics from analytics data
    const accuracyMetrics = analyticsData?.accuracyMetrics || {};
    
    return {
      totalScans,
      safeScans,
      suspiciousScans,
      phishingScans,
      safePercentage: parseFloat(safePercentage),
      suspiciousPercentage: parseFloat(suspiciousPercentage),
      phishingPercentage: parseFloat(phishingPercentage),
      avgConfidence: parseFloat(avgConfidence),
      maxConfidence: parseFloat(maxConfidence),
      minConfidence: parseFloat(minConfidence),
      languageStats,
      last7Days,
      last30Days,
      threatLevel,
      accuracyMetrics,
      timeRange: getTimeRangeDisplay(timeRange)
    };
  };

  const generateChartImages = async (stats) => {
    const chartImages = {};
    
    // Create temporary canvas for charts
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Threat Distribution Pie Chart
    chartImages.threatDistribution = await createThreatDistributionChart(canvas, ctx, stats);
    
    // Confidence Distribution Bar Chart
    chartImages.confidenceDistribution = await createConfidenceChart(canvas, ctx, stats);
    
    // Language Distribution Chart
    if (Object.keys(stats.languageStats).length > 0) {
      chartImages.languageDistribution = await createLanguageChart(canvas, ctx, stats);
    }
    
    return chartImages;
  };

  const createThreatDistributionChart = async (canvas, ctx, stats) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Suspicious', 'Phishing'],
        datasets: [{
          data: [stats.safeScans, stats.suspiciousScans, stats.phishingScans],
          backgroundColor: ['#22c55e', '#eab308', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const percentage = ((context.parsed / stats.totalScans) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const imageData = canvas.toDataURL('image/png');
    chart.destroy();
    
    return imageData;
  };

  const createConfidenceChart = async (canvas, ctx, stats) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Average', 'Maximum', 'Minimum'],
        datasets: [{
          label: 'Confidence Score (%)',
          data: [stats.avgConfidence, stats.maxConfidence, stats.minConfidence],
          backgroundColor: ['#6366f1', '#22c55e', '#f59e0b'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const imageData = canvas.toDataURL('image/png');
    chart.destroy();
    
    return imageData;
  };

  const createLanguageChart = async (canvas, ctx, stats) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const languages = Object.keys(stats.languageStats).slice(0, 5); // Top 5 languages
    const counts = languages.map(lang => stats.languageStats[lang]);
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: languages.map(lang => getLanguageName(lang)),
        datasets: [{
          label: 'Email Count',
          data: counts,
          backgroundColor: '#6366f1',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const imageData = canvas.toDataURL('image/png');
    chart.destroy();
    
    return imageData;
  };

  const addCoverPage = (pdf, stats, startY, margin, contentWidth) => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55); // Gray-800
    pdf.text('PhishGuard Security Analysis Report', margin, startY + 20);
    
    // Subtitle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128); // Gray-500
    pdf.text('Comprehensive Email Security Assessment', margin, startY + 35);
    
    // Report metadata box
    pdf.setDrawColor(99, 102, 241); // Indigo-500
    pdf.setFillColor(248, 250, 252); // Gray-50
    pdf.roundedRect(margin, startY + 50, contentWidth, 40, 3, 3, 'FD');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81); // Gray-700
    pdf.text('Report Details:', margin + 10, startY + 65);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated for: ${user?.username || 'User'} (${user?.email || 'N/A'})`, margin + 10, startY + 75);
    pdf.text(`Report Date: ${currentDate}`, margin + 10, startY + 82);
    pdf.text(`Analysis Period: ${stats.timeRange}`, margin + 10, startY + 89);
    
    // Executive Summary
    let currentY = startY + 110;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Executive Summary', margin, currentY);
    
    currentY += 20;
    
    // Key metrics in a grid
    const boxWidth = (contentWidth - 20) / 3;
    const boxHeight = 35;
    
    // Safe emails box
    pdf.setFillColor(34, 197, 94, 0.1); // Green background
    pdf.setDrawColor(34, 197, 94);
    pdf.roundedRect(margin, currentY, boxWidth, boxHeight, 3, 3, 'FD');
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text(stats.safeScans.toString(), margin + boxWidth/2, currentY + 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Safe Emails', margin + boxWidth/2, currentY + 25, { align: 'center' });
    pdf.text(`${stats.safePercentage}%`, margin + boxWidth/2, currentY + 32, { align: 'center' });
    
    // Suspicious emails box
    pdf.setFillColor(234, 179, 8, 0.1); // Yellow background
    pdf.setDrawColor(234, 179, 8);
    pdf.roundedRect(margin + boxWidth + 10, currentY, boxWidth, boxHeight, 3, 3, 'FD');
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(234, 179, 8);
    pdf.text(stats.suspiciousScans.toString(), margin + boxWidth + 10 + boxWidth/2, currentY + 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Suspicious', margin + boxWidth + 10 + boxWidth/2, currentY + 25, { align: 'center' });
    pdf.text(`${stats.suspiciousPercentage}%`, margin + boxWidth + 10 + boxWidth/2, currentY + 32, { align: 'center' });
    
    // Phishing emails box
    pdf.setFillColor(220, 38, 38, 0.1); // Red background
    pdf.setDrawColor(220, 38, 38);
    pdf.roundedRect(margin + (boxWidth + 10) * 2, currentY, boxWidth, boxHeight, 3, 3, 'FD');
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 38, 38);
    pdf.text(stats.phishingScans.toString(), margin + (boxWidth + 10) * 2 + boxWidth/2, currentY + 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Phishing', margin + (boxWidth + 10) * 2 + boxWidth/2, currentY + 25, { align: 'center' });
    pdf.text(`${stats.phishingPercentage}%`, margin + (boxWidth + 10) * 2 + boxWidth/2, currentY + 32, { align: 'center' });
    
    currentY += 55;
    
    // Threat assessment
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Threat Level Assessment:', margin, currentY);
    
    const threatColor = stats.threatLevel.color;
    pdf.setFillColor(...hexToRgb(threatColor));
    pdf.roundedRect(margin + 80, currentY - 8, 40, 15, 3, 3, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(stats.threatLevel.level, margin + 100, currentY, { align: 'center' });
    
    currentY += 25;
    
    // Key findings
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const findings = [
      `Total emails analyzed: ${stats.totalScans}`,
      `Average detection confidence: ${stats.avgConfidence}%`,
      `Primary languages detected: ${Object.keys(stats.languageStats).length}`,
      `Recent threat activity: ${stats.last7Days.threats} threats in last 7 days`
    ];
    
    findings.forEach((finding, index) => {
      pdf.text(`• ${finding}`, margin + 5, currentY + (index * 8));
    });
    
    return currentY + 40;
  };

  const addThreatAnalysisPage = (pdf, stats, chartImages, startY, margin) => {
    // Page title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Threat Distribution Analysis', margin, startY + 15);
    
    let currentY = startY + 35;
    
    // Add threat distribution chart
    if (chartImages.threatDistribution) {
      pdf.addImage(chartImages.threatDistribution, 'PNG', margin, currentY, 80, 60);
      
      // Add detailed statistics table next to chart
      const tableX = margin + 90;
      const tableY = currentY;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Breakdown:', tableX, tableY + 10);
      
      // Table headers
      pdf.setDrawColor(229, 231, 235);
      pdf.setFillColor(249, 250, 251);
      pdf.rect(tableX, tableY + 15, 90, 8, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Category', tableX + 2, tableY + 20);
      pdf.text('Count', tableX + 35, tableY + 20);
      pdf.text('Percentage', tableX + 55, tableY + 20);
      pdf.text('Risk Level', tableX + 75, tableY + 20);
      
      // Table rows
      const tableData = [
        ['Safe', stats.safeScans, `${stats.safePercentage}%`, 'Low'],
        ['Suspicious', stats.suspiciousScans, `${stats.suspiciousPercentage}%`, 'Medium'],
        ['Phishing', stats.phishingScans, `${stats.phishingPercentage}%`, 'High']
      ];
      
      pdf.setFont('helvetica', 'normal');
      tableData.forEach((row, index) => {
        const rowY = tableY + 23 + (index * 8);
        pdf.rect(tableX, rowY, 90, 8, 'S');
        
        pdf.text(row[0], tableX + 2, rowY + 5);
        pdf.text(row[1].toString(), tableX + 35, rowY + 5);
        pdf.text(row[2], tableX + 55, rowY + 5);
        
        // Color-code risk level
        const riskColors = { 'Low': [34, 197, 94], 'Medium': [234, 179, 8], 'High': [220, 38, 38] };
        pdf.setTextColor(...riskColors[row[3]]);
        pdf.text(row[3], tableX + 75, rowY + 5);
        pdf.setTextColor(0, 0, 0);
      });
      
      currentY += 70;
    }
    
    // Confidence analysis section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Detection Confidence Analysis', margin, currentY + 15);
    
    currentY += 35;
    
    if (chartImages.confidenceDistribution) {
      pdf.addImage(chartImages.confidenceDistribution, 'PNG', margin, currentY, 80, 60);
      
      // Confidence statistics
      const confTableX = margin + 90;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Confidence Metrics:', confTableX, currentY + 10);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Average Confidence: ${stats.avgConfidence}%`, confTableX, currentY + 25);
      pdf.text(`Highest Confidence: ${stats.maxConfidence}%`, confTableX, currentY + 35);
      pdf.text(`Lowest Confidence: ${stats.minConfidence}%`, confTableX, currentY + 45);
      
      // Confidence interpretation
      pdf.setFont('helvetica', 'bold');
      pdf.text('Interpretation:', confTableX, currentY + 60);
      
      pdf.setFont('helvetica', 'normal');
      const interpretation = getConfidenceInterpretation(stats.avgConfidence);
      const lines = pdf.splitTextToSize(interpretation, 90);
      pdf.text(lines, confTableX, currentY + 70);
    }
    
    return currentY + 80;
  };

  const addDetailedTablesPage = (pdf, stats, history, startY, margin, contentWidth) => {
    // Page title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Detailed Scan Results', margin, startY + 15);
    
    let currentY = startY + 35;
    
    // Recent scans table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recent Email Scans (Last 20)', margin, currentY);
    
    currentY += 15;
    
    // Table setup
    const colWidths = [25, 65, 45, 20, 25];
    const colHeaders = ['Date', 'Subject', 'Sender', 'Verdict', 'Confidence'];
    let tableX = margin;
    
    // Draw table headers
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(tableX, currentY, contentWidth, 8, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    let currentX = tableX + 2;
    
    colHeaders.forEach((header, index) => {
      pdf.text(header, currentX, currentY + 5);
      currentX += colWidths[index];
    });
    
    currentY += 8;
    
    // Table rows
    const recentScans = history?.slice(0, 20) || [];
    pdf.setFont('helvetica', 'normal');
    
    recentScans.forEach((scan, index) => {
      if (currentY > 270) { // Check if we need a new page
        pdf.addPage();
        currentY = margin;
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(tableX, currentY, contentWidth, 8, 'F');
      }
      
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(tableX, currentY, contentWidth, 8, 'S');
      
      currentX = tableX + 2;
      
      // Date
      const date = new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      pdf.text(date, currentX, currentY + 5);
      currentX += colWidths[0];
      
      // Subject (truncated)
      const subject = (scan.subject || 'No Subject').substring(0, 35) + 
                     (scan.subject && scan.subject.length > 35 ? '...' : '');
      pdf.text(subject, currentX, currentY + 5);
      currentX += colWidths[1];
      
      // Sender (truncated)
      const sender = (scan.sender || 'Unknown').substring(0, 25) + 
                    (scan.sender && scan.sender.length > 25 ? '...' : '');
      pdf.text(sender, currentX, currentY + 5);
      currentX += colWidths[2];
      
      // Verdict (color-coded)
      const verdictColors = {
        'safe': [34, 197, 94],
        'suspicious': [234, 179, 8],
        'phishing': [220, 38, 38]
      };
      
      pdf.setTextColor(...(verdictColors[scan.verdict] || [0, 0, 0]));
      pdf.text(scan.verdict.toUpperCase(), currentX, currentY + 5);
      pdf.setTextColor(0, 0, 0);
      currentX += colWidths[3];
      
      // Confidence
      pdf.text(`${(scan.confidence || 0).toFixed(1)}%`, currentX, currentY + 5);
      
      currentY += 8;
    });
    
    return currentY + 20;
  };

  const addRecommendationsPage = (pdf, stats, startY, margin, contentWidth) => {
    // Recommendations section
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Security Recommendations', margin, startY + 15);
    
    let currentY = startY + 35;
    
    const recommendations = generateSmartRecommendations(stats);
    
    recommendations.forEach((rec) => {
      // Priority indicator
      const priorityColors = {
        'HIGH': [220, 38, 38],
        'MEDIUM': [234, 179, 8],
        'LOW': [34, 197, 94]
      };
      
      pdf.setFillColor(...priorityColors[rec.priority]);
      pdf.roundedRect(margin, currentY, 15, 6, 2, 2, 'F');
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(rec.priority, margin + 7.5, currentY + 4, { align: 'center' });
      
      // Recommendation text
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(rec.title, margin + 20, currentY + 4);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      const lines = pdf.splitTextToSize(rec.description, contentWidth - 25);
      pdf.text(lines, margin + 20, currentY + 12);
      
      currentY += 8 + (lines.length * 4) + 5;
    });
    
    return currentY;
  };

  const addPageNumbersAndFooters = (pdf) => {
    const pageCount = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Page number
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
      
      // Footer
      pdf.setFontSize(8);
      pdf.text('PhishGuard Security Analysis - Confidential', 15, pageHeight - 10);
      
      // Report ID
      const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
      pdf.text(`Report ID: ${reportId}`, 15, pageHeight - 5);
    }
  };

  // Helper functions
  const getRecentScans = (history, days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentScans = history?.filter(scan => new Date(scan.date) >= cutoffDate) || [];
    const threats = recentScans.filter(scan => 
      scan.verdict === 'phishing' || scan.verdict === 'suspicious'
    ).length;
    
    return { total: recentScans.length, threats };
  };

  const assessThreatLevel = (phishing, suspicious, total) => {
    if (total === 0) return { level: 'UNKNOWN', color: '#6b7280' };
    
    const threatRatio = (phishing + suspicious) / total;
    
    if (threatRatio >= 0.3) return { level: 'HIGH', color: '#dc2626' };
    if (threatRatio >= 0.15) return { level: 'MEDIUM', color: '#eab308' };
    return { level: 'LOW', color: '#22c55e' };
  };

  const getTimeRangeDisplay = (range) => {
    const displays = {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last Year',
      'all': 'All Time'
    };
    return displays[range] || 'Custom Period';
  };

  const getLanguageName = (code) => {
    const languages = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'si': 'Sinhala',
      'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian',
      'ar': 'Arabic', 'pt': 'Portuguese', 'it': 'Italian'
    };
    return languages[code] || code || 'Unknown';
  };

  const getConfidenceInterpretation = (avgConfidence) => {
    if (avgConfidence >= 90) return 'Excellent detection confidence. The system is performing optimally with very reliable threat identification.';
    if (avgConfidence >= 80) return 'Good detection confidence. The system shows strong performance with reliable threat detection.';
    if (avgConfidence >= 70) return 'Moderate confidence. Consider reviewing detection parameters for improved accuracy.';
    return 'Low confidence detected. System tuning recommended to improve detection reliability.';
  };

  const generateSmartRecommendations = (stats) => {
    const recommendations = [];
    
    if (stats.phishingPercentage > 10) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Critical Phishing Activity Detected',
        description: `${stats.phishingPercentage}% of emails are phishing attempts. Implement immediate additional security measures and user training programs.`
      });
    }
    
    if (stats.suspiciousPercentage > 20) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'High Suspicious Email Volume',
        description: `${stats.suspiciousPercentage}% of emails are flagged as suspicious. Review email filtering rules and sender authentication policies.`
      });
    }
    
    if (stats.avgConfidence < 80) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Detection Confidence Below Optimal',
        description: `Average confidence is ${stats.avgConfidence}%. Consider system calibration and training data updates.`
      });
    }
    
    if (stats.last7Days.threats > 5) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Increased Recent Threat Activity',
        description: `${stats.last7Days.threats} threats detected in the last 7 days. Monitor email traffic closely and consider temporary security measures.`
      });
    }
    
    // Always include general recommendations
    recommendations.push({
      priority: 'LOW',
      title: 'Maintain Security Best Practices',
      description: 'Continue regular email scanning, keep security awareness training current, and maintain updated threat intelligence feeds.'
    });
    
    return recommendations;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Legacy export functions for CSV/JSON
  const handleLegacyExport = (format) => {
    setExporting(true);
    
    try {
      let exportData;
      let fileName;
      let fileContent;
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format === 'json') {
        exportData = { analytics: data, scanHistory: scanHistory || [] };
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `phishguard_analytics_${timestamp}.json`;
        downloadFile(fileContent, fileName, 'application/json');
      } else {
        const historyRows = [['Date', 'Subject', 'Sender', 'Verdict', 'Confidence', 'Language']];
        
        if (scanHistory && scanHistory.length) {
          scanHistory.forEach(scan => {
            const row = [
              new Date(scan.date).toLocaleString(),
              scan.subject || 'No subject',
              scan.sender || 'Unknown',
              scan.verdict,
              Math.round(scan.confidence * 100) + '%',
              scan.language
            ];
            historyRows.push(row);
          });
        }
        
        const csvContent = historyRows.map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\\n');
        fileName = `phishguard_scan_history_${timestamp}.csv`;
        downloadFile(csvContent, fileName, 'text/csv;charset=utf-8');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  
  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative inline-block">
      <div className="flex space-x-2">
        <Button 
          variant="primary" 
          onClick={generateProfessionalPDFReport}
          disabled={exporting}
          className="flex items-center"
        >
          <FiFileText className="mr-2" />
          {exporting ? 'Generating Report...' : 'Export PDF'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleLegacyExport('csv')}
          disabled={exporting}
          className="flex items-center"
        >
          <FiDownload className="mr-2" />
          Export Data
        </Button>
      </div>
    </div>
  );
};

export default ExportData; 