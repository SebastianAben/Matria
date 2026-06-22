export const patient = {
  initials: "AP",
  fullName: "Alya Prameswari",
  hospitalNumber: "281904",
  mrn: "MRN 281904",
  clinic: "ANC Clinic 2",
  dob: "1992-06-14",
  dobDisplay: "12 Aug 1992",
  age: "32y",
  sex: "Female",
  phone: "0812 3456 7890",
  email: "alya.prameswari@gmail.com",
  address: "Jl. Melati No. 12, Bandung, Jawa Barat",
  nationalId: "3279 3210 8808 0001",
  bloodType: "B+"
};

export const pregnancy = {
  label: "Episode 02",
  status: "Active",
  gestationalAge: "28w 4d",
  edd: "2025-08-05",
  lmp: "2025-01-12",
  pathway: "ANC Follow-up"
};

export const encounter = {
  name: "ANC Follow-up",
  visitType: "ANC Follow-up",
  facility: "ANC Clinic 2",
  facilityGroup: "RSIA Melati",
  state: "Active",
  reviewingState: "Reviewing",
  date: "2025-07-28",
  clinician: "Dr. Hana Kusuma",
  clinicianRole: "Obstetrician",
  unresolvedItems: 7
};

export const searchResults: Array<[string, string, string, string, string, string, string, string, string]> = [
  ["Alya Prameswari", "281904", "ANC Clinic 2", "12 Aug 1992", "32y", "0812 3456 7890", "ANC Follow-up", "EDD 2025-08-05", "Exact"],
  ["Alya Putri", "256712", "ANC Clinic 2", "21 Apr 1994", "31y", "0813 7788 9900", "ANC Outreach", "EDD 2025-07-20", "High"],
  ["Alya Permata", "241155", "RSIA Melati", "05 Jan 1993", "32y", "0822 1122 3344", "Completed", "Delivered 2024-12-10", "Medium"],
  ["Alysa Pratiwi", "272301", "ANC Clinic 2", "11 Nov 1995", "29y", "0815 6677 8899", "ANC Follow-up", "EDD 2025-09-12", "Low"],
  ["Alya Pradipta", "213008", "RSIA Melati", "30 Mar 1991", "34y", "0817 9988 7766", "Completed", "Delivered 2023-05-02", "Low"],
  ["Alya Pramudya", "298441", "ANC Clinic 2", "18 Sep 1996", "28y", "0821 4455 2233", "No episode", "-", "Low"]
];

export const episodes = [
  { name: "Episode 02", status: "Active", dates: "LMP 2025-01-12 • EDD 2025-08-05", outcome: "28w 4d", note: "ANC Follow-up" },
  { name: "Episode 01", status: "Completed", dates: "LMP 2022-10-03 • EDD 2023-07-10", outcome: "Delivered", note: "2023-07-08" },
  { name: "Postpartum 01", status: "Completed", dates: "Delivery 2023-07-08 • 6w postpartum", outcome: "Completed", note: "2023-08-19" }
];

export const recentEncounters: Array<[string, string, string, string]> = [
  ["ANC Follow-up", "2025-07-15", "Completed", "Dr. Hana Kusuma"],
  ["ANC Follow-up", "2025-06-17", "Completed", "Dr. Hana Kusuma"],
  ["ANC Screening", "2025-04-21", "Completed", "Dr. Hana Kusuma"],
  ["ANC Initial Visit", "2025-01-12", "Completed", "Dr. Hana Kusuma"]
];

export const observations: Array<[string, string, string, string]> = [
  ["BP", "118/76 mmHg", "10:09 • Manual", "Verified"],
  ["HR", "88 bpm", "10:09 • Auto", "Verified"],
  ["Temp", "36.7 °C", "10:09 • Manual", "Verified"],
  ["SpO2", "98%", "10:09 • Auto", "Verified"],
  ["Weight", "67.2 kg", "05/03 • EHR", "Verified"],
  ["BMI", "23.8", "05/03 • EHR", "Verified"],
  ["Fundal Height", "28 cm", "10:07 • Manual", "Verified"],
  ["Fetal Heart Rate", "146 bpm", "10:07 • Doppler", "Verified"]
];

