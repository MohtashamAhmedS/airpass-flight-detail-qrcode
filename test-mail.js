require('dotenv').config()
const nodemailer = require('nodemailer')

const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

t.sendMail({
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: 'AirPass test',
  text: 'If you see this, Gmail works.',
})
  .then(() => console.log('SENT OK'))
  .catch((e) => console.error('FAILED:', e.message))
