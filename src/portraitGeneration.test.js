import { describe, expect, it, vi } from 'vitest';
import { buildGenerationPayload, requestGeneratedPortrait } from './portraitGeneration';

describe('portrait generation client', () => {
    it('maps the form preference to the existing API contract', () => {
        expect(buildGenerationPayload({
            name: 'Avery',
            birthdate: '1992-05-06',
            soulmatePreference: 'woman'
        })).toEqual({
            name: 'Avery',
            birthdate: '1992-05-06',
            interestedGender: 'female',
            vibe: 'dreamy'
        });
    });

    it('does not send the email address to the generation endpoint', () => {
        expect(buildGenerationPayload({
            name: 'Avery',
            birthdate: '1992-05-06',
            soulmatePreference: 'anyone',
            email: 'avery@example.com'
        })).not.toHaveProperty('email');
    });

    it('returns the generated portrait URL', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ portraitUrl: 'data:image/jpeg;base64,ZmFrZQ==' })
        });

        await expect(requestGeneratedPortrait(
            { name: 'Avery', birthdate: '1992-05-06', soulmatePreference: 'man' },
            { fetchImpl, endpoint: '/test-generate' }
        )).resolves.toBe('data:image/jpeg;base64,ZmFrZQ==');

        expect(fetchImpl).toHaveBeenCalledWith('/test-generate', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }));
    });

    it('rejects unsuccessful and malformed responses', async () => {
        const failedFetch = vi.fn().mockResolvedValue({ ok: false, status: 502 });
        const malformedFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ portraitUrl: 'javascript:alert(1)' })
        });

        await expect(requestGeneratedPortrait({}, { fetchImpl: failedFetch })).rejects.toThrow('status 502');
        await expect(requestGeneratedPortrait({}, { fetchImpl: malformedFetch })).rejects.toThrow('no usable image');
    });
});
