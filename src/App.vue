<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  CreditCalculatorService,
  type CreditCalculatorOptions,
} from '@/services/credit-calculator.service'
import { EtfCalculatorService, type EtfCalculatorOptions } from '@/services/etf-calculator.service'

// --- CONSTANTS ---
const STORAGE_KEY_CREDIT = 'credit_calc_data'
const STORAGE_KEY_ETF = 'etf_calc_data'

interface CalculationInstance extends CreditCalculatorOptions {
  id: string
  name: string
}

interface EtfInstance extends EtfCalculatorOptions {
  id: string
  name: string
}

// --- CREDIT CALCULATOR STATE ---
const calculations = ref<CalculationInstance[]>([
  {
    id: crypto.randomUUID(),
    name: 'Hauskauf A',
    equity: 50000,
    loanAmount: 250000,
    interestRate: 3.5,
    initialRepayment: 2.0,
  },
])
const expandedCreditId = ref<string>(calculations.value[0].id)
const expandedYears = ref<Record<string, number[]>>({})

// --- ETF CALCULATOR STATE ---
const etfCalculations = ref<EtfInstance[]>([
  {
    id: crypto.randomUUID(),
    name: 'Welt-Portfolio',
    initialBalance: 10000,
    monthlyContribution: 500,
    annualReturnRate: 7.0,
    years: 30,
  },
])
const expandedEtfId = ref<string>(etfCalculations.value[0].id)

// --- PERSISTENCE ---
onMounted(() => {
  const storedCredit = localStorage.getItem(STORAGE_KEY_CREDIT)
  if (storedCredit) {
    try {
      const parsed = JSON.parse(storedCredit)
      if (Array.isArray(parsed) && parsed.length > 0) {
        calculations.value = parsed
        expandedCreditId.value = calculations.value[0].id
      }
    } catch (e) {
      console.error(e)
    }
  }

  const storedEtf = localStorage.getItem(STORAGE_KEY_ETF)
  if (storedEtf) {
    try {
      const parsed = JSON.parse(storedEtf)
      if (Array.isArray(parsed) && parsed.length > 0) {
        etfCalculations.value = parsed
        expandedEtfId.value = etfCalculations.value[0].id
      }
    } catch (e) {
      console.error(e)
    }
  }
})

watch(
  calculations,
  (newVal) => {
    localStorage.setItem(STORAGE_KEY_CREDIT, JSON.stringify(newVal))
  },
  { deep: true },
)

watch(
  etfCalculations,
  (newVal) => {
    localStorage.setItem(STORAGE_KEY_ETF, JSON.stringify(newVal))
  },
  { deep: true },
)

// --- CREDIT ACTIONS ---
const addCreditCalc = () => {
  const last = calculations.value[calculations.value.length - 1]
  const newCalc = {
    ...last,
    id: crypto.randomUUID(),
    name: `Kredit ${calculations.value.length + 1}`,
  }
  calculations.value.push(newCalc)
  expandedCreditId.value = newCalc.id
}
const removeCreditCalc = (id: string) => {
  if (calculations.value.length > 1) {
    calculations.value = calculations.value.filter((c) => c.id !== id)
    if (expandedCreditId.value === id) expandedCreditId.value = calculations.value[0].id
  }
}

// --- ETF ACTIONS ---
const addEtfCalc = () => {
  const last = etfCalculations.value[etfCalculations.value.length - 1]
  const newCalc = {
    ...last,
    id: crypto.randomUUID(),
    name: `Sparplan ${etfCalculations.value.length + 1}`,
  }
  etfCalculations.value.push(newCalc)
  expandedEtfId.value = newCalc.id
}
const removeEtfCalc = (id: string) => {
  if (etfCalculations.value.length > 1) {
    etfCalculations.value = etfCalculations.value.filter((c) => c.id !== id)
    if (expandedEtfId.value === id) expandedEtfId.value = etfCalculations.value[0].id
  }
}

// --- COMPUTED RESULTS ---
const creditResults = computed(() => {
  return calculations.value.map((calc) => {
    const monthlyRate = CreditCalculatorService.calculateMonthlyRate(
      calc.loanAmount,
      calc.interestRate,
      calc.initialRepayment,
    )
    const schedule = CreditCalculatorService.calculateSchedule({ ...calc })
    const yearlySchedule = CreditCalculatorService.aggregateYearlySchedule(schedule)
    const totalInterest = schedule.reduce((sum, m) => sum + m.interestPayment, 0)
    return {
      ...calc,
      monthlyRate,
      schedule,
      yearlySchedule,
      totalInterest,
      durationYears: yearlySchedule.length,
    }
  })
})

