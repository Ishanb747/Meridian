export const featureFlags = {
  escalation: process.env.NEXT_PUBLIC_ESCALATION_ENABLED === 'true',
  email:      process.env.NEXT_PUBLIC_NOTIFICATIONS_EMAIL_ENABLED === 'true',
  teams:      process.env.NEXT_PUBLIC_NOTIFICATIONS_TEAMS_ENABLED === 'true',
  analytics:  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false', // on by default
}
