export interface PaymentEntry {
  month: number
  year: number
  interestPayment: number
  repaymentPayment: number
  totalPayment: number
  remainingBalance: number
}

export interface YearlyPaymentEntry {
  year: number
  interestPayment: number
  repaymentPayment: number
  totalPayment: number
  remainingBalance: number
}

export interface CreditCalculatorOptions {
  id?: string
  name?: string
  loanAmount: number
  interestRate: number
  initialRepayment: number
  equity: number
  yearsToCalculate?: number
}

export class CreditCalculatorService {
  /**
   * Helper to round to 2 decimal places safely.
   */
  private static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  /**
   * Calculates the monthly payment rate (Annuity).
   */
  public static calculateMonthlyRate(
    loanAmount: number,
    interestRate: number,
    initialRepayment: number,
  ): number {
    const annualRate = (loanAmount * (interestRate + initialRepayment)) / 100
    return this.round(annualRate / 12)
  }

  /**
   * Generates a monthly amortization schedule.
   */
  public static calculateSchedule(options: CreditCalculatorOptions): PaymentEntry[] {
    const { loanAmount, interestRate } = options
    let remainingBalance = this.round(loanAmount)
    const monthlyInterestRate = interestRate / 100 / 12
    const rate = this.calculateMonthlyRate(loanAmount, interestRate, options.initialRepayment)

    const result: PaymentEntry[] = []
    let month = 1
    const maxMonths = 1200 // Safety limit of 100 years

    while (remainingBalance > 0 && month <= maxMonths) {
      const interestPayment = this.round(remainingBalance * monthlyInterestRate)
      let repaymentPayment = this.round(rate - interestPayment)

      if (remainingBalance < repaymentPayment) {
        repaymentPayment = remainingBalance
      }

      const totalPayment = this.round(interestPayment + repaymentPayment)
      remainingBalance = this.round(remainingBalance - repaymentPayment)

      result.push({
        month,
        year: Math.ceil(month / 12),
        interestPayment,
        repaymentPayment,
        totalPayment,
        remainingBalance: Math.max(0, remainingBalance),
      })

      month++
    }
    return result
  }

  /**
   * Aggregates a monthly schedule into a yearly schedule.
   */
  public static aggregateYearlySchedule(monthlySchedule: PaymentEntry[]): YearlyPaymentEntry[] {
    const years: YearlyPaymentEntry[] = []
    let currentYear: YearlyPaymentEntry = {
      year: 1,
      interestPayment: 0,
      repaymentPayment: 0,
      totalPayment: 0,
      remainingBalance: 0,
    }

    monthlySchedule.forEach((m, index) => {
      currentYear.interestPayment = this.round(currentYear.interestPayment + m.interestPayment)
      currentYear.repaymentPayment = this.round(currentYear.repaymentPayment + m.repaymentPayment)
      currentYear.totalPayment = this.round(currentYear.totalPayment + m.totalPayment)
      currentYear.remainingBalance = m.remainingBalance

      if (m.month % 12 === 0 || index === monthlySchedule.length - 1) {
        years.push({ ...currentYear })
        currentYear = {
          year: currentYear.year + 1,
          interestPayment: 0,
          repaymentPayment: 0,
          totalPayment: 0,
          remainingBalance: 0,
        }
      }
    })
    return years
  }
}