export const transcriptTurns: Array<[string, string, string, string, string, string]> = [
  ["10:08:12", "Dr. Hana Kusuma", "Clinician", "Selamat pagi, Bu Alya. Bagaimana kabarnya hari ini?", "0.97", "Final"],
  ["10:08:18", "Alya Prameswari", "Patient", "Pagi dok. Saya baik, hanya kadang perut terasa kencang.", "0.94", "Final"],
  ["10:08:29", "Dr. Hana Kusuma", "Clinician", "Apakah ada flek atau keluar cairan dari jalan lahir?", "0.96", "Final"],
  ["10:08:35", "Alya Prameswari", "Patient", "Tidak ada flek, dok. Tidak ada cairan juga.", "0.93", "Final"],
  ["10:08:47", "Unknown", "Unknown", "...tekanan darahnya berapa tadi?", "0.48", "Low Confidence"],
  ["10:09:02", "Dr. Hana Kusuma", "Clinician", "Tekanan darah 118 per 76.", "0.98", "Corrected"],
  ["10:09:18", "Alya Prameswari", "Patient", "Iya dok, tadi sempat pusing sebentar tapi sekarang sudah hilang.", "0.92", "Final"]
];

export const rules: Array<[string, string, string, string, string, string]> = [
  ["Hemoglobin borderline low for 3rd trimester", "OB-ANEMIA-TRIM3", "High", "Acknowledge Required", "Hb 11.2 g/dL (05/01)", "Active"],
  ["Tetanus immunization status unclear", "OB-VACC-TDAP", "Medium", "Advisory", "No documentation found", "Acknowledged"],
  ["Proteinuria ≥ 1+ requires follow-up", "OB-PROT-UR-01", "Medium", "No", "Urine dip 1+ (10:09)", "Active"]
];

export const highlights: Array<[string, string, string, string, string]> = [
  ["Risk", "Preterm labor risk", "High", "Confidence 0.72", "2 sources"],
  ["Contradiction", "Fundal height vs GA", "Medium", "Confidence 0.61", "1 source"],
  ["Missing Context", "No anemia status", "Medium", "Confidence 0.58", "1 source"],
  ["Uncertainty", "Proteinuria value", "Low", "Confidence 0.42", "1 source"],
  ["Follow-up Need", "Next ANC in 2 weeks", "Low", "Confidence 0.92", "1 source"],
  ["Relevant Memory", "Low-back pain in prior visit", "Low", "Confidence 0.88", "From history"]
];

export const suggestions: Array<[string, string, string, string, string]> = [
  ["Address preterm labor risk", "Back pain + cramps", "High", "Open", "Open"],
  ["Add anemia status", "Missing lab context", "Medium", "Open", "Open"],
  ["Confirm proteinuria", "Urine dip unclear", "Medium", "Open", "Open"],
  ["Document fetal position", "Not documented", "Low", "Skipped", "-"],
  ["Vaccination status", "Not addressed", "Low", "Needs Follow-up", "Open"]
];

export const evidenceFindings: Array<[string, string, string, string, string]> = [
  ["Hemoglobin", "11.2 g/dL", "-", "Imported 10:50", "Review required"],
  ["Urine dip protein", "1+", "Semi-quantitative", "Captured 10:09", "Review required"],
  ["Blood pressure", "118/76 mmHg", "-", "Captured 10:06", "Reviewed"],
  ["Fetal heart rate", "146 bpm", "-", "Captured 10:07", "Reviewed"]
];

export const sourceTrace: Array<[string, string, string, string, string]> = [
  ["10:08:19", "Transcript", "Dr. Hana Kusuma", "...nyeri punggung bawah kadang kalau lama duduk.", "Turn 12"],
  ["10:09:02", "Observation", "Urine Dipstick", "Protein 1+", "Obs #4"],
  ["10:08:35", "Transcript", "Alya Prameswari", "Tidak ada flek, tidak ada cairan keluar.", "Turn 8"],
  ["10:06:12", "Observation", "Vital Signs", "BP 118/76 mmHg, Temp 36.7 C", "Obs #1"],
  ["10:12:20", "Note Excerpt", "Prior ANC", "HB 11.1 g/dL, TD given", "Note"]
];

