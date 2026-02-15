<script setup lang="ts">
import { ref, computed } from 'vue'
import { CreditCalculatorService, type CreditCalculatorOptions } from '@/services/credit-calculator.service'

interface CalculationInstance extends CreditCalculatorOptions {
  id: string
  name: string
}

// State for all calculations
const calculations = ref<CalculationInstance[]>([
  {
    id: crypto.randomUUID(),
    name: 'Berechnung 1',
    equity: 50000,
    loanAmount: 250000,
    interestRate: 3.5,
    initialRepayment: 2.0
  }
])

// UI State
const expandedCalculationId = ref<string>(calculations.value[0].id)
const expandedYears = ref<Record<string, number[]>>({})

const addCalculation = () => {
  const lastCalc = calculations.value[calculations.value.length - 1]
  const newCalc: CalculationInstance = {
    id: crypto.randomUUID(),
    name: `Berechnung ${calculations.value.length + 1}`,
    equity: lastCalc.equity,
    loanAmount: lastCalc.loanAmount,
    interestRate: lastCalc.interestRate,
    initialRepayment: lastCalc.initialRepayment
  }
  calculations.value.push(newCalc)
  expandedCalculationId.value = newCalc.id
}

const removeCalculation = (id: string) => {
  if (calculations.value.length > 1) {
    const index = calculations.value.findIndex(c => c.id === id)
    calculations.value.splice(index, 1)
    if (expandedCalculationId.value === id) {
      expandedCalculationId.value = calculations.value[0].id
    }
  }
}

const toggleYear = (calcId: string, year: number) => {
  if (!expandedYears.value[calcId]) {
    expandedYears.value[calcId] = []
  }
  
  if (expandedYears.value[calcId].includes(year)) {
    expandedYears.value[calcId] = expandedYears.value[calcId].filter(y => y !== year)
  } else {
    expandedYears.value[calcId].push(year)
  }
}

// Compute results for ALL calculations (for the cards)
const allResults = computed(() => {
  return calculations.value.map(calc => {
    const monthlyRate = CreditCalculatorService.calculateMonthlyRate(calc.loanAmount, calc.interestRate, calc.initialRepayment)
    const schedule = CreditCalculatorService.calculateSchedule({ ...calc })
    const yearlySchedule = CreditCalculatorService.aggregateYearlySchedule(schedule)
    const totalInterest = schedule.reduce((sum, m) => sum + m.interestPayment, 0)
    
    return {
      ...calc,
      monthlyRate,
      schedule,
      yearlySchedule,
      totalInterest,
      durationYears: yearlySchedule.length
    }
  })
})

