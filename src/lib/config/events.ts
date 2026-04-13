export const VALID_EVENT_IDS = ['azure-vicenza', 'gdg-pisa'] as const;
export type EventId = typeof VALID_EVENT_IDS[number];

export const EVENT_CONFIG: Record<EventId, { name: string; date: string; dayLabel: string }> = {
    'azure-vicenza': {
        name: 'Azure Global Meetup Vicenza',
        date: '2026-04-17',
        dayLabel: 'venerdì 17 aprile'
    },
    'gdg-pisa': {
        name: 'GDG Pisa',
        date: '2026-04-18',
        dayLabel: 'sabato 18 aprile'
    }
};
