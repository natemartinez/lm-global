export interface BloodPressureReading {
  systolic: {
    value: number;
    levels: string;
  };
  diastolic: {
    value: number;
    levels: string;
  };
}

export interface VitalReading {
  value: number;
  levels: string;
}

export interface DiagnosisHistoryEntry {
  month: string;
  year: number;
  blood_pressure: BloodPressureReading;
  heart_rate: VitalReading;
  respiratory_rate: VitalReading;
  temperature: VitalReading;
}

export interface DiagnosticItem {
  name: string;
  description: string;
  status: string;
}

export interface PatientData {
  name: string;
  gender: string;
  age: number;
  profile_picture: string;
  date_of_birth: string;
  phone_number: string;
  emergency_contact: string;
  insurance_type: string;
  diagnosis_history: DiagnosisHistoryEntry[];
  diagnostic_list: DiagnosticItem[];
  lab_results: string[];
}

export type PatientsResponse = PatientData[];
