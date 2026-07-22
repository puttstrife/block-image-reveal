const DEFAULT_ENDPOINT = '/api/generate';

const interestedGenderMap = Object.freeze({
    man: 'male',
    woman: 'female',
    anyone: 'surprise'
});

const isSupportedImageUrl = value => {
    if (typeof value !== 'string' || !value) {
        return false;
    }

    if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) {
        return true;
    }

    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
};

export const buildGenerationPayload = ({ name, birthdate, soulmatePreference }) => ({
    name,
    birthdate,
    interestedGender: interestedGenderMap[soulmatePreference] ?? 'surprise',
    vibe: 'dreamy'
});

export const requestGeneratedPortrait = async (
    input,
    { fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT, signal } = {}
) => {
    const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGenerationPayload(input)),
        signal
    });

    if (!response.ok) {
        throw new Error(`Portrait generation failed with status ${response.status}.`);
    }

    const result = await response.json();
    if (!isSupportedImageUrl(result?.portraitUrl)) {
        throw new Error('Portrait generation returned no usable image.');
    }

    return result.portraitUrl;
};

export const preloadPortrait = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => reject(new Error('The generated portrait could not be loaded.'));
    image.src = url;
});
