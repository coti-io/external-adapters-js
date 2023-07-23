import nock from 'nock'

export const mockResponseSuccess = (): nock.Scope =>
  nock('https://cloud.iexapis.com/stable', {
    encodedQueryParams: true,
  })
    .persist()
    .get('/crypto/ETHUSD/quote')
    .query({ token: 'fake-api-key' })
    .reply(
      200,
      () => ({
        symbol: 'ETHUSD',
        primaryExchange: '',
        sector: 'cryptocurrency',
        calculationPrice: 'realtime',
        high: null,
        low: null,
        latestPrice: '4539.44',
        latestSource: 'Real time price',
        latestUpdate: 1636104293805,
        latestVolume: '0.413756',
        previousClose: null,
      }),
      [
        'Content-Type',
        'application/json',
        'Connection',
        'close',
        'Vary',
        'Accept-Encoding',
        'Vary',
        'Origin',
      ],
    )
    .persist()
    .get('/stock/USD/quote')
    .query({ token: 'fake-api-key' })
    .reply(
      200,
      () => ({
        avgTotalVolume: 142295,
        calculationPrice: 'close',
        change: 4.7,
        changePercent: 0.10665,
        close: 48.77,
        closeSource: 'official',
        closeTime: 1636056000195,
        companyName: 'ProShares Trust - ProShares Ultra Semiconductors',
        currency: 'USD',
        delayedPrice: 48.74,
        delayedPriceTime: 1636055923441,
        extendedChange: 0,
        extendedChangePercent: 0,
        extendedPrice: 48.77,
        extendedPriceTime: 1636070400048,
        high: 50.02,
        highSource: '15 minute delayed price',
        highTime: 1636055981354,
        iexAskPrice: 0,
        iexAskSize: 0,
        iexBidPrice: 0,
        iexBidSize: 0,
        iexClose: 48.74,
        iexCloseTime: 1636053229277,
        iexLastUpdated: 1636053229277,
        iexMarketPercent: 0.001523796023955491,
        iexOpen: 48.74,
        iexOpenTime: 1636053229277,
        iexRealtimePrice: 48.74,
        iexRealtimeSize: 100,
        iexVolume: 387,
        lastTradeTime: 1636055923441,
        latestPrice: 48.77,
        latestSource: 'Close',
        latestTime: 'November 4, 2021',
        latestUpdate: 1636056000195,
        latestVolume: 253971,
        low: 45.3,
        lowSource: '15 minute delayed price',
        lowTime: 1636032600126,
        marketCap: 443807000,
        oddLotDelayedPrice: 48.72,
        oddLotDelayedPriceTime: 1636055981353,
        open: 45.3,
        openTime: 1636032600126,
        openSource: 'official',
        peRatio: null,
        previousClose: 44.07,
        previousVolume: 288407,
        primaryExchange: 'NYSE ARCA',
        symbol: 'USD',
        volume: 0,
        week52High: 50.02,
        week52Low: 20.26,
        ytdChange: 0.810991100261046,
        isUSMarketOpen: false,
      }),
      [
        'Content-Type',
        'application/json',
        'Connection',
        'close',
        'Vary',
        'Accept-Encoding',
        'Vary',
        'Origin',
      ],
    )
    .persist()
