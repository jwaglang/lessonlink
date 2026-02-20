// ========================================
// Kiddoland Email Templates
// Clean HTML emails with branding
// ========================================

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f0ff; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: #e9d5ff; margin: 4px 0 0; font-size: 14px; }
    .body { padding: 32px; color: #374151; line-height: 1.6; font-size: 15px; }
    .body h2 { color: #7c3aed; font-size: 18px; margin-top: 24px; margin-bottom: 8px; }
    .body h3 { color: #6b21a8; font-size: 16px; margin-top: 20px; margin-bottom: 6px; }
    .section { background: #faf5ff; border-left: 4px solid #a855f7; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .footer { background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .footer a { color: #7c3aed; text-decoration: none; }
    .btn { display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kiddoland</h1>
      <p>English Language Learning</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Sent from <a href="https://kiddoland.co">Kiddoland</a> via LessonLink</p>
    </div>
  </div>
</body>
</html>`;
}

// ========================================
// Session Feedback Email
// ========================================

export function sessionFeedbackEmail(params: {
  learnerName: string;
  sessionTitle: string;
  sessionDate: string;
  summary: string;
  progressHighlights: string;
  suggestedActivities: string;
  teacherName?: string;
}): { subject: string; html: string } {
  const { learnerName, sessionTitle, sessionDate, summary, progressHighlights, suggestedActivities, teacherName } = params;

  const subject = `Session Report: ${sessionTitle} — ${learnerName}`;

  const content = `
    <p>Dear Parent/Guardian of <strong>${learnerName}</strong>,</p>
    <p>Here is the feedback report for the session on <strong>${sessionDate}</strong>.</p>

    <h2>Session: ${sessionTitle}</h2>

    <div class="section">
      <h3>What Happened Today</h3>
      <p>${summary}</p>
    </div>

    <div class="section">
      <h3>Progress & Highlights</h3>
      <p>${progressHighlights}</p>
    </div>

    <div class="section">
      <h3>What You Can Do at Home</h3>
      <p>${suggestedActivities}</p>
    </div>

    ${teacherName ? `<p>Kind regards,<br><strong>${teacherName}</strong></p>` : ''}
  `;

  return { subject, html: baseTemplate(content) };
}

// ========================================
// Parent Report Email (Assessment/Evaluation)
// ========================================

export function parentReportEmail(params: {
  learnerName: string;
  reportType: 'initial' | 'final';
  unitName?: string;
  summary: string;
  progressHighlights: string;
  suggestedActivities: string;
  teacherName?: string;
}): { subject: string; html: string } {
  const { learnerName, reportType, unitName, summary, progressHighlights, suggestedActivities, teacherName } = params;

  const typeLabel = reportType === 'initial' ? 'Assessment Report' : 'Evaluation Report';
  const subject = `${typeLabel}${unitName ? `: ${unitName}` : ''} — ${learnerName}`;

  const content = `
    <p>Dear Parent/Guardian of <strong>${learnerName}</strong>,</p>
    <p>Here is your child's <strong>${typeLabel.toLowerCase()}</strong>${unitName ? ` for <strong>${unitName}</strong>` : ''}.</p>

    <div class="section">
      <h3>Summary</h3>
      <p>${summary}</p>
    </div>

    <div class="section">
      <h3>Progress Highlights</h3>
      <p>${progressHighlights}</p>
    </div>

    <div class="section">
      <h3>Suggested Activities at Home</h3>
      <p>${suggestedActivities}</p>
    </div>

    ${teacherName ? `<p>Kind regards,<br><strong>${teacherName}</strong></p>` : ''}
  `;

  return { subject, html: baseTemplate(content) };
}

// ========================================
// Session Reminder Email (24 hours before)
// ========================================

export function sessionReminderEmail(params: {
  learnerName: string;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
  portalUrl?: string;
}): { subject: string; html: string } {
  const { learnerName, sessionTitle, sessionDate, startTime, endTime, teacherName, portalUrl } = params;

  const subject = `Reminder: ${sessionTitle} tomorrow — ${learnerName}`;

  const content = `
    <p>Dear Parent/Guardian of <strong>${learnerName}</strong>,</p>
    <p>This is a friendly reminder that <strong>${learnerName}</strong> has an upcoming session:</p>

    <div class="section">
      <h3>${sessionTitle}</h3>
      <p><strong>Date:</strong> ${sessionDate}</p>
      <p><strong>Time:</strong> ${startTime} — ${endTime}</p>
      ${teacherName ? `<p><strong>Teacher:</strong> ${teacherName}</p>` : ''}
    </div>

    <p>Please make sure ${learnerName} is ready and in a quiet space with a stable internet connection.</p>

    ${portalUrl ? `<a href="${portalUrl}" class="btn">View in LessonLink</a>` : ''}

    <p>See you soon!</p>
  `;

  return { subject, html: baseTemplate(content) };
}
