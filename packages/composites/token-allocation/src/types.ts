import { BigNumberish } from 'ethers'

export type TokenAllocation = {
  symbol: string
  decimals: number
  balance: BigNumberish
}

export type ResponsePayload = {
  [symbol: string]: {
    quote: {
      [symbol: string]: {
        price?: number
        marketCap?: number
      }
    }
  }
}

export type TokenAllocations = TokenAllocation[]

export type GetPrices = (
  baseSymbols: string[],
  quote: string,
  withMarketCap?: boolean,
) => Promise<ResponsePayload>

export type PriceAdapter = {
  getPrices: (jobRunId: string) => GetPrices
}

export type Config = {
  priceAdapter: PriceAdapter
  defaultMethod: string
  defaultQuote: string
}
