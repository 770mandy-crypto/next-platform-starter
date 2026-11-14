import { PROVIDERS } from 'lib/appointments/planner';
import { AppointmentPlanner } from './planner';

export default function AppointmentsPage() {
    return <AppointmentPlanner providers={Object.entries(PROVIDERS)} />;
}
