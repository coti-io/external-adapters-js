import * as process from 'process'
import { AddressInfo } from 'net'
import request, { SuperTest, Test } from 'supertest'
import { expose, ServerInstance } from '@chainlink/external-adapter-framework'
import { AdapterRequestBody, sleep } from '@chainlink/external-adapter-framework/util'
import { mockResponseSuccess } from './fixtures'
import { setEnvVariables, createAdapter } from './setup'

describe('rest', () => {
  jest.setTimeout(10000)
  let spy: jest.SpyInstance
  beforeAll(async () => {
    const mockDate = new Date('2022-01-01T11:11:11.111Z')
    spy = jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())
  })

  afterAll((done) => {
    spy.mockRestore()
    done()
  })

  let fastify: ServerInstance | undefined
  let req: SuperTest<Test>

  const fxData: AdapterRequestBody = {
    data: {
      base: 'EUR',
    },
  }

  const stockData: AdapterRequestBody = {
    data: {
      base: 'AAPL',
    },
  }

  let oldEnv: NodeJS.ProcessEnv
  beforeAll(async () => {
    oldEnv = JSON.parse(JSON.stringify(process.env))
    process.env['CACHE_MAX_AGE'] = '5000'
    process.env['CACHE_POLLING_MAX_RETRIES'] = '0'
    process.env['METRICS_ENABLED'] = 'false'
    process.env['API_KEY'] = 'fake-api-key'
    fastify = await expose(createAdapter())
    req = request(`http://localhost:${(fastify?.server.address() as AddressInfo).port}`)
    mockResponseSuccess()
    // Send initial requests to start background execute
    await req.post('/').send(fxData)
    await req.post('/').send(stockData)
    await sleep(5000)
  })

  afterAll((done) => {
    setEnvVariables(oldEnv)
    fastify?.close(done())
  })

  describe('quote endpoint', () => {
    it('should return success', async () => {
      const makeRequest = () =>
        req
          .post('/')
          .send(fxData)
          .set('Accept', '*/*')
          .set('Content-Type', 'application/json')
          .expect('Content-Type', /json/)

      const response = await makeRequest()
      expect(response.body).toMatchSnapshot()
    }, 30000)
  })

  describe('forex endpoint (quote alias)', () => {
    it('should return success', async () => {
      const makeRequest = () =>
        req
          .post('/')
          .send({ data: { ...fxData.data, endpoint: 'stock' } })
          .set('Accept', '*/*')
          .set('Content-Type', 'application/json')
          .expect('Content-Type', /json/)

      const response = await makeRequest()
      expect(response.body).toMatchSnapshot()
    }, 30000)
  })

  describe('stock endpoint (quote alias)', () => {
    it('should return success', async () => {
      const makeRequest = () =>
        req
          .post('/')
          .send({ data: { ...stockData.data, endpoint: 'stock' } })
          .set('Accept', '*/*')
          .set('Content-Type', 'application/json')
          .expect('Content-Type', /json/)

      const response = await makeRequest()
      expect(response.body).toMatchSnapshot()
    }, 30000)
  })
})
