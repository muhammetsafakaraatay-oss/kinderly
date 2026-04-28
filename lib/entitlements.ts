export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'inactive'

export type EntitlementSnapshot = {
  organizationId: string | null
  organizationType: 'school'
  planCode: string | null
  subscriptionStatus: SubscriptionStatus
  features: string[]
  limits: Record<string, number | null>
}

type PlanCarrier = {
  id?: number | string | null
  plan?: string | null
  plan_bitis?: string | null
}

const FEATURE_MAP: Record<string, string[]> = {
  starter: ['student_roster', 'parent_messaging', 'attendance'],
  growth: ['student_roster', 'parent_messaging', 'attendance', 'billing', 'daily_reports'],
  scale: [
    'student_roster',
    'parent_messaging',
    'attendance',
    'billing',
    'daily_reports',
    'advanced_reporting',
    'multi_staff',
  ],
}

const LIMIT_MAP: Record<string, Record<string, number | null>> = {
  starter: { studentCount: 50, staffCount: 10 },
  growth: { studentCount: 200, staffCount: 40 },
  scale: { studentCount: null, staffCount: null },
}

function normalizePlanCode(plan: string | null | undefined) {
  if (!plan) return null
  return plan.trim().toLocaleLowerCase('tr-TR')
}

function resolveSubscriptionStatus(planCode: string | null, planEnd: string | null | undefined): SubscriptionStatus {
  if (!planCode) return 'inactive'
  if (!planEnd) return 'active'

  const endDate = new Date(planEnd)
  if (Number.isNaN(endDate.getTime())) return 'active'

  return endDate.getTime() >= Date.now() ? 'active' : 'past_due'
}

export function buildEntitlementSnapshot(source: PlanCarrier | null | undefined): EntitlementSnapshot {
  const planCode = normalizePlanCode(source?.plan)
  const subscriptionStatus = resolveSubscriptionStatus(planCode, source?.plan_bitis)

  return {
    organizationId: source?.id != null ? String(source.id) : null,
    organizationType: 'school',
    planCode,
    subscriptionStatus,
    features: planCode ? FEATURE_MAP[planCode] ?? FEATURE_MAP.starter : [],
    limits: planCode ? LIMIT_MAP[planCode] ?? LIMIT_MAP.starter : {},
  }
}