const etfResults = computed(() => {
  return etfCalculations.value.map((calc) => {
    const schedule = EtfCalculatorService.calculateGrowth({ ...calc })
    const last = schedule[schedule.length - 1]
    return {
      ...calc,
      schedule,
      totalEndBalance: last?.endBalance || 0,
      totalInterest: last?.totalInterest || 0,
      totalInvested: last?.totalInvested || 0,
    }
  })
})

const activeCredit = computed(
  () => creditResults.value.find((r) => r.id === expandedCreditId.value) || creditResults.value[0],
)
const activeEtf = computed(
  () => etfResults.value.find((r) => r.id === expandedEtfId.value) || etfResults.value[0],
)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

const toggleYearCredit = (calcId: string, year: number) => {
  if (!expandedYears.value[calcId]) expandedYears.value[calcId] = []
  if (expandedYears.value[calcId].includes(year)) {
    expandedYears.value[calcId] = expandedYears.value[calcId].filter((y) => y !== year)
  } else {
    expandedYears.value[calcId].push(year)
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-100 p-4 md:p-8 space-y-16">
    <div class="max-w-7xl mx-auto">
      <!-- HEADER -->
      <header class="text-center mb-12">
        <h1 class="text-5xl font-black text-primary mb-2">Finanz-Dashboard</h1>
        <p class="text-xl opacity-60">Immobilienkredite und ETF-Sparpläne präzise planen.</p>
      </header>

      <!-- SECTION 1: CREDIT CALCULATOR -->
      <section class="space-y-8">
        <div
          class="flex flex-col md:flex-row justify-between items-center bg-primary/10 p-6 rounded-2xl border border-primary/20 gap-4"
        >
          <div class="flex items-center gap-4">
            <div class="bg-primary text-primary-content p-3 rounded-xl shadow-inner text-2xl">
              🏠
            </div>
            <div>
              <h2 class="text-3xl font-bold text-primary">Immobilienkredit-Vergleich</h2>
              <p class="opacity-70">Tilgung, Zinsen und Laufzeit Ihrer Finanzierungen.</p>
            </div>
          </div>
          <button @click="addCreditCalc" class="btn btn-primary shadow-lg">
            + Vergleich hinzufügen
          </button>
        </div>

        <!-- Summary Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="res in creditResults"
            :key="res.id"
            class="card bg-base-200 shadow-md border-2 cursor-pointer transition-all hover:shadow-lg"
            :class="
              expandedCreditId === res.id
                ? 'border-primary ring-2 ring-primary/20 bg-base-100'
                : 'border-transparent opacity-80'
            "
            @click="expandedCreditId = res.id"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <input
                  v-model="res.name"
                  @click.stop
                  class="bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-primary w-full"
                />
                <button
                  @click.stop="removeCreditCalc(res.id)"
                  class="btn btn-ghost btn-circle btn-xs text-error"
                  v-if="calculations.length > 1"
                >
                  ✕
                </button>
              </div>
              <div class="mt-4 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Monatsrate:</span>
                  <span class="font-bold text-secondary">{{
                    formatCurrency(res.monthlyRate)
                  }}</span>
                </div>
                <div class="flex justify-between border-t border-base-300 pt-1 mt-1">
                  <span>Laufzeit:</span>
                  <span class="font-bold">{{ res.durationYears }} Jahre</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Detail Area -->
        <div
          v-if="activeCredit"
          class="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-base-200/40 p-6 rounded-3xl border border-base-200"
        >
          <!-- Sidebar Editor -->
          <div class="lg:col-span-4 space-y-4">
            <div class="card bg-base-100 shadow-xl border border-base-300">
              <div class="card-body p-6">
                <h3 class="card-title text-primary mb-4 border-b pb-2">
                  Parameter: {{ activeCredit.name }}
                </h3>

                <div class="space-y-4">
                  <!-- Form Row: Equity -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Eigenkapital</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="calculations.find((c) => c.id === activeCredit.id)!.equity"
                        type="number"
                        class="input input-bordered input-sm w-full join-item focus:input-primary"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">€</span>
                    </div>
                  </div>

                  <!-- Form Row: Loan -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Darlehen</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          calculations.find((c) => c.id === activeCredit.id)!.loanAmount
                        "
                        type="number"
                        class="input input-bordered input-sm w-full join-item focus:input-primary"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">€</span>
                    </div>
                  </div>

                  <!-- Form Row: Interest -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Sollzins</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          calculations.find((c) => c.id === activeCredit.id)!.interestRate
                        "
                        type="number"
                        step="0.01"
                        class="input input-bordered input-sm w-full join-item focus:input-primary"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">%</span>
                    </div>
                  </div>

                  <!-- Form Row: Repayment -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Anf. Tilgung</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          calculations.find((c) => c.id === activeCredit.id)!.initialRepayment
                        "
                        type="number"
                        step="0.01"
                        class="input input-bordered input-sm w-full join-item focus:input-primary"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">%</span>
                    </div>
                  </div>
                </div>

                <div class="mt-6 pt-4 border-t border-dashed border-base-300">
                  <div class="flex justify-between items-center text-sm">
                    <span class="opacity-60">Gesamtzinsen:</span>
                    <span class="font-bold text-error">{{
                      formatCurrency(activeCredit.totalInterest)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Table Detail -->
          <div class="lg:col-span-8">
            <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden h-full">
              <div
                class="p-4 bg-primary/5 font-bold flex justify-between items-center border-b border-base-200"
              >
                <span class="flex items-center gap-2"
                  >📋 Tilgungsplan
                  <span class="text-xs font-normal opacity-50">(Klicken für Monate)</span></span
                >
                <span class="badge badge-primary badge-sm"
                  >Laufzeit: {{ activeCredit.durationYears }} Jahre</span
                >
              </div>
              <div class="overflow-x-auto max-h-[500px]">
                <table class="table table-pin-rows">
                  <thead>
                    <tr class="bg-base-200">
                      <th>Jahr</th>
                      <th class="text-right">Zinsen</th>
                      <th class="text-right">Tilgung</th>
                      <th class="text-right">Gesamt</th>
                      <th class="text-right">Restschuld</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="y in activeCredit.yearlySchedule" :key="y.year">
                      <tr
                        @click="toggleYearCredit(activeCredit.id, y.year)"
                        class="cursor-pointer hover:bg-base-200 font-bold border-t border-base-200 group"
                      >
                        <td>
                          <span class="group-hover:translate-x-1 inline-block transition-transform"
                            >→ {{ y.year }}</span
                          >
                        </td>
                        <td class="text-right text-error">
                          {{ formatCurrency(y.interestPayment) }}
                        </td>
                        <td class="text-right text-success">
                          {{ formatCurrency(y.repaymentPayment) }}
                        </td>
                        <td class="text-right">{{ formatCurrency(y.totalPayment) }}</td>
                        <td class="text-right font-mono text-sm opacity-80">
                          {{ formatCurrency(y.remainingBalance) }}
                        </td>
                      </tr>
                      <tr v-if="expandedYears[activeCredit.id]?.includes(y.year)">
                        <td colspan="5" class="p-0 bg-base-200/30">
                          <table class="table table-xs w-full">
                            <tbody>
                              <tr
                                v-for="m in activeCredit.schedule.filter((m) => m.year === y.year)"
                                :key="m.month"
                                class="border-none opacity-80"
                              >
                                <td class="pl-12 w-24 font-semibold">Monat {{ m.month }}</td>
                                <td class="text-right text-error italic">
                                  {{ formatCurrency(m.interestPayment) }}
                                </td>
                                <td class="text-right text-success italic">
                                  {{ formatCurrency(m.repaymentPayment) }}
                                </td>
                                <td class="text-right italic">
                                  {{ formatCurrency(m.totalPayment) }}
                                </td>
                                <td class="text-right font-mono text-xs">
                                  {{ formatCurrency(m.remainingBalance) }}
                                </td>
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
      </section>

      <div
        class="divider h-1 bg-gradient-to-r from-transparent via-base-300 to-transparent my-16"
      ></div>

      <!-- SECTION 2: ETF CALCULATOR -->
      <section class="space-y-8 pb-16">
        <div
          class="flex flex-col md:flex-row justify-between items-center bg-success/10 p-6 rounded-2xl border border-success/20 gap-4"
        >
          <div class="flex items-center gap-4">
            <div class="bg-success text-success-content p-3 rounded-xl shadow-inner text-2xl">
              📈
            </div>
            <div>
              <h2 class="text-3xl font-bold text-success">ETF Sparplan-Vergleich</h2>
              <p class="opacity-70">Zinseszinseffekt und langfristiger Vermögensaufbau.</p>
            </div>
          </div>
          <button @click="addEtfCalc" class="btn btn-success text-white shadow-lg">
            + Vergleich hinzufügen
          </button>
        </div>

        <!-- Summary Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="res in etfResults"
            :key="res.id"
            class="card bg-base-200 shadow-md border-2 cursor-pointer transition-all hover:shadow-lg"
            :class="
              expandedEtfId === res.id
                ? 'border-success ring-2 ring-success/20 bg-base-100'
                : 'border-transparent opacity-80'
            "
            @click="expandedEtfId = res.id"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <input
                  v-model="res.name"
                  @click.stop
                  class="bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-success w-full"
                />
                <button
                  @click.stop="removeEtfCalc(res.id)"
                  class="btn btn-ghost btn-circle btn-xs text-error"
                  v-if="etfCalculations.length > 1"
                >
                  ✕
                </button>
              </div>
              <div class="mt-4 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Endwert:</span>
                  <span class="font-bold text-success">{{
                    formatCurrency(res.totalEndBalance)
                  }}</span>
                </div>
                <div class="flex justify-between border-t border-base-300 pt-1 mt-1">
                  <span>Dauer:</span> <span class="font-bold">{{ res.years }} Jahre</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Detail Area -->
        <div
          v-if="activeEtf"
          class="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-base-200/40 p-6 rounded-3xl border border-base-200"
        >
          <!-- Sidebar Editor -->
          <div class="lg:col-span-4 space-y-4">
            <div class="card bg-base-100 shadow-xl border border-base-300">
              <div class="card-body p-6">
                <h3 class="card-title text-success mb-4 border-b pb-2">
                  Parameter: {{ activeEtf.name }}
                </h3>

                <div class="space-y-4">
                  <!-- Form Row: Start -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Startkapital</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          etfCalculations.find((c) => c.id === activeEtf.id)!.initialBalance
                        "
                        type="number"
                        class="input input-bordered input-sm w-full join-item focus:input-success"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">€</span>
                    </div>
                  </div>

                  <!-- Form Row: Contribution -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Sparrate</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          etfCalculations.find((c) => c.id === activeEtf.id)!.monthlyContribution
                        "
                        type="number"
                        class="input input-bordered input-sm w-full join-item focus:input-success"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">€</span>
                    </div>
                  </div>

                  <!-- Form Row: Return -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Rendite p.a.</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="
                          etfCalculations.find((c) => c.id === activeEtf.id)!.annualReturnRate
                        "
                        type="number"
                        step="0.1"
                        class="input input-bordered input-sm w-full join-item focus:input-success"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">%</span>
                    </div>
                  </div>

                  <!-- Form Row: Years -->
                  <div class="grid grid-cols-5 items-center gap-2">
                    <label class="col-span-2 text-sm font-semibold opacity-70">Laufzeit</label>
                    <div class="join col-span-3">
                      <input
                        v-model.number="etfCalculations.find((c) => c.id === activeEtf.id)!.years"
                        type="number"
                        class="input input-bordered input-sm w-full join-item focus:input-success"
                      />
                      <span class="btn btn-sm btn-disabled join-item px-2">J.</span>
                    </div>
                  </div>
                </div>

                <div
                  class="mt-6 p-3 bg-base-200/50 rounded-xl space-y-2 border border-base-300 shadow-inner"
                >
                  <div class="flex justify-between text-xs opacity-70">
                    <span>Eingezahlt:</span>
                    <span>{{ formatCurrency(activeEtf.totalInvested) }}</span>
                  </div>
                  <div class="flex justify-between text-sm font-bold">
                    <span>Zinsertrag:</span>
                    <span class="text-success">{{ formatCurrency(activeEtf.totalInterest) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Table Detail -->
          <div class="lg:col-span-8">
            <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden h-full">
              <div
                class="p-4 bg-success/5 font-bold text-success flex justify-between items-center border-b border-base-200"
              >
                <span>🚀 Entwicklungsübersicht: {{ activeEtf.name }}</span>
                <div class="flex gap-2">
                  <span class="badge badge-success badge-sm text-white">{{
                    formatCurrency(activeEtf.totalEndBalance)
                  }}</span>
                </div>
              </div>
              <div class="overflow-x-auto max-h-[500px]">
                <table class="table table-pin-rows table-zebra">
                  <thead>
                    <tr class="bg-base-200">
                      <th>Jahr</th>
                      <th class="text-right">Einzahlung (Jahr)</th>
                      <th class="text-right">Ertrag (Jahr)</th>
                      <th class="text-right">Endwert</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="y in activeEtf.schedule" :key="y.year" class="hover:bg-success/5">
                      <td>Jahr {{ y.year }}</td>
                      <td class="text-right opacity-80">
                        {{ formatCurrency(y.investedThisYear) }}
                      </td>
                      <td class="text-right text-success font-semibold">
                        +{{ formatCurrency(y.interestEarned) }}
                      </td>
                      <td class="text-right font-bold">{{ formatCurrency(y.endBalance) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
}
.input:focus {
  border-width: 2px;
}
</style>
