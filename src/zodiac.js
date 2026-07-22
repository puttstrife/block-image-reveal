export const REVEAL_TIMINGS = Object.freeze({
    identity: 2500,
    zodiac: 5000,
    portrait: 8000,
    complete: 12000
});

export const ZODIAC_SIGNS = Object.freeze([
    { name: 'Aries', start: [3, 21], end: [4, 19] },
    { name: 'Taurus', start: [4, 20], end: [5, 20] },
    { name: 'Gemini', start: [5, 21], end: [6, 20] },
    { name: 'Cancer', start: [6, 21], end: [7, 22] },
    { name: 'Leo', start: [7, 23], end: [8, 22] },
    { name: 'Virgo', start: [8, 23], end: [9, 22] },
    { name: 'Libra', start: [9, 23], end: [10, 22] },
    { name: 'Scorpio', start: [10, 23], end: [11, 21] },
    { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
    { name: 'Capricorn', start: [12, 22], end: [1, 19] },
    { name: 'Aquarius', start: [1, 20], end: [2, 18] },
    { name: 'Pisces', start: [2, 19], end: [3, 20] }
]);

const parseDateParts = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return undefined;
    }

    return { year, month, day, date };
};

const monthDayValue = (month, day) => month * 100 + day;

export const getZodiacSign = birthdate => {
    const parts = parseDateParts(birthdate);
    if (!parts) {
        return undefined;
    }

    const value = monthDayValue(parts.month, parts.day);
    return ZODIAC_SIGNS.find(sign => {
        const start = monthDayValue(...sign.start);
        const end = monthDayValue(...sign.end);
        return start <= end
            ? value >= start && value <= end
            : value >= start || value <= end;
    });
};

export const formatBirthdate = birthdate => {
    const parts = parseDateParts(birthdate);
    if (!parts) {
        return '';
    }

    const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(parts.date);

    return `Born ${formatted}`;
};

export const validateRevealForm = (name, birthdate, today = new Date()) => {
    const trimmedName = name.trim();
    const errors = {};
    const parts = parseDateParts(birthdate);

    if (!trimmedName) {
        errors.name = 'Enter your name.';
    }

    if (!birthdate) {
        errors.birthdate = 'Enter your birthdate.';
    } else if (!parts) {
        errors.birthdate = 'Enter a valid birthdate.';
    } else {
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        if (parts.date > endOfToday) {
            errors.birthdate = 'Birthdate cannot be in the future.';
        }
    }

    return { errors, isValid: Object.keys(errors).length === 0, trimmedName };
};

export const getRevealPhaseAtElapsed = elapsed => {
    if (elapsed >= REVEAL_TIMINGS.complete) {
        return 5;
    }
    if (elapsed >= REVEAL_TIMINGS.portrait) {
        return 4;
    }
    if (elapsed >= REVEAL_TIMINGS.zodiac) {
        return 3;
    }
    if (elapsed >= REVEAL_TIMINGS.identity) {
        return 2;
    }
    return 1;
};

export const getInitialRevealPhase = reducedMotion => reducedMotion ? 5 : 1;

export const getTodayInputValue = (today = new Date()) => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