export const artifactHistory: Array<[string, string, string, string, string]> = [
  ["10:15", "Current", "Summary Draft v3 (AI)", "Review required", "Dr. Hana Kusuma"],
  ["10:12", "Stale", "Summary Draft v2 (AI)", "Stale", "ANC AI"],
  ["10:05", "Stale", "Risk Synthesis v2 (AI)", "Stale", "ANC AI"],
  ["10:02", "Stale", "Summary Draft v1 (AI)", "Stale", "ANC AI"],
  ["09:58", "Stale", "Note Draft v1 (Manual)", "Stale", "Dr. Hana Kusuma"]
];

export const auditEvents: Array<[string, string, string, string, string, string]> = [
  ["2025-05-08 10:15:22", "System (AI)", "AI Synthesis Call", "Session Note", "Success", "Generated updated session note from transcript and observations."],
  ["2025-05-08 10:15:05", "Dr. Hana Kusuma", "Session Note Updated", "Session Note", "Success", "Edited AI-generated note; added counseling details and plan."],
  ["2025-05-08 10:14:41", "Dr. Hana Kusuma", "Transcript Correction", "Live Transcript", "Acknowledged", "Corrected transcript: pusing."],
  ["2025-05-08 10:14:21", "Matria Rules Engine", "Deterministic Rule Eval", "Ruleset", "Success", "Evaluated 2 rules; no blocking alerts triggered."],
  ["2025-05-08 10:14:18", "Evidence Service", "Evidence Handoff", "Observations -> Rules", "Success", "Handoff 6 data points with confidence > 0.90."],
  ["2025-05-08 10:13:58", "Dr. Hana Kusuma", "Observation Updated", "BP", "Success", "Changed from 120/80 mmHg to 118/76 mmHg."],
  ["2025-05-08 10:12:55", "Dr. Hana Kusuma", "Suggestion Approved", "Suggestion", "Success", "Approved suggestion: Fundal height trending appropriate."],
  ["2025-05-08 10:11:59", "Dr. Hana Kusuma", "Export", "Export Format: PDF", "Success", "Exported encounter summary for patient."]
];

export const users: Array<[string, string, string, string, string, string]> = [
  ["HK", "Dr. Hana Kusuma", "hana.kusuma@rsia-melati.co.id", "Hospital Admin, Clinician", "Active", "Today, 10:15"],
  ["AP", "Alya Prameswari", "alya.prameswari@rsia-melati.co.id", "OBGYN Specialist, Clinician", "Active", "Today, 09:42"],
  ["DS", "Dr. Sari Dewi", "dr.sari@rsia-melati.co.id", "OBGYN Specialist, Clinician", "Active", "Today, 08:34"],
  ["NR", "Nur Aini", "nur.aini@rsia-melati.co.id", "Nurse / Midwife", "Active", "Yesterday, 18:22"],
  ["BD", "Budi Santoso", "budi.santoso@rsia-melati.co.id", "Lab Staff", "Active", "Yesterday, 16:10"],
  ["TA", "Tina Agustina", "tina.agustina@rsia-melati.co.id", "Nurse / Midwife", "Inactive", "3 days ago"],
  ["MR", "Michael Rahardjo", "michael.rahardjo@rsia-melati.co.id", "Auditor", "Active", "5 days ago"],
  ["DS", "Dewi Setiawati", "dewi.setiawati@rsia-melati.co.id", "Nurse / Midwife", "Active", "Yesterday, 11:03"]
];

export const roles: Array<[string, string]> = [
  ["Clinician", "28 users"],
  ["Nurse / Midwife", "52 users"],
  ["OBGYN Specialist", "18 users"],
  ["Lab Staff", "16 users"],
  ["Hospital Admin", "8 users"],
  ["Auditor", "6 users"]
];
