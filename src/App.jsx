import { useEffect, useState, Suspense, lazy, useCallback } from 'react';
import './App.css';
import Layout from '@components/layout/Layout';
import { ErrorBoundary } from '@components/common';
import { fetchPatients } from './services/api';

// ADA/Performance Best Practice: Lazy Loading components
const PatientList = lazy(() => import('./components/dashboard/PatientList'));
const DiagnosisView = lazy(() => import('./components/dashboard/DiagnosisView'));
const PatientProfile = lazy(() => import('./components/dashboard/PatientProfile'));

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatients()
      .then((data) => {
        setPatients(data);
        // Default to Jessica Taylor
        const jessica = data.find((p) => p.name === 'Jessica Taylor');
        if (jessica) {
          setSelectedPatientId(jessica.name);
        } else if (data.length > 0) {
          setSelectedPatientId(data[0].name);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handlePatientSelect = useCallback((name) => {
    setSelectedPatientId(name);
  }, []);

  const selectedPatient = patients.find((p) => p.name === selectedPatientId) || null;

  if (loading) {
    return (
      <Layout>
        <div aria-live="polite" style={{ padding: '2rem', textAlign: 'center', flex: 1 }}>
          Loading dashboard...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div role="alert" style={{ padding: '2rem', textAlign: 'center', flex: 1 }}>
          Failed to load data. Please try again later.
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        {/* Left Column */}
        <aside className="sidebar-left" aria-label="Patient Directory">
          <ErrorBoundary fallback={<div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>Failed to load patient list.</div>}>
            <Suspense fallback={<div aria-live="polite">Loading Patients...</div>}>
              <PatientList
                patients={patients}
                selectedPatientId={selectedPatientId}
                onPatientSelect={handlePatientSelect}
              />
            </Suspense>
          </ErrorBoundary>
        </aside>

        {/* Center Column */}
        <main className="main-content" role="main">
          {selectedPatient ? (
            <ErrorBoundary fallback={<div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>Failed to load diagnosis data.</div>}>
              <Suspense fallback={<div aria-live="polite">Loading Diagnosis...</div>}>
                <DiagnosisView
                  diagnosisHistory={selectedPatient.diagnosis_history}
                  diagnosticList={selectedPatient.diagnostic_list}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Select a patient to view diagnosis details.
            </div>
          )}
        </main>

        {/* Right Column */}
        <aside className="sidebar-right" aria-label="Patient Profile and Lab Results">
          {selectedPatient ? (
            <ErrorBoundary fallback={<div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>Failed to load patient profile.</div>}>
              <Suspense fallback={<div aria-live="polite">Loading Profile...</div>}>
                <PatientProfile patient={selectedPatient} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Select a patient to view profile.
            </div>
          )}
        </aside>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
