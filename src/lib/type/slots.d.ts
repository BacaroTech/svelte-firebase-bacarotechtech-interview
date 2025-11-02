// 1. Definizione dei tipi per chiarezza
export interface SpeakerDetails {
    uid: string;
    name: string;
}

export interface InterviewSlot {
    docId: string;
    id: string;
    eventId: string;
    startTime: string; // ISO String per i Timestamp
    endTime: string;   // ISO String per i Timestamp
    status: 'AVAILABLE' | 'BOOKED' | 'CANCELED';
    speakerUid: string | null;
    speakerName: string | null;
    bookedAt: string | null;
}

export interface UserState {
    loggedin: boolean;
    email?: string;
}