import { Logger } from '@chainlink/ea-bootstrap'
import { getDerivativesData, CurrencyDerivativesData } from './derivativesDataProvider'
import { SigmaCalculator } from './sigmaCalculator'
import { Decimal } from 'decimal.js'
import moment from 'moment'
import { dominanceByCurrency, getDominanceAdapter } from './dominanceDataProvider'
import { AdapterContext, AdapterRequest } from '@chainlink/types'
import { saveCache, loadCache } from './cviCache'

export const calculate = async (
  validated: Record<string, any>,
  requestParams: any,
  context: AdapterContext,
): Promise<number> => {
  const {
    renewPeriod = 300,
    multiply = 1e18,
    maxIndex = 200,
    isAdaptive = true,
    cryptoCurrencies = ['BTC', 'ETH'],
    deviationThreshold = 0.2,
    lambdaMin = 0.04,
    lambdaK = 0.4,
  } = validated.data

  // Get all of the required derivatives data for the calculations, for all the relevant currencies
  const derivativesData = await getDerivativesData(cryptoCurrencies)
  // Calculate vix values for all currencies
  const volatilityIndexData = await calculateVixValues(derivativesData, cryptoCurrencies)
  // Apply weights to calculate the Crypto Vix
  const weightedCVI = await calculateWeighted(
    volatilityIndexData,
    validated.id,
    requestParams,
    context,
    cryptoCurrencies,
  )
  // Smooth CVI with previous on-chain value if exists
  const cvi = !isAdaptive
    ? weightedCVI
    : await applySmoothing(
        weightedCVI,
        renewPeriod,
        deviationThreshold,
        lambdaMin,
        lambdaK,
        context,
      )

  Logger.info(`CVI: ${cvi}`)
  validateIndex(cvi, maxIndex)
  await saveCache(context, cvi, renewPeriod)
  return toOnChainValue(cvi, multiply)
}

const calculateVixValues = async (
  derivativesData: Record<string, CurrencyDerivativesData>,
  cryptoCurrencies: string[],
) => {
  const now = moment().utc().unix()
  const sigmaCalculator = new SigmaCalculator()
  const vixValues = cryptoCurrencies.map((currency) => {
    sigmaCalculator.sortByStrikePrice(derivativesData[currency])
    const { e1, e2, exchangeRate, callsE1, putsE1, callsE2, putsE2 } = derivativesData[currency]
    const weightedSigma: Decimal = sigmaCalculator.weightedSigma({
      e1,
      e2,
      sigma1: sigmaCalculator.oneSigma(e1, exchangeRate, callsE1, putsE1, now),
      sigma2: sigmaCalculator.oneSigma(e2, exchangeRate, callsE2, putsE2, now),
      now,
    })
    return weightedSigma.sqrt().times(100)
  })

  return vixValues
}

const calculateWeighted = async (
  vixData: Array<Decimal>,
  id: string,
  requestParams: any,
  context: AdapterContext,
  cryptoCurrencies: string[],
) => {
  const dominanceByCurrency = await getDominanceByCurrency(
    id,
    requestParams,
    context,
    cryptoCurrencies,
  )
  const weightedVix = cryptoCurrencies.reduce((vix, currency, idx) => {
    const dominance = dominanceByCurrency[currency]
    if (!dominance) throw new Error(`No dominance found for currency ${currency}`)
    const currencyVix = new Decimal(vixData[idx])
    // Weight by dominance
    vix = vix.plus(currencyVix.times(new Decimal(dominance)))
    return vix
  }, new Decimal(0))

  const weighted = Number(weightedVix.toFixed())
  Logger.debug(`Weighted volatility index:${weighted}`)
  return weighted
}

const getDominanceByCurrency = async (
  id: string,
  requestParams: any,
  context: AdapterContext,
  cryptoCurrencies: string[],
) => {
  const dominanceAdapter = await getDominanceAdapter()
  const allocations = cryptoCurrencies.map((symbol) => {
    return { symbol }
  })
  const quote = 'USD'
  const input: AdapterRequest = {
    id: id,
    data: {
      ...requestParams,
      allocations,
      quote,
    },
  }
  const dominanceData = await dominanceAdapter(input, context)
  return dominanceByCurrency(dominanceData.data, quote)
}

const applySmoothing = async (
  weightedCVI: number,
  renewPeriod: number,
  deviationThreshold: number,
  lambdaMin: number,
  lambdaK: number,
  context: AdapterContext,
): Promise<number> => {
  let latestIndex: Decimal
  let updatedAt: number
  const cachedValue = await loadCache(context)
  if (cachedValue) {
    latestIndex = new Decimal(cachedValue.value)
    updatedAt = cachedValue.timestamp
  } else {
    return weightedCVI
  }

  const now = moment().utc()
  const dtSeconds = moment.duration(now.diff(updatedAt)).asSeconds()
  if (dtSeconds < 0) {
    throw new Error('invalid time, please check the node clock')
  }

  const d = Math.abs(latestIndex.toNumber() / weightedCVI - 1)
  const l =
    d >= deviationThreshold ? lambdaMin : lambda(dtSeconds, renewPeriod / 60, lambdaMin, lambdaK)
  const smoothed = latestIndex.mul(new Decimal(1 - l)).add(new Decimal(weightedCVI).mul(l))
  Logger.debug(`Previous value:${latestIndex}, updatedAt:${updatedAt}, dtSeconds:${dtSeconds}`)
  return smoothed.toNumber()
}

const lambda = function (t: number, heartBeatMinutes: number, lambdaMin: number, lambdaK: number) {
  const T = moment.duration(heartBeatMinutes, 'minutes').asSeconds()
  return lambdaMin + (lambdaK * Math.min(t, T)) / T
}

const validateIndex = function (cvi: number, maxIndex: number) {
  if (cvi <= 0 || cvi > maxIndex) {
    throw new Error('Invalid calculated index value')
  }
}

const toOnChainValue = function (cvi: number, multiply: number) {
  return Number(cvi.toFixed(multiply.toString().length - 1)) // Keep decimal precision in same magnitude as multiply
}
