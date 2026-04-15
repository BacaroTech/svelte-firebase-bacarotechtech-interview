export interface SpeakerDetails {
    uid: string;
    name: string;
}

export interface InterviewSlot {
    docId: string;
    id: string;
    eventId: string;
    startTime: string;
    endTime: string;
    status: 'AVAILABLE' | 'BOOKED' | 'DONE' | 'PROBLEMA' | 'ANNULLATO';
    speakerUid: string | null;   // docId Firestore dello speaker prenotato
    speakerName: string | null;
    bookedAt: string | null;
}

export interface Speaker {
    docId: string;
    name: string;
    email: string | null;
    talk: string | null;
    token: string;               // UUID v4 — usato nei link condivisibili
    eventId: string;
    preferredSlots: string[];    // docId degli slot preferiti (pre-dichiarati)
    notes: string;
    status: 'pending' | 'booked';
    activatedAt: string | null;  // ISO string — prima volta che il link è stato usato
}

export interface UserState {
    loggedin: boolean;
    email?: string;
}