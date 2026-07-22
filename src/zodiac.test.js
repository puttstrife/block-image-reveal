import { describe, expect, it } from 'vitest';
import {
    formatBirthdate,
    getInitialRevealPhase,
    getRevealPhaseAtElapsed,
    getTodayInputValue,
    getZodiacSign,
    validateRevealForm
} from './zodiac';

describe('getZodiacSign', () => {
    it.each([
        ['1992-03-21', 'Aries'],
        ['1992-04-19', 'Aries'],
        ['1992-04-20', 'Taurus'],
        ['1992-06-20', 'Gemini'],
        ['1992-06-21', 'Cancer'],
        ['1992-12-22', 'Capricorn'],
        ['1993-01-19', 'Capricorn'],
        ['1993-01-20', 'Aquarius'],
        ['2000-02-29', 'Pisces']
    ])('maps %s to %s', (birthdate, sign) => {
        expect(getZodiacSign(birthdate).name).toBe(sign);
    });

    it('is year-independent', () => {
        expect(getZodiacSign('1980-05-06').name).toBe(getZodiacSign('2020-05-06').name);
    });
});

describe('date display and validation', () => {
    it('formats the requested display text without timezone drift', () => {
        expect(formatBirthdate('1992-05-06')).toBe('Born May 6, 1992');
    });

    it('rejects blank fields, invalid dates, and future dates', () => {
        expect(validateRevealForm('  ', '', new Date(2026, 6, 22)).errors).toEqual({
            name: 'Enter your name.',
            birthdate: 'Enter your birthdate.'
        });
        expect(validateRevealForm('Frans', '2025-02-29', new Date(2026, 6, 22)).errors.birthdate)
            .toBe('Enter a valid birthdate.');
        expect(validateRevealForm('Frans', '2026-07-23', new Date(2026, 6, 22)).errors.birthdate)
            .toBe('Birthdate cannot be in the future.');
    });

    it('trims a valid name and accepts today', () => {
        const result = validateRevealForm('  Frans Rey Nolasco  ', '2026-07-22', new Date(2026, 6, 22));
        expect(result).toEqual({ errors: {}, isValid: true, trimmedName: 'Frans Rey Nolasco' });
        expect(getTodayInputValue(new Date(2026, 6, 22))).toBe('2026-07-22');
    });
});

describe('reveal phase timing', () => {
    it.each([
        [0, 1],
        [2499, 1],
        [2500, 2],
        [4999, 2],
        [5000, 3],
        [7999, 3],
        [8000, 4],
        [11999, 4],
        [12000, 5],
        [60000, 5]
    ])('returns phase %s at %sms', (elapsed, phase) => {
        expect(getRevealPhaseAtElapsed(elapsed)).toBe(phase);
    });

    it('starts directly on the final portrait for reduced motion', () => {
        expect(getInitialRevealPhase(true)).toBe(5);
        expect(getInitialRevealPhase(false)).toBe(1);
    });
});
