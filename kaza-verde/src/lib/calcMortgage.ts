export interface MortgageInput {
  totalAmount: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxPct: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  maintenanceMonthly: number;
  utilitiesMonthly: number;
}

export interface MortgageResult {
  downPayment: number;
  loanAmount: number;
  monthlyMortgage: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyMaintenance: number;
  monthlyUtilities: number;
  totalMonthly: number;
}

export function calcMortgage(input: MortgageInput): MortgageResult {
  const downPayment = input.totalAmount * (input.downPaymentPct / 100);
  const loanAmount = input.totalAmount - downPayment;

  let monthlyMortgage = 0;
  if (loanAmount > 0 && input.interestRate > 0 && input.loanTermYears > 0) {
    const r = input.interestRate / 100 / 12;
    const n = input.loanTermYears * 12;
    const rn = Math.pow(1 + r, n);
    monthlyMortgage = loanAmount * (r * rn) / (rn - 1);
  } else if (loanAmount > 0 && input.loanTermYears > 0) {
    monthlyMortgage = loanAmount / (input.loanTermYears * 12);
  }

  const monthlyTax = input.totalAmount * (input.propertyTaxPct / 100) / 12;
  const monthlyInsurance = input.insuranceAnnual / 12;
  const monthlyHoa = input.hoaMonthly;
  const monthlyMaintenance = input.maintenanceMonthly;
  const monthlyUtilities = input.utilitiesMonthly;

  const totalMonthly =
    monthlyMortgage + monthlyTax + monthlyInsurance + monthlyHoa +
    monthlyMaintenance + monthlyUtilities;

  return {
    downPayment,
    loanAmount,
    monthlyMortgage,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyMaintenance,
    monthlyUtilities,
    totalMonthly,
  };
}
