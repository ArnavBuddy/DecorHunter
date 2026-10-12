// CAN-SPAM compliant email template renderer

interface TemplateVars {
  company?: string;
  first_name?: string;
  unsubscribe_link: string;
  physical_address: string;
}

export function renderEmailBody(template: string, vars: TemplateVars): string {
  let body = template;
  body = body.replace(/\{\{company\}\}/g, vars.company ?? "");
  body = body.replace(/\{\{first_name\}\}/g, vars.first_name ?? "there");
  body = body.replace(/\{\{unsubscribe_link\}\}/g, vars.unsubscribe_link);
  return body;
}

export function buildHtmlEmail(params: {
  subject: string;
  bodyHtml: string;
  fromName: string;
  unsubscribeLink: string;
  physicalAddress: string;
}): string {
  const { bodyHtml, fromName, unsubscribeLink, physicalAddress } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; }
    .header h1 { color: #e8d5b7; margin: 0; font-size: 22px; font-weight: 600; }
    .body { padding: 40px; line-height: 1.7; font-size: 15px; }
    .footer { background: #f9f9f9; padding: 24px 40px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; }
    .footer a { color: #888; text-decoration: underline; }
    p { margin: 0 0 16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${fromName}</h1>
    </div>
    <div class="body">
      ${bodyHtml.split("\n").map((l) => `<p>${l}</p>`).join("\n")}
    </div>
    <div class="footer">
      <p>You are receiving this email because your business was identified as a potential partner in the home decor industry.</p>
      <p><a href="${unsubscribeLink}">Unsubscribe</a> from future emails.</p>
      <p>${physicalAddress}</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildPlainText(params: {
  bodyText: string;
  fromName: string;
  unsubscribeLink: string;
  physicalAddress: string;
}): string {
  return `${params.bodyText}

---
You're receiving this because your business was identified as a potential partner in the home decor industry.
Unsubscribe: ${params.unsubscribeLink}
${params.physicalAddress}
Sender: ${params.fromName}
`;
}
