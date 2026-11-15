import { createRoot } from 'react-dom/client';
import { Classroom, ClassroomReport, refreshSession } from './Classroom.jsx';
import { api } from '../api/client.js';
import { classroomRun } from '../core/scoring.js';
import { bestDirect } from '../state/selectors.js';
import { moonRoute } from '../core/physics/route.js';
import { Store } from '../state/store.js';
import { Screens } from '../app/router.js';

const records = new WeakMap();
export function mountClassroom() {
  refreshSession();
  const section = document.getElementById('sec-class');
  section.querySelector('.lead').textContent = 'The teacher creates a mission room. Teams join from their own devices, design and fly the mission, then submit their reports. Compare science, fuel savings, cost and arrival time, and learn from failed flights.';
  createRoot(section.querySelector('.classmock')).render(<Classroom />);
}

export function installClassroomReport() {
  const original = Screens.report.enter, exit = Screens.report.exit;
  let reportRoot;
  Screens.report.enter = function (...args) {
    reportRoot?.unmount(); reportRoot = null;
    original.apply(this, args);
    const flight = Store.session.flight;
    if (!flight?.outcome) return;
    let record = records.get(flight);
    if (!record) {
      const baseline = flight.mission === 'moon' ? moonRoute(flight.rt?.t0 || 0, 2.3) : bestDirect(flight.mission);
      record = { run: { ...classroomRun(flight, baseline), clientRunId: api.newRunId() }, sent: null };
      records.set(flight, record); api.saveFlight(record.run);
    }
    const host = document.createElement('div'); host.id = 'classroomReport';
    document.querySelector('#repScroll .rep > div:last-child').append(host);
    refreshSession(); reportRoot = createRoot(host); reportRoot.render(<ClassroomReport record={record} />);
  };
  Screens.report.exit = function (...args) { reportRoot?.unmount(); reportRoot = null; return exit?.apply(this, args); };
}
