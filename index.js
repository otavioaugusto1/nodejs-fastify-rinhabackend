import Fastify from 'fastify'
import fetch from 'node-fetch'

const app = Fastify()

const DEFAULT_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT
const FALLBACK_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK

let stats = {
  default: { totalRequests: 0, totalAmount: 0 },
  fallback: { totalRequests: 0, totalAmount: 0 }
}

async function enviarPagamento(pagamento) {
  const payload = {
    ...pagamento,
    requestedAt: new Date().toISOString()
  }

  try {
    const res = await fetch(`${DEFAULT_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error('Default com erro')
    stats.default.totalRequests++
    stats.default.totalAmount += pagamento.amount
    return 'default'
  } catch (e) {
    try {
      const res = await fetch(`${FALLBACK_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Fallback com erro')
      stats.fallback.totalRequests++
      stats.fallback.totalAmount += pagamento.amount
      return 'fallback'
    } catch {
      return 'falha'
    }
  }
}

app.post('/payments', async (request, reply) => {
  const { correlationId, amount } = request.body
  if (!correlationId || typeof amount !== 'number') {
    return reply.status(400).send({ error: 'Dados inválidos' })
  }

  const destino = await enviarPagamento({ correlationId, amount })
  return reply.status(202).send({ enviadoPara: destino })
})

app.get('/payments-summary', async (request, reply) => {
  return reply.send(stats)
})

app.listen({ port: 9999, host: '0.0.0.0' }, err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('🚀 Fastify rodando na porta 9999')
})
