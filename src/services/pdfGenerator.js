// src/services/pdfGenerator.js
import PDFDocument from 'pdfkit';

// Brand palette
const COLORS = {
  primary: '#1A1A2E',    // Deep navy
  accent: '#0F3460',     // Mid navy
  highlight: '#E94560',  // Vibrant red-pink
  light: '#F5F5F5',      // Off-white background
  white: '#FFFFFF',
  text: '#2D2D2D',
  muted: '#666666',
  border: '#E0E0E0',
};

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

/**
 * Draw a full-width coloured banner.
 */
function drawBanner(doc, color, height) {
  doc.save().rect(0, doc.y, doc.page.width, height).fill(color).restore();
}

/**
 * Add a section heading with a left accent bar.
 */
function sectionHeading(doc, text) {
  doc.moveDown(0.8);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.save().rect(x, y, 4, 20).fill(COLORS.highlight).restore();
  doc
    .font(FONTS.bold)
    .fontSize(13)
    .fillColor(COLORS.primary)
    .text(text, x + 12, y, { lineBreak: false });
  doc.moveDown(0.6);
}

/**
 * Render a bullet list.
 */
function bulletList(doc, items) {
  if (!items || items.length === 0) return;
  items.forEach((item) => {
    doc
      .font(FONTS.regular)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(`• ${item}`, { indent: 16, lineGap: 2 });
  });
  doc.moveDown(0.3);
}

/**
 * Render a label-value pair row.
 */
function labelValue(doc, label, value) {
  if (!value) return;
  doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text(label, { continued: true });
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(`  ${value}`, { lineGap: 3 });
}

/**
 * Ensure enough space remains on the page; add page break if needed.
 */
function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

/**
 * Generate a polished PDF GTM strategy document.
 * @param {object} strategy - GTM strategy JSON from the LLM
 * @returns {Promise<Buffer>} - PDF as a Buffer
 */