// Find the currently active calculation data
const activeResult = computed(() => {
  return allResults.value.find(r => r.id === expandedCalculationId.value) || allResults.value[0]
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}
</script>

<template>
  <div class="min-h-screen bg-base-100 p-4 md:p-8">
    <div class="max-w-full mx-auto">
      <header class="mb-10 flex flex-col md:flex-row justify-between items-center bg-base-200 p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-primary">Kredit-Vergleich</h1>
          <p class="text-base-content/70">Vergleichen Sie mehrere Kredit-Szenarien gleichzeitig.</p>
        </div>
        <button @click="addCalculation" class="btn btn-primary gap-2">
          <span>+</span> Vergleich hinzufügen
        </button>
      </header>

      <div class="flex flex-col gap-8">
        <!-- Summary Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="res in allResults" :key="res.id" 
               class="card bg-base-200 shadow-md border-2 transition-all cursor-pointer overflow-hidden"
               :class="expandedCalculationId === res.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-80'"
               @click="expandedCalculationId = res.id">
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <input v-model="res.name" @click.stop 
                       class="bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-primary w-full mr-2" />
                <button @click.stop="removeCalculation(res.id)" class="btn btn-circle btn-ghost btn-xs text-error" v-if="calculations.length > 1">✕</button>
              </div>
              
              <div class="mt-4 space-y-2">
                <div class="flex justify-between text-sm"><span>Eigenkapital:</span> <span class="font-semibold">{{ formatCurrency(res.equity) }}</span></div>
                <div class="flex justify-between text-sm"><span>Darlehen:</span> <span class="font-semibold">{{ formatCurrency(res.loanAmount) }}</span></div>
                <div class="flex justify-between text-sm"><span>Zins / Tilgung:</span> <span class="font-semibold">{{ res.interestRate }}% / {{ res.initialRepayment }}%</span></div>
                <div class="flex justify-between text-sm"><span>Rate:</span> <span class="font-bold text-secondary">{{ formatCurrency(res.monthlyRate) }}</span></div>
                <div class="divider my-1"></div>
                <div class="flex justify-between text-sm"><span>Laufzeit:</span> <span class="font-bold text-primary">{{ res.durationYears }} Jahre</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Editor & Schedule (Active Calculation) -->
        <div v-if="activeResult" class="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <!-- Inputs Sidebar -->
            <div class="xl:col-span-1 space-y-6">
                <div class="card bg-base-200 shadow-xl sticky top-4">
                    <div class="card-body">
                        <h2 class="card-title text-primary border-b pb-2">Details: {{ activeResult.name }}</h2>
                        
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Eigenkapital</span></label>
                            <div class="join w-full">
                                <input v-model.number="calculations.find(c => c.id === activeResult.id)!.equity" type="number" class="input input-bordered join-item w-full" />
                                <span class="btn btn-disabled join-item">€</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Kreditsumme</span></label>
                            <div class="join w-full">
                                <input v-model.number="calculations.find(c => c.id === activeResult.id)!.loanAmount" type="number" class="input input-bordered join-item w-full" />
                                <span class="btn btn-disabled join-item">€</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Sollzins</span></label>
                            <div class="join w-full">
                                <input v-model.number="calculations.find(c => c.id === activeResult.id)!.interestRate" type="number" step="0.01" class="input input-bordered join-item w-full" />
                                <span class="btn btn-disabled join-item">%</span>
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Tilgung</span></label>
                            <div class="join w-full">
                                <input v-model.number="calculations.find(c => c.id === activeResult.id)!.initialRepayment" type="number" step="0.01" class="input input-bordered join-item w-full" />
                                <span class="btn btn-disabled join-item">%</span>
                            </div>
                        </div>

                        <div class="mt-6 p-4 bg-base-100 rounded-lg space-y-2 border border-base-300">
                            <div class="flex justify-between"><span>Gesamtzinsen:</span> <span class="text-error font-bold">{{ formatCurrency(activeResult.totalInterest) }}</span></div>
                            <div class="flex justify-between"><span>Gesamtkosten:</span> <span class="font-bold">{{ formatCurrency(activeResult.totalInterest + activeResult.loanAmount) }}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schedule Table -->
            <div class="xl:col-span-3">
                <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
                    <div class="p-6 border-b border-base-200 bg-base-200/30 flex justify-between items-center">
                        <h2 class="card-title">Zahlungsplan: {{ activeResult.name }}</h2>
                        <div class="flex gap-2">
                            <span class="badge badge-outline">Zins: {{ activeResult.interestRate }}%</span>
                            <span class="badge badge-primary">{{ activeResult.durationYears }} Jahre</span>
                        </div>
                    </div>

                    <div class="overflow-x-auto max-h-[800px] overflow-y-auto">
                        <table class="table w-full border-collapse table-pin-rows">
                            <thead>
                                <tr class="bg-base-200">
                                    <th class="w-16">Jahr</th>
                                    <th class="text-right">Zinsen</th>
                                    <th class="text-right">Tilgung</th>
                                    <th class="text-right">Gesamt</th>
                                    <th class="text-right">Restschuld</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-for="yearData in activeResult.yearlySchedule" :key="yearData.year">
                                    <tr @click="toggleYear(activeResult.id, yearData.year)" 
                                        class="cursor-pointer hover:bg-base-200 transition-colors font-bold border-t border-base-300">
                                        <td>
                                            <div class="flex items-center gap-2">
                                                <span class="transition-transform duration-200" :class="{ 'rotate-90': expandedYears[activeResult.id]?.includes(yearData.year) }">▶</span>
                                                {{ yearData.year }}
                                            </div>
                                        </td>
                                        <td class="text-right text-error">{{ formatCurrency(yearData.interestPayment) }}</td>
                                        <td class="text-right text-success">{{ formatCurrency(yearData.repaymentPayment) }}</td>
                                        <td class="text-right text-primary">{{ formatCurrency(yearData.totalPayment) }}</td>
                                        <td class="text-right font-mono text-sm">{{ formatCurrency(yearData.remainingBalance) }}</td>
                                    </tr>

                                    <tr v-if="expandedYears[activeResult.id]?.includes(yearData.year)">
                                        <td colspan="5" class="p-0 bg-base-100/50 border-b border-base-200">
                                            <table class="table table-xs w-full mb-0">
                                                <tbody>
                                                    <tr v-for="m in activeResult.schedule.filter(m => m.year === yearData.year)" :key="m.month" class="hover:bg-base-200/50 border-none">
                                                        <td class="pl-12 w-16">M {{ m.month }}</td>
                                                        <td class="text-right text-error/70 italic">{{ formatCurrency(m.interestPayment) }}</td>
                                                        <td class="text-right text-success/70 italic">{{ formatCurrency(m.repaymentPayment) }}</td>
                                                        <td class="text-right text-primary/70 italic">{{ formatCurrency(m.totalPayment) }}</td>
                                                        <td class="text-right font-mono text-xs opacity-70">{{ formatCurrency(m.remainingBalance) }}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body { margin: 0; font-family: inherit; }
.rotate-90 { transform: rotate(90deg); }
/* Custom scrollbar for better appearance in fixed height table */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #555; }
</style>
