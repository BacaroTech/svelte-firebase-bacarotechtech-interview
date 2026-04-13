// src/lib/config/schedule.ts

export interface TalkSession {
  id: string;
  title: string;
  speakers: string[];
  room: string;
  startTime: string; // ISO UTC
  endTime: string;   // ISO UTC
  isService: boolean; // true per Coffee Break, Lunch, sponsor slot
}

export const SESSIONS: TalkSession[] = [
  // 09:00 — Keynote plenum
  { id: '1125949', title: 'Keynote - Global Azure 2026', speakers: ['Luigi Pandolfino', 'Andrea Marchi'], room: 'Palladio 1', startTime: '2026-04-17T07:00:00.000Z', endTime: '2026-04-17T08:00:00.000Z', isService: false },
  // 10:00 — Keynote Tiziano Durante (service)
  { id: '4eeb2fae', title: 'Keynote: Tiziano Durante', speakers: [], room: 'Palladio 1', startTime: '2026-04-17T08:00:00.000Z', endTime: '2026-04-17T08:20:00.000Z', isService: true },
  // 10:20 — Coffee Break
  { id: '930bf39f', title: 'Coffee Break', speakers: [], room: '', startTime: '2026-04-17T08:20:00.000Z', endTime: '2026-04-17T08:50:00.000Z', isService: true },
  // 10:50 — sessioni parallele
  { id: '1126803', title: 'Microsoft Foundry: The Agent Revolution', speakers: ['Roberta Bruno', 'Guenda Sciancalepore'], room: 'Palladio 1', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: 'b23a6ef7', title: 'Da 1.8M€ a Zero Visibility: Purple Teaming Data-Driven per Microsoft Security Stack', speakers: [], room: 'Palladio 2', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: true }, // sponsor slot — no attributed speaker; excluded from getTalksAtTime and EventSchedule cards
  { id: '1113384', title: 'Active Directory Evolution in Windows Server 2025: Migrazione e Best Practices', speakers: ['Nicola Ferrini'], room: 'Trissino', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: '1122975', title: 'Azure e la frontiera della Produttività: analisi economica dello scaling industriale', speakers: ['Andrea Saravalle'], room: 'Verdi', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  { id: '1128972', title: 'Observing applications from Dev to Azure with .NET Aspire', speakers: ['Alessandro Melchiori'], room: 'Mozart', startTime: '2026-04-17T08:50:00.000Z', endTime: '2026-04-17T09:40:00.000Z', isService: false },
  // 11:40 — sessioni parallele
  { id: '1092822', title: 'AI e Governance Multi-Cloud: due facce della stessa medaglia tra innovazione e rischio', speakers: ['Francesco Molfese'], room: 'Palladio 1', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1125183', title: 'Identity Threat Defense end‑to‑end', speakers: ['Zeno Testoni'], room: 'Palladio 2', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1116487', title: 'The hard way of a Kusto Ninja: Azure Monitor, Log Analytics e dashboard che contano davvero', speakers: ['Giuliano Latini'], room: 'Trissino', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1096052', title: 'Dal Networking alla Data Platform: Architetture Azure Databricks per Scalabilità e Sicurezza', speakers: ['Carlo Pio Luigi Ciciriello', 'Salvatore Cavallaro'], room: 'Verdi', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  { id: '1114998', title: 'Blockchain as a Service? Con Azure Confidential Ledger è realtà', speakers: ['Mattia Contessa'], room: 'Mozart', startTime: '2026-04-17T09:40:00.000Z', endTime: '2026-04-17T10:30:00.000Z', isService: false },
  // 12:30 — Light Lunch
  { id: 'd7cf7d93', title: 'Light Lunch', speakers: [], room: '', startTime: '2026-04-17T10:30:00.000Z', endTime: '2026-04-17T12:00:00.000Z', isService: true },
  // 14:00 — sessioni parallele
  { id: '1132703', title: 'Dalla security alla compliance: i vantaggi del cloud in casa con Azure Local', speakers: ['Silvio Di Benedetto'], room: 'Palladio 1', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '1121099', title: 'Identità, accessi e sicurezza zero trust: un viaggio pratico dentro Entra Suite', speakers: ['Roberto Tafuri'], room: 'Palladio 2', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '631da94f', title: 'Avepoint', speakers: [], room: 'Trissino', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:15:00.000Z', isService: true },
  { id: '1114543', title: 'Riduzione costi, data anti-gravity e geo-distribuzione del dato: una tripletta (im)possibile?', speakers: ['Alessandro Dellavedova'], room: 'Verdi', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  { id: '1125515', title: 'Virtualizzazione: oltre il modello tradizionale', speakers: ['Roberto Corso'], room: 'Mozart', startTime: '2026-04-17T12:00:00.000Z', endTime: '2026-04-17T12:50:00.000Z', isService: false },
  // 14:15
  { id: '1119223', title: 'Hybrid Exchange senza dolore: il merge degli attributi in Exchange Online', speakers: ['Paolo Miotti'], room: 'Trissino', startTime: '2026-04-17T12:15:00.000Z', endTime: '2026-04-17T12:55:00.000Z', isService: false },
  // 14:50
  { id: '1130376', title: 'Azure PaaS networking how-to', speakers: ['Marco Obinu'], room: 'Palladio 1', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1093279', title: 'Il Dato è un Tesoro: Purview DLP è il Guardiano del Valore Aziendale', speakers: ['Guido Imperatore'], room: 'Palladio 2', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1117687', title: 'Il Cloud ha un prezzo (ma decidi tu quale): Le basi del Cost Management in Azure.', speakers: ['Emanuele Ciminaghi'], room: 'Verdi', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  { id: '1120042', title: 'Private AI di NT: dati, strategie e tecnologie per la Sovranità dei dati', speakers: ['Maila Zorzenone'], room: 'Mozart', startTime: '2026-04-17T12:50:00.000Z', endTime: '2026-04-17T13:05:00.000Z', isService: false },
  // 14:55
  { id: '1132918', title: 'Email applicative tra Azure e Microsoft 365: opzioni, limiti e best practice', speakers: ['Raffaele Colavecchi'], room: 'Trissino', startTime: '2026-04-17T12:55:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  // 15:10
  { id: '1118559', title: 'Azure - Opportunità per Reseller e ISV Microsoft', speakers: ['Michele Ruberti'], room: 'Mozart', startTime: '2026-04-17T13:10:00.000Z', endTime: '2026-04-17T13:40:00.000Z', isService: false },
  // 15:40 — Coffee Break
  { id: '0e66aec9', title: 'Coffee Break', speakers: [], room: '', startTime: '2026-04-17T13:40:00.000Z', endTime: '2026-04-17T14:10:00.000Z', isService: true },
  // 16:10 — sessioni parallele
  { id: '1121324', title: 'Azure Firewall o FortiGate (NVA)? Guida pratica alla scelta', speakers: ['Luca Torresi'], room: 'Palladio 1', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '1125851', title: 'Abbiamo Microsoft Security Copilot… e adesso?', speakers: ['Marco Passanisi'], room: 'Palladio 2', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '1114634', title: "Cloud sotto attacco: l'evoluzione necessaria oltre la sicurezza tradizionale", speakers: ['Elias Moioli'], room: 'Trissino', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  { id: '767401bc', title: 'Elevator Innovation Hub', speakers: [], room: 'Verdi', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T14:20:00.000Z', isService: true },
  { id: '1106875', title: 'Conditional Access: No Way Home', speakers: ['Francesco Facco'], room: 'Mozart', startTime: '2026-04-17T14:10:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  // 16:20
  { id: '1118811', title: 'Journey to Cloud Magis S.p.A.', speakers: ['Paolo Zen', 'Simone Astolfi'], room: 'Verdi', startTime: '2026-04-17T14:20:00.000Z', endTime: '2026-04-17T15:00:00.000Z', isService: false },
  // 17:00 — sessioni parallele
  { id: '1114754', title: 'From Cloud to Edge: delivering GPU Workstations with Azure Virtual Desktop on Azure Local', speakers: ['Samuele Provvedi', 'Enea Maestrelli'], room: 'Palladio 1', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1120583', title: 'Infrastructure as Code su Azure: facciamo chiarezza', speakers: ['Fabio Cannas'], room: 'Palladio 2', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1118224', title: 'Agentic Cloud Ops: come Azure Copilot trasforma la gestione del cloud', speakers: ['Giulio Sciarappa'], room: 'Trissino', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1092003', title: 'AI Readiness nelle PMI: la tua azienda è davvero pronta?', speakers: ['Patrick Savio'], room: 'Verdi', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
  { id: '1105471', title: 'Applicazioni più intelligenti con Power Platform e AI', speakers: ['Stefano Bisca'], room: 'Mozart', startTime: '2026-04-17T15:00:00.000Z', endTime: '2026-04-17T15:50:00.000Z', isService: false },
];

// Pre-computed numeric timestamps to avoid repeated Date allocations on reactive calls
const SESSION_TIMES = SESSIONS.map(s => ({
  session: s,
  startMs: new Date(s.startTime).getTime(),
  endMs:   new Date(s.endTime).getTime(),
}));

/**
 * Returns non-service sessions that overlap with slotStartTime.
 * Condition: session.startTime <= slotStartTime < session.endTime
 */
export function getTalksAtTime(slotStartTime: string): TalkSession[] {
  const t = new Date(slotStartTime).getTime();
  if (isNaN(t)) return [];
  return SESSION_TIMES
    .filter(({ session, startMs, endMs }) => !session.isService && startMs <= t && t < endMs)
    .map(({ session }) => session);
}
