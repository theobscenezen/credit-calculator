export interface EtfYearlyEntry {
  year: number
  startBalance: number
  investedThisYear: number
  interestEarned: number
  endBalance: number
  totalInvested: number
  totalInterest: number
}

export interface EtfCalculatorOptions {
  initialBalance: number
  monthlyContribution: number
  annualReturnRate: number
  years: number
}

export class EtfCalculatorService {
  /**
   * Helper to round to 2 decimal places safely.
   */
  private static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  /**
   * Calculates the growth of an ETF savings plan.
   */
  public static calculateGrowth(options: EtfCalculatorOptions): EtfYearlyEntry[] {
    const { initialBalance, monthlyContribution, annualReturnRate, years } = options

    // Geometric monthly rate to reach the annual return rate
    const monthlyReturnRate = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1

    const schedule: EtfYearlyEntry[] = []
    let currentBalance = this.round(initialBalance)
    let totalInvested = this.round(initialBalance)
    let totalInterest = 0

    for (let year = 1; year <= years; year++) {
      const yearStartBalance = currentBalance
      let interestEarnedThisYear = 0
      let investedThisYear = 0

      for (let month = 1; month <= 12; month++) {
        // 1. Calculate and round interest for the month
        const interestThisMonth = this.round(currentBalance * monthlyReturnRate)
        interestEarnedThisYear = this.round(interestEarnedThisYear + interestThisMonth)
        currentBalance = this.round(currentBalance + interestThisMonth)

        // 2. Add and round contribution
        const contribution = this.round(monthlyContribution)
        currentBalance = this.round(currentBalance + contribution)
        investedThisYear = this.round(investedThisYear + contribution)
      }

      totalInvested = this.round(totalInvested + investedThisYear)
      totalInterest = this.round(totalInterest + interestEarnedThisYear)

      schedule.push({
        year,
        startBalance: yearStartBalance,
        investedThisYear,
        interestEarned: interestEarnedThisYear,
        endBalance: currentBalance,
        totalInvested,
        totalInterest,
      })
    }

    return schedule
  }
}
