'use client';

import { GoalSetup, Landing } from 'components/pilot/onboarding';
import { useMaslul } from 'components/pilot/store';
import { Workspace } from 'components/pilot/workspace';

// The whole journey on one route: sign up → "what's your goal?" → workspace.
// Which screen shows is derived from what the user has done so far.
export default function PilotPage() {
    const app = useMaslul();
    const { state, ready } = app;

    if (!ready) return <div className="min-h-screen bg-slate-50" />;
    if (!state.user) return <Landing onSignUp={app.signUp} />;
    if (!state.project) return <GoalSetup user={state.user} onCreate={app.createProject} />;
    return <Workspace app={app} />;
}
