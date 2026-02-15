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
}

export class CreditCalculatorService {
  /**
   * Calculates the monthly payment rate (Annuity).
   */
  public static calculateMonthlyRate(loanAmount: number, interestRate: number, initialRepayment: number): number {
    const annualRate = (loanAmount * (interestRate + initialRepayment)) / 100
    return annualRate / 12
  }

  /**
   * Generates a monthly amortization schedule.
   */
  public static calculateSchedule(options: CreditCalculatorOptions): PaymentEntry[] {
    const { loanAmount, interestRate, yearsToCalculate } = options
    let remainingBalance = loanAmount
    const monthlyInterestRate = interestRate / 100 / 12
    const rate = this.calculateMonthlyRate(loanAmount, interestRate, options.initialRepayment)
    
    const result: PaymentEntry[] = []
    
    let month = 1
    const maxMonths = 1200 // Safety limit of 100 years
    
    while (remainingBalance > 0 && month <= maxMonths) {
      const interestPayment = remainingBalance * monthlyInterestRate
      let repaymentPayment = rate - interestPayment
      
      if (remainingBalance < repaymentPayment) {
          repaymentPayment = remainingBalance
      }

      const totalPayment = interestPayment + repaymentPayment
      remainingBalance -= repaymentPayment

      result.push({
        month,
        year: Math.ceil(month / 12),
        interestPayment,
        repaymentPayment,
        totalPayment,
        remainingBalance: Math.max(0, remainingBalance)
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
        remainingBalance: 0 
    }

    monthlySchedule.forEach((m, index) => {
        currentYear.interestPayment += m.interestPayment
        currentYear.repaymentPayment += m.repaymentPayment
        currentYear.totalPayment += m.totalPayment
        currentYear.remainingBalance = m.remainingBalance
        
        if (m.month % 12 === 0 || index === monthlySchedule.length - 1) {
            years.push({ ...currentYear })
            currentYear = { 
                year: currentYear.year + 1, 
                interestPayment: 0, 
                repaymentPayment: 0, 
                totalPayment: 0,
                remainingBalance: 0 
            }
        }
    })
    return years
  }
}
