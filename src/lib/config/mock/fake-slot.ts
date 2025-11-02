// --- DATI DI ESEMPIO --- 
// InterviewSlot

let mockSlots: any[] = [
  {
    docId: 'doc1', id: '1', eventId: 'evt1',
    startTime: '2025-10-10T09:00:00.000Z',
    endTime: '2025-10-10T10:30:00.000Z', // 90 min
    status: 'BOOKED', speakerName: 'John Doe', speakerUid: 'uid1', bookedAt: '...',
  },
  {
    docId: 'doc2', id: '2', eventId: 'evt1',
    startTime: '2025-10-10T13:00:00.000Z',
    endTime: '2025-10-10T14:00:00.000Z', // 60 min
    status: 'AVAILABLE', speakerName: null, speakerUid: null, bookedAt: null,
  },
  {
    docId: 'doc3', id: '3', eventId: 'evt1',
    startTime: '2025-10-10T11:00:00.000Z',
    endTime: '2025-10-10T11:15:00.000Z', // 15 min - Questo risulterà piccolo
    status: 'CANCELED', speakerName: 'Old Booking', speakerUid: 'uid2', bookedAt: null,
  },
  {
    docId: 'doc4', id: '4', eventId: 'evt1',
    startTime: '2025-10-10T15:30:00.000Z',
    endTime: '2025-10-10T16:30:00.000Z', // 60 min
    status: 'BOOKED', speakerName: 'Jane Smith', speakerUid: 'uid3', bookedAt: '...',
  },
  {
    docId: 'doc5', id: '5', eventId: 'evt1',
    startTime: '2025-10-10T10:30:00.000Z',
    endTime: '2025-10-10T10:45:00.000Z', // 15 min - Altro evento breve
    status: 'AVAILABLE', speakerName: null, speakerUid: null, bookedAt: null,
  },
  {
    docId: 'doc6', id: '6', eventId: 'evt1',
    startTime: '2025-10-10T14:45:00.000Z',
    endTime: '2025-10-10T15:00:00.000Z', // 15 min - Evento al limite
    status: 'BOOKED', speakerName: 'Quick Call', speakerUid: 'uid4', bookedAt: '...',
  },
];

export const fakeSlotFree = [
  {
    "time": "9:45",
    "name": "free"
  },
  {
    "time": "10:00",
    "name": "free"
  },
  {
    "time": "10:15",
    "name": "free"
  },
  {
    "time": "10:30",
    "name": "free"
  },
  {
    "time": "10:45",
    "name": "free"
  },
  {
    "time": "11:00",
    "name": "free"
  },
  {
    "time": "11:15",
    "name": "free"
  },
  {
    "time": "11:30",
    "name": "free"
  },
  {
    "time": "11:45",
    "name": "free"
  },
  {
    "time": "12:00",
    "name": "free"
  },
  {
    "time": "12:15",
    "name": "free"
  },
  {
    "time": "12:30",
    "name": "free"
  },
  {
    "time": "14:25",
    "name": "free"
  },
  {
    "time": "14:40",
    "name": "free"
  },
  {
    "time": "14:55",
    "name": "free"
  },
  {
    "time": "15:10",
    "name": "free"
  },
  {
    "time": "15:25",
    "name": "free"
  },
  {
    "time": "16:10",
    "name": "free"
  },
  {
    "time": "16:25",
    "name": "free"
  },
  {
    "time": "16:40",
    "name": "free"
  },
  {
    "time": "16:55",
    "name": "free"
  },
  {
    "time": "17:10",
    "name": "free"
  },
  {
    "time": "17:25",
    "name": "free"
  }
]

export const fakeSlotBooked = [
  {
    "time": "9:45",
    "name": "Natalie Godec"
  },
  {
    "time": "10:00",
    "name": "Istvan Juhos"
  },
  {
    "time": "10:15",
    "name": "Matteo Valerio"
  },
  {
    "time": "10:30",
    "name": "Piero Dotti"
  },
  {
    "time": "10:45",
    "name": "Julien Salvi"
  },
  {
    "time": "11:00",
    "name": "Emanuele Maso"
  },
  {
    "time": "11:15",
    "name": "Vadym Pinchuk"
  },
  {
    "time": "11:30",
    "name": "Luca Raveri"
  },
  {
    "time": "11:45",
    "name": "Giorgio Galassi"
  },
  {
    "time": "12:00",
    "name": "Mattia Cintura"
  },
  {
    "time": "12:15",
    "name": "Fabrizio Mele"
  },
  {
    "time": "12:30",
    "name": "Kamal Shree"
  },
  {
    "time": "14:25",
    "name": "Jad Joubran"
  },
  {
    "time": "14:40",
    "name": "Andrea Della Porta"
  },
  {
    "time": "14:55",
    "name": "Maurizio Ipsale"
  },
  {
    "time": "15:10",
    "name": "Henry Lim"
  },
  {
    "time": "15:25",
    "name": "Matthias Geisler"
  },
  {
    "time": "16:10",
    "name": "Davide Passafaro"
  },
  {
    "time": "16:25",
    "name": "Alessandro Pezzato"
  },
  {
    "time": "16:40",
    "name": "Riccardo Carretta"
  },
  {
    "time": "16:55",
    "name": "Andrea Manzini"
  },
  {
    "time": "17:10",
    "name": "Luca del Puppo"
  },
  {
    "time": "17:25",
    "name": "Giovanna Galleno Malaga"
  }
]

const slotBookedConfig = [

]

export const speakers = [

  {
    "name": "free"
  },
  {
    "name": "Istvan Juhos"
  },
  {
    "name": "Matteo Valerio"
  },
  {
    "name": "Piero Dotti"
  },
  {
    "name": "Julien Salvi"
  },
  {
    "name": "Emanuele Maso"
  },
  {
    "name": "Vadym Pinchuk"
  },
  {
    "name": "Luca Raveri"
  },
  {
    "name": "Giorgio Galassi"
  },
  {
    "name": "Mattia Cintura"
  },
  {
    "name": "Fabrizio Mele"
  },
  {
    "name": "Natalie Godec"
  },
  {
    "name": "Jad Joubran"
  },
  {
    "name": "Andrea Della Porta"
  },
  {
    "name": "Maurizio Ipsale"
  },
  {
    "name": "Henry Lim"
  },
  {
    "name": "Matthias Geisler"
  },
  {
    "name": "Davide Passafaro"
  },
  {
    "name": "Alessandro Pezzato"
  },
  {
    "name": "Riccardo Carretta"
  },
  {
    "name": "Andrea Manzini"
  },
  {
    "name": "Luca del Puppo"
  },
  {
    "name": "Giovanna Galleno Malaga"
  }
]
