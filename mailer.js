const nodemailer = require('nodemailer')
const qrcode = require('qrcode')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

const esc = (s = '') =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )

/* ---------- Printable tag (attachment) ---------- */
function buildPrintableTag(m, qrDataUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AirPass Tag – ${esc(m.firstname)}</title>
<style>
  @page { size: auto; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; background: #ffeec9; color: #111;
         min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 24px 12px; }
  .bar { margin-bottom: 18px; text-align: center; }
  .bar button { font: inherit; font-weight: 900; text-transform: uppercase; padding: 12px 26px; cursor: pointer;
                background: #ff7a01; border: 3px solid #111; border-radius: 10px; box-shadow: 5px 5px 0 #111; }
  .bar p { margin-top: 10px; font-size: 13px; font-weight: 600; }
  .tag { width: 340px; background: #fff; border: 4px solid #111; border-radius: 18px; overflow: hidden;
         box-shadow: 8px 8px 0 #111; }
  .hole { height: 46px; background: #ff7a01; border-bottom: 4px solid #111; position: relative; }
  .hole::after { content: ""; position: absolute; left: 50%; top: 9px; width: 28px; height: 28px; margin-left: -14px;
                 background: #ffeec9; border: 4px solid #111; border-radius: 50%; }
  .brand { background: #111; color: #ffd93d; font-weight: 900; letter-spacing: 2px; text-align: center;
           padding: 8px; font-size: 13px; text-transform: uppercase; }
  .body { padding: 18px 20px; }
  .label { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #555; }
  .name { font-size: 26px; font-weight: 900; text-transform: uppercase; line-height: 1.1; margin: 2px 0 14px; word-break: break-word; }
  .route { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px; }
  .route .city { font-size: 22px; font-weight: 900; word-break: break-word; }
  .arrow { font-size: 26px; font-weight: 900; }
  .flight { display: inline-block; background: #ffd93d; border: 3px solid #111; border-radius: 8px;
            padding: 4px 12px; font-weight: 900; font-size: 18px; margin-bottom: 14px; }
  .cut { border-top: 3px dashed #111; margin: 4px 0 16px; position: relative; }
  .cut span { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 8px; font-size: 11px; font-weight: 800; }
  .qr { text-align: center; }
  .qr img { width: 230px; height: 230px; border: 4px solid #111; border-radius: 10px; padding: 6px; background: #fff; }
  .foot { text-align: center; font-size: 11px; font-weight: 700; margin-top: 10px; }
  @media print {
    body { background: #fff; padding: 0; display: block; }
    .bar { display: none; }
    .tag { box-shadow: none; margin: 0 auto; }
  }
</style>
</head>
<body>
  <div class="bar">
    <button onclick="window.print()">🖨 Print tag</button>
    <p>Tip: print at 100% scale, then cut around the tag.</p>
  </div>
  <div class="tag">
    <div class="hole"></div>
    <div class="brand">AirPass · Boarding Tag</div>
    <div class="body">
      <div class="label">Passenger</div>
      <div class="name">${esc(m.firstname)}</div>

      <div class="route">
        <div><div class="label">From</div><div class="city">${esc(m.airportodepart)}</div></div>
        <div class="arrow">✈</div>
        <div style="text-align:right"><div class="label">To</div><div class="city">${esc(m.airportoarrival)}</div></div>
      </div>

      <div class="label">Flight</div>
      <div class="flight">${esc(m.flightnumber)}</div>

      <div class="cut"><span>✂ scan below</span></div>

      <div class="qr"><img src="${qrDataUrl}" alt="QR code" /></div>
      <div class="foot">${esc(m.phone)} · ${esc(m.email)}</div>
    </div>
  </div>
</body>
</html>`
}

/* ---------- Email body ---------- */
function buildEmailHtml(m) {
  return `
  <div style="background:#ffeec9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" align="center" width="340" cellpadding="0" cellspacing="0"
           style="width:340px;max-width:100%;background:#ffffff;border:4px solid #111111;border-right-width:8px;border-bottom-width:8px;border-radius:18px;">
      <tr><td style="background:#ff7a01;height:44px;border-bottom:4px solid #111111;border-radius:14px 14px 0 0;" align="center">
        <div style="width:26px;height:26px;margin-top:8px;background:#ffeec9;border:4px solid #111111;border-radius:50%;"></div>
      </td></tr>
      <tr><td align="center" style="background:#111111;color:#ffd93d;font-weight:900;letter-spacing:2px;font-size:13px;padding:8px;text-transform:uppercase;">
        AirPass · Boarding Tag
      </td></tr>
      <tr><td style="padding:18px 20px;color:#111111;">
        <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#555555;">Passenger</div>
        <div style="font-size:26px;font-weight:900;text-transform:uppercase;line-height:1.1;margin:2px 0 14px;">${esc(m.firstname)}</div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td valign="top">
              <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#555555;">From</div>
              <div style="font-size:20px;font-weight:900;">${esc(m.airportodepart)}</div>
            </td>
            <td align="center" style="font-size:24px;font-weight:900;">✈</td>
            <td valign="top" align="right">
              <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#555555;">To</div>
              <div style="font-size:20px;font-weight:900;">${esc(m.airportoarrival)}</div>
            </td>
          </tr>
        </table>

        <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#555555;">Flight</div>
        <div style="display:inline-block;background:#ffd93d;border:3px solid #111111;border-radius:8px;padding:4px 12px;font-weight:900;font-size:18px;margin-bottom:16px;">${esc(m.flightnumber)}</div>

        <div style="border-top:3px dashed #111111;margin:4px 0 16px;"></div>

        <div align="center">
          <img src="cid:qr@airpass" alt="Your QR Code" width="220" height="220"
               style="display:block;border:4px solid #111111;border-radius:10px;padding:6px;background:#ffffff;" />
        </div>
        <div align="center" style="font-size:11px;font-weight:700;margin-top:10px;">Show this QR code at the airport</div>
      </td></tr>
    </table>

    <table role="presentation" align="center" width="340" cellpadding="0" cellspacing="0" style="width:340px;max-width:100%;margin-top:18px;">
      <tr><td align="center" style="font-size:13px;font-weight:700;color:#111111;line-height:1.5;">
        🖨 <b>Want a printable tag?</b><br/>
        Open the attached <b>airpass-tag.html</b> in your browser and click <b>Print tag</b>.
      </td></tr>
    </table>
    <p align="center" style="font-size:11px;color:#555555;margin-top:16px;">&copy; ${new Date().getFullYear()} AirPass</p>
  </div>`
}

/* ---------- Public function ---------- */
async function sendPass(m) {
  const text =
    `Name: ${m.firstname}\r\n` +
    `Phone: ${m.phone}\r\n` +
    `Email: ${m.email}\r\n` +
    `Flight: ${m.flightnumber}\r\n` +
    `Departure: ${m.airportodepart}\r\n` +
    `Arrival: ${m.airportoarrival}`

  const png = await qrcode.toBuffer(text, { width: 400, margin: 1 })
  const qrDataUrl = 'data:image/png;base64,' + png.toString('base64')

  await transporter.sendMail({
    from: `"AirPass" <${process.env.EMAIL_USER}>`,
    to: m.email,
    subject: 'Your AirPass boarding tag ✈',
    html: buildEmailHtml(m),
    attachments: [
      { filename: 'qrcode.png', content: png, cid: 'qr@airpass' },
      {
        filename: 'airpass-tag.html',
        content: buildPrintableTag(m, qrDataUrl),
        contentType: 'text/html; charset=utf-8',
      },
    ],
  })
}

module.exports = { sendPass }
