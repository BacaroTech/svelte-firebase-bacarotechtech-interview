export const VALID_EVENT_IDS = ['azure-vicenza', 'gdg-pisa', 'beta-test'] as const;
export type EventId = typeof VALID_EVENT_IDS[number];

export const EVENT_CONFIG: Record<EventId, { name: string; date: string; dayLabel: string; showEmailLogin: boolean }> = {
    'azure-vicenza': {
        name: 'Azure Global Meetup Vicenza',
        date: '2026-04-17',
        dayLabel: 'venerdì 17 aprile',
        showEmailLogin: true
    },
    'gdg-pisa': {
        name: 'GDG Pisa',
        date: '2026-04-18',
        dayLabel: 'sabato 18 aprile',
        showEmailLogin: true
    },
    'beta-test': {
        name: 'Bacarotech Beta Test',
        date: '2026-04-15',
        dayLabel: 'beta test',
        showEmailLogin: true
    }
};
