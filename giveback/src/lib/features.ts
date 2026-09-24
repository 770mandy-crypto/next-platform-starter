// Features that can be switched on per build. Off unless the build sets the
// variable to "true" (EXPO_PUBLIC_* values are fixed at build time).

/** Photo → listing drafted by Claude. Needs ANTHROPIC_API_KEY on the server. */
export const AI_ENABLED = process.env.EXPO_PUBLIC_AI_ENABLED === 'true';