export function generatePDF(strategy) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: {
        Title: `GTM Strategy — ${strategy.companyName}`,
        Author: 'GTMerd AI Agent',
        Subject: 'Go-To-Market Strategy',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = doc.page.margins.left;
    const pageW = doc.page.width - L - doc.page.margins.right;
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // ─── COVER PAGE ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.primary);

    // Accent stripe at bottom
    doc.rect(0, doc.page.height - 120, doc.page.width, 120).fill(COLORS.highlight);

    // Title block
    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(38)
      .text('GTM STRATEGY', L, 160, { width: pageW, align: 'left' });

    doc.moveDown(0.4);
    doc
      .fillColor(COLORS.highlight)
      .font(FONTS.bold)
      .fontSize(28)
      .text(strategy.companyName || 'Company', { width: pageW });

    if (strategy.tagline) {
      doc.moveDown(0.6);
      doc
        .fillColor('#CBD5E1')
        .font(FONTS.italic)
        .fontSize(14)
        .text(`"${strategy.tagline}"`, { width: pageW });
    }

    doc
      .fillColor(COLORS.white)
      .font(FONTS.regular)
      .fontSize(11)
      .text(`Prepared by GTMerd AI Agent  •  ${today}`, L, doc.page.height - 100);

    // ─── TABLE OF CONTENTS ─────────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.accent);
    doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(20).text('TABLE OF CONTENTS', L, 22);

    doc.moveDown(1.5);
    const tocItems = [
      'Executive Summary',
      'Company Overview & Value Proposition',
      'Target Market & ICP',
      'Competitive Landscape',
      'Positioning & Messaging',
      'Channel Strategy',
      'Pricing Strategy',
      'Launch Timeline',
      'KPIs & Success Metrics',
      'Risks & Mitigations',
    ];
    tocItems.forEach((item, i) => {
      doc
        .font(FONTS.regular)
        .fontSize(11)
        .fillColor(COLORS.text)
        .text(`${String(i + 1).padStart(2, '0')}.  ${item}`, { indent: 8, lineGap: 6 });
    });

    // ─── CONTENT PAGES ─────────────────────────────────────────────────────
    doc.addPage();

    // Header on every page
    function pageHeader(title) {
      doc.rect(0, 0, doc.page.width, 50).fill(COLORS.primary);
      doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(11).text(title, L, 18);
      doc.fillColor(COLORS.muted).font(FONTS.regular).fontSize(9).text(`GTM Strategy — ${strategy.companyName}`, L, 36);
      doc.y = 65;
    }

    pageHeader('Executive Summary');

    // 1. Executive Summary
    sectionHeading(doc, '01.  Executive Summary');
    doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(strategy.executiveSummary || 'N/A', { lineGap: 5, align: 'justify' });

    // 2. Company Overview
    ensureSpace(doc, 160);
    sectionHeading(doc, '02.  Company Overview & Value Proposition');
    const co = strategy.companyOverview || {};
    labelValue(doc, 'Industry:', co.industry);
    labelValue(doc, 'Business Model:', co.businessModel);
    doc.moveDown(0.3);
    doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text).text(co.description || '', { lineGap: 4 });
    doc.moveDown(0.4);
    doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Value Proposition:');
    doc.font(FONTS.italic).fontSize(10).fillColor(COLORS.text).text(co.valueProposition || '', { lineGap: 4 });
    if (co.keyProducts?.length) {
      doc.moveDown(0.3);
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Key Products / Services:');
      bulletList(doc, co.keyProducts);
    }

    // 3. Target Market & ICP
    ensureSpace(doc, 180);
    sectionHeading(doc, '03.  Target Market & Ideal Customer Profile');
    const tm = strategy.targetMarket || {};
    labelValue(doc, 'Primary Segment:', tm.primarySegment);
    labelValue(doc, 'Market Size (TAM/SAM/SOM):', tm.marketSize);
    if (tm.secondarySegments?.length) {
      doc.moveDown(0.2);
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Secondary Segments:');
      bulletList(doc, tm.secondarySegments);
    }
    if (tm.geographies?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Target Geographies:');
      bulletList(doc, tm.geographies);
    }
    const icp = tm.icp || {};
    doc.moveDown(0.2);
    doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.primary).text('Ideal Customer Profile (ICP)');
    doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text).text(icp.profile || '', { lineGap: 4 });
    if (icp.painPoints?.length) {
      doc.moveDown(0.2);
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Pain Points:');
      bulletList(doc, icp.painPoints);
    }
    if (icp.buyingTriggers?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Buying Triggers:');
      bulletList(doc, icp.buyingTriggers);
    }

    // 4. Competitive Landscape
    ensureSpace(doc, 160);
    sectionHeading(doc, '04.  Competitive Landscape');
    const cl = strategy.competitiveLandscape || {};
    if (cl.directCompetitors?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Direct Competitors:');
      bulletList(doc, cl.directCompetitors);
    }
    if (cl.indirectCompetitors?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Indirect Competitors:');
      bulletList(doc, cl.indirectCompetitors);
    }
    if (cl.competitiveAdvantages?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Our Competitive Advantages:');
      bulletList(doc, cl.competitiveAdvantages);
    }
    if (cl.potentialThreats?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Potential Threats:');
      bulletList(doc, cl.potentialThreats);
    }

    // 5. Positioning & Messaging
    ensureSpace(doc, 160);
    sectionHeading(doc, '05.  Positioning & Messaging Framework');
    const pm = strategy.positioningAndMessaging || {};
    doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Positioning Statement:');
    doc.font(FONTS.italic).fontSize(10).fillColor(COLORS.text).text(pm.positioningStatement || '', { lineGap: 4 });
    doc.moveDown(0.3);
    labelValue(doc, 'Brand Tone:', pm.brandTone);
    if (pm.coreMessages?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Core Messages:');
      bulletList(doc, pm.coreMessages);
    }
    if (pm.proofPoints?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Proof Points:');
      bulletList(doc, pm.proofPoints);
    }

    // 6. Channel Strategy
    ensureSpace(doc, 200);
    sectionHeading(doc, '06.  Channel Strategy');
    const cs = strategy.channelStrategy || {};
    const channelSections = [
      ['Inbound Channels', cs.inbound],
      ['Outbound Channels', cs.outbound],
      ['Content Marketing', cs.contentMarketing],
      ['Paid Channels', cs.paidChannels],
      ['Partnerships', cs.partnerships],
    ];
    channelSections.forEach(([label, items]) => {
      if (items?.length) {
        doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text(label + ':');
        bulletList(doc, items);
      }
    });

    // 7. Pricing Strategy
    ensureSpace(doc, 120);
    sectionHeading(doc, '07.  Pricing Strategy');
    const ps = strategy.pricingStrategy || {};
    labelValue(doc, 'Recommended Model:', ps.recommendedModel);
    if (ps.tiers?.length) {
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.accent).text('Pricing Tiers:');
      bulletList(doc, ps.tiers);
    }
    if (ps.rationale) {
      doc.moveDown(0.2);
      doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.text).text(ps.rationale, { lineGap: 4 });
    }

    // 8. Launch Timeline
    ensureSpace(doc, 120);
    sectionHeading(doc, '08.  Launch Timeline & Milestones');
    const phases = strategy.launchTimeline || [];
    phases.forEach((phase, i) => {
      ensureSpace(doc, 70);
      doc
        .save()
        .rect(L, doc.y, pageW, 22)
        .fill(i % 2 === 0 ? '#EEF2FF' : '#FFF0F3')
        .restore();
      doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor(COLORS.primary)
        .text(`Phase ${i + 1}: ${phase.phase}  (${phase.duration})`, L + 8, doc.y + 5);
      doc.moveDown(0.5);
      bulletList(doc, phase.keyActions);
    });

    // 9. KPIs
    ensureSpace(doc, 120);
    sectionHeading(doc, '09.  KPIs & Success Metrics');
    const kpis = strategy.kpis || [];
    // Table header
    doc.save().rect(L, doc.y, pageW, 20).fill(COLORS.accent).restore();
    const col1 = L + 8, col2 = L + pageW * 0.45, col3 = L + pageW * 0.7;
    doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(9);
    doc.text('Metric', col1, doc.y + 5, { continued: true, width: col2 - col1 });
    doc.text('Target', col2, undefined, { continued: true, width: col3 - col2 });
    doc.text('Timeframe', col3);
    doc.moveDown(0.15);
    kpis.forEach((kpi, i) => {
      ensureSpace(doc, 20);
      if (i % 2 === 0) {
        doc.save().rect(L, doc.y, pageW, 18).fill(COLORS.light).restore();
      }
      const rowY = doc.y + 4;
      doc.fillColor(COLORS.text).font(FONTS.regular).fontSize(9);
      doc.text(kpi.metric || '', col1, rowY, { width: col2 - col1 - 4, lineBreak: false });
      doc.text(kpi.target || '', col2, rowY, { width: col3 - col2 - 4, lineBreak: false });
      doc.text(kpi.timeframe || '', col3, rowY, { width: L + pageW - col3 - 4, lineBreak: false });
      doc.moveDown(0.9);
    });

    // 10. Risks
    ensureSpace(doc, 120);
    sectionHeading(doc, '10.  Risks & Mitigations');
    const risks = strategy.risks || [];
    risks.forEach((r) => {
      ensureSpace(doc, 50);
      doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.highlight).text(`⚠  ${r.risk}`);
      doc
        .font(FONTS.regular)
        .fontSize(10)
        .fillColor(COLORS.text)
        .text(`   Mitigation: ${r.mitigation}`, { indent: 12, lineGap: 3 });
      doc.moveDown(0.4);
    });

    // ─── FOOTER ON EVERY PAGE ──────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 35;
      doc
        .save()
        .moveTo(L, footerY)
        .lineTo(doc.page.width - L, footerY)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke()
        .restore();
      doc
        .fillColor(COLORS.muted)
        .font(FONTS.regular)
        .fontSize(8)
        .text(
          `GTM Strategy — ${strategy.companyName}  •  Generated by GTMerd AI  •  ${today}`,
          L,
          footerY + 5,
          { align: 'left', width: pageW - 60 }
        );
      doc
        .fillColor(COLORS.muted)
        .font(FONTS.regular)
        .fontSize(8)
        .text(`Page ${i + 1}`, L, footerY + 5, { align: 'right', width: pageW });
    }

    doc.end();
  });
}
