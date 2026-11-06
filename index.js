if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const path = require('path')
const express = require('express')
const Stripe = require('stripe')
const { sendPass } = require('./mailer')

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const app = express()
const port = process.env.PORT || 7070

app.set('trust proxy', 1)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'view'))

const getBaseUrl = (req) =>
  process.env.BASE_URL || `${req.protocol}://${req.get('host')}`

// Webhook needs the RAW body, so it goes before express.urlencoded
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET,
      )
    } catch (err) {
      console.error('Webhook signature failed:', err.message)
      return res.status(400).send('Invalid signature')
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.payment_status === 'paid') {
        try {
          await sendPass(session.metadata)
          console.log('Email sent to', session.metadata.email)
        } catch (err) {
          console.error('Failed to send pass:', err)
          return res.status(500).send('Email failed') // Stripe retries
        }
      }
    }
    res.json({ received: true })
  },
)

app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => res.render('index'))
app.get('/success', (req, res) => res.render('end'))

app.post('/checkout', async (req, res) => {
  const {
    firstname,
    email,
    phone,
    flightnumber,
    airportodepart,
    airportoarrival,
  } = req.body

  if (
    ![
      firstname,
      email,
      phone,
      flightnumber,
      airportodepart,
      airportoarrival,
    ].every(Boolean)
  ) {
    return res.redirect('/')
  }

  try {
    const baseUrl = getBaseUrl(req)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      adaptive_pricing: { enabled: false }, // charge in USD only, no PKR conversion
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 100,
            product_data: {
              name: 'AirPass QR Code',
              description: 'Airline-style boarding pass',
            },
          },
        },
      ],
      metadata: {
        firstname,
        email,
        phone,
        flightnumber,
        airportodepart,
        airportoarrival,
      },
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/`,
    })
    res.redirect(303, session.url)
  } catch (err) {
    console.error('Checkout error:', err.message)
    res.redirect('/')
  }
})

module.exports = app // for Vercel

if (require.main === module) {
  app.listen(port, () => console.log(`Listening on port ${port}`))
}
