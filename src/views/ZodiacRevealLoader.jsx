import { useEffect, useMemo, useRef, useState } from 'react';
import {
    formatBirthdate,
    getInitialRevealPhase,
    getTodayInputValue,
    getZodiacSign,
    REVEAL_TIMINGS,
    validateRevealForm,
    ZODIAC_SIGNS
} from '../zodiac';
import { preloadPortrait, requestGeneratedPortrait } from '../portraitGeneration';
import './ZodiacRevealLoader.css';

const tileRevealOrder = [0, 6, 2, 4, 8, 1, 5, 3, 7];
const tileBlurLevels = [8, 14, 10, 16, 28, 18, 9, 15, 11];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const currentYear = Number(getTodayInputValue().slice(0, 4));
const birthYears = Array.from({ length: currentYear - 1919 }, (_, index) => currentYear - index);
const soulmateOptions = [
    { value: 'man', label: 'A Man' },
    { value: 'woman', label: 'A Woman' },
    { value: 'anyone', label: 'Anyone' }
];

const phaseLabels = {
    1: 'The stars are weaving your destined portrait',
    2: 'Inscribing your name among the stars',
    3: 'Unveiling your celestial alignment',
    4: 'Your destined portrait awaits'
};

const ZodiacRevealLoader = () => {
    const [name, setName] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [soulmatePreference, setSoulmatePreference] = useState('');
    const [email, setEmail] = useState('');
    const [submittedData, setSubmittedData] = useState();
    const [errors, setErrors] = useState({});
    const [phase, setPhase] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const timers = useRef([]);
    const generationAbort = useRef();

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = event => setReducedMotion(event.matches);
        setReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', updatePreference);

        return () => mediaQuery.removeEventListener('change', updatePreference);
    }, []);

    useEffect(() => () => {
        timers.current.forEach(window.clearTimeout);
        generationAbort.current?.abort();
    }, []);

    const birthdate = birthMonth && birthDay && birthYear
        ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
        : '';

    const daysInSelectedMonth = birthMonth
        ? new Date(Number(birthYear) || 2000, Number(birthMonth), 0).getDate()
        : 31;

    useEffect(() => {
        if (Number(birthDay) > daysInSelectedMonth) {
            setBirthDay('');
        }
    }, [birthDay, daysInSelectedMonth]);

    const sunSign = useMemo(
        () => submittedData ? getZodiacSign(submittedData.birthdate) : undefined,
        [submittedData]
    );

    const beginReveal = async event => {
        event.preventDefault();
        const validation = validateRevealForm(name, birthdate);
        const nextErrors = { ...validation.errors };

        if (!soulmatePreference) {
            nextErrors.soulmatePreference = 'Choose who you would like us to draw.';
        }

        if (!email.trim()) {
            nextErrors.email = 'Enter your email address.';
        } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            nextErrors.email = 'Enter a valid email address.';
        }

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        timers.current.forEach(window.clearTimeout);
        generationAbort.current?.abort();
        generationAbort.current = new AbortController();
        const revealData = { name: validation.trimmedName, birthdate, portraitUrl: '' };
        setSubmittedData(revealData);
        setPhase(1);

        const generationInput = {
            name: validation.trimmedName,
            birthdate,
            soulmatePreference
        };
        const minimumFirstFrame = new Promise(resolve => window.setTimeout(resolve, REVEAL_TIMINGS.identity));

        const generateWithRetry = async () => {
            try {
                return await requestGeneratedPortrait(generationInput, { signal: generationAbort.current.signal });
            } catch (error) {
                if (generationAbort.current.signal.aborted) {
                    throw error;
                }
                return requestGeneratedPortrait(generationInput, { signal: generationAbort.current.signal });
            }
        };

        try {
            const [generatedPortraitUrl] = await Promise.all([generateWithRetry(), minimumFirstFrame]);
            await preloadPortrait(generatedPortraitUrl);
            const completedData = { ...revealData, portraitUrl: generatedPortraitUrl };
            setSubmittedData(completedData);

            const initialPhase = getInitialRevealPhase(reducedMotion);
            if (initialPhase === 4) {
                setPhase(4);
                return;
            }

            setPhase(2);
            timers.current = [
                window.setTimeout(() => setPhase(3), REVEAL_TIMINGS.zodiac - REVEAL_TIMINGS.identity),
                window.setTimeout(() => setPhase(4), REVEAL_TIMINGS.portrait - REVEAL_TIMINGS.identity)
            ];
        } catch (error) {
            if (generationAbort.current.signal.aborted) {
                return;
            }
            setSubmittedData(undefined);
            setPhase(0);
            setErrors({
                ...nextErrors,
                generation: 'The portrait could not be generated. Please try again.'
            });
        }
    };

    if (!submittedData) {
        return (
            <main className='reveal-shell reveal-shell--form'>
                <section className='identity-card' aria-labelledby='identity-title'>
                    <p className='identity-card__eyebrow'>Astrolover Sketch</p>
                    <h1 id='identity-title'>See Your Soulmate's Face</h1>
                    <p className='identity-card__intro'>Enter your details and we'll decode your chart.</p>
                    <form className='identity-form' onSubmit={beginReveal} noValidate>
                        <div className='form-field'>
                            <label htmlFor='reveal-name'>First name</label>
                            <input
                                id='reveal-name'
                                name='name'
                                type='text'
                                value={name}
                                maxLength='80'
                                autoComplete='given-name'
                                required
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'reveal-name-error' : undefined}
                                onChange={event => setName(event.target.value)}
                                placeholder='Your first name'
                            />
                            {errors.name && <p className='form-error' id='reveal-name-error'>{errors.name}</p>}
                        </div>

                        <fieldset className='form-field'>
                            <legend>Date of birth</legend>
                            <div className='birthdate-fields'>
                                <label className='sr-only' htmlFor='reveal-month'>Birth month</label>
                                <select id='reveal-month' value={birthMonth} onChange={event => setBirthMonth(event.target.value)} required aria-invalid={Boolean(errors.birthdate)} aria-describedby={errors.birthdate ? 'reveal-birthdate-error' : undefined}>
                                    <option value=''>Month</option>
                                    {MONTHS.map((month, index) => <option value={String(index + 1)} key={month}>{month}</option>)}
                                </select>
                                <label className='sr-only' htmlFor='reveal-day'>Birth day</label>
                                <select id='reveal-day' value={birthDay} onChange={event => setBirthDay(event.target.value)} required aria-invalid={Boolean(errors.birthdate)} aria-describedby={errors.birthdate ? 'reveal-birthdate-error' : undefined}>
                                    <option value=''>Day</option>
                                    {Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1).map(day => <option value={String(day)} key={day}>{day}</option>)}
                                </select>
                                <label className='sr-only' htmlFor='reveal-year'>Birth year</label>
                                <select id='reveal-year' value={birthYear} onChange={event => setBirthYear(event.target.value)} required aria-invalid={Boolean(errors.birthdate)} aria-describedby={errors.birthdate ? 'reveal-birthdate-error' : undefined}>
                                    <option value=''>Year</option>
                                    {birthYears.map(year => <option value={String(year)} key={year}>{year}</option>)}
                                </select>
                            </div>
                            {errors.birthdate && <p className='form-error' id='reveal-birthdate-error'>{errors.birthdate}</p>}
                        </fieldset>

                        <fieldset className='form-field'>
                            <legend>Draw my soulmate as...</legend>
                            <div className='soulmate-options'>
                                {soulmateOptions.map(option => (
                                    <label className='soulmate-option' key={option.value}>
                                        <input
                                            type='radio'
                                            name='soulmate-preference'
                                            value={option.value}
                                            checked={soulmatePreference === option.value}
                                            required
                                            onChange={event => setSoulmatePreference(event.target.value)}
                                        />
                                        <span>{option.label}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.soulmatePreference && <p className='form-error'>{errors.soulmatePreference}</p>}
                        </fieldset>

                        <div className='form-field'>
                            <label htmlFor='reveal-email'>Email address</label>
                            <input
                                id='reveal-email'
                                name='email'
                                type='email'
                                value={email}
                                autoComplete='email'
                                required
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={`${errors.email ? 'reveal-email-error ' : ''}reveal-email-note`}
                                onChange={event => setEmail(event.target.value)}
                                placeholder='you@example.com'
                            />
                            {errors.email && <p className='form-error' id='reveal-email-error'>{errors.email}</p>}
                            <p className='form-field__hint' id='reveal-email-note'>Your sketch will be sent here within 24 hours. No spam.</p>
                        </div>

                        <button className='identity-form__submit' type='submit'>Get My Sketch <span aria-hidden='true'>→</span></button>
                        {errors.generation && <p className='form-error form-error--generation' role='alert'>{errors.generation}</p>}
                        <p className='identity-form__note'>Takes less than 1 minute.</p>
                    </form>
                </section>
            </main>
        );
    }

    return (
        <main className={`reveal-shell phase-${phase} ${reducedMotion ? 'reduced-motion' : ''}`}>
            <p className='sr-only' role='status' aria-live='polite'>{phaseLabels[phase]}</p>
            <section className='reveal-stage' data-phase={phase} aria-label='Animated zodiac portrait reveal' aria-busy={phase === 1 && !submittedData.portraitUrl}>
                <div className='paper-glow' aria-hidden='true' />
                {phase === 1 && !submittedData.portraitUrl && (
                    <p className='generation-status'>Weaving your celestial portrait…</p>
                )}
                <svg className='chart-geometry' viewBox='0 0 1000 850' aria-hidden='true'>
                    <defs>
                        <filter id='paper-noise'>
                            <feTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='3' stitchTiles='stitch' />
                        </filter>
                        <mask id='zodiac-corners'>
                            <rect width='1000' height='850' fill='white' />
                            <path d='M500 78 L850 425 L500 772 L150 425 Z' fill='black' />
                        </mask>
                    </defs>
                    <rect className='paper-noise' width='1000' height='850' />
                    <rect className='chart-line chart-line--frame' x='55' y='48' width='890' height='754' />
                    <path className='chart-line chart-line--diamond' d='M500 78 L850 425 L500 772 L150 425 Z' />
                    <circle className='chart-line chart-line--circle' cx='500' cy='425' r='188' />
                    <path className='chart-line chart-line--axis' d='M55 425 H945 M500 48 V802 M250 175 L750 675 M750 175 L250 675' />
                    <g className='zodiac-ring' mask='url(#zodiac-corners)'>
                        <circle className='zodiac-orbit zodiac-orbit--outer' cx='500' cy='425' r='337' />
                        <circle className='zodiac-orbit zodiac-orbit--middle' cx='500' cy='425' r='315' />
                        <circle className='zodiac-orbit zodiac-orbit--inner' cx='500' cy='425' r='292' />
                        {ZODIAC_SIGNS.map((sign, index) => {
                            const angle = index * 30 - 90;
                            const radians = angle * Math.PI / 180;
                            const x1 = 500 + Math.cos(radians) * 292;
                            const y1 = 425 + Math.sin(radians) * 292;
                            const x2 = 500 + Math.cos(radians) * 337;
                            const y2 = 425 + Math.sin(radians) * 337;
                            return <line className='zodiac-tick' key={sign.name} x1={x1} y1={y1} x2={x2} y2={y2} />;
                        })}
                    </g>
                </svg>

                <div className='identity-inscription' aria-hidden={phase >= 3}>
                    <p className='inscribed-name'>{submittedData.name}</p>
                    <p className='inscribed-date'>{formatBirthdate(submittedData.birthdate)}</p>
                </div>

                <div className='zodiac-labels' aria-label={`Sun sign: ${sunSign.name}`}>
                    {ZODIAC_SIGNS.map((sign, index) => {
                        const angle = index * 30 - 90;
                        const radians = angle * Math.PI / 180;
                        const labelRotations = [0, 30, 60, -90, -60, -30, 0, 30, 60, -90, -60, -30];
                        const position = {
                            '--sign-x': `${50 + Math.cos(radians) * 35.7}%`,
                            '--sign-y': `${50 + Math.sin(radians) * 39.5}%`,
                            '--sign-delay': `${index * 70}ms`,
                            '--sign-rotation': `${labelRotations[index]}deg`
                        };
                        return (
                            <span
                                className={`zodiac-name ${sign.name === sunSign.name ? 'zodiac-name--active' : ''}`}
                                key={sign.name}
                                style={position}
                                aria-current={sign.name === sunSign.name ? 'true' : undefined}
                            >
                                {sign.name}
                            </span>
                        );
                    })}
                    <div className='zodiac-house-notes' aria-hidden='true'>
                        <span className='house-note house-note--northwest'>Tenth House</span>
                        <span className='house-note house-note--northeast'>First House</span>
                        <span className='house-note house-note--southwest'>Seventh House</span>
                        <span className='house-note house-note--southeast'>Fourth House</span>
                    </div>
                    <p className='sun-sign-label'>{sunSign.name} · Sun sign</p>
                </div>

                <div
                    className='portrait-grid'
                    aria-label={`Frosted portrait of ${submittedData.name}`}
                >
                    {submittedData.portraitUrl && (
                        <img className='portrait-grid__image' src={submittedData.portraitUrl} alt='' aria-hidden='true' />
                    )}
                    {Array.from({ length: 9 }, (_, index) => {
                        const revealIndex = tileRevealOrder.indexOf(index);
                        const tileStyle = {
                            '--tile-delay': `${revealIndex * 180}ms`,
                            '--tile-blur': `${tileBlurLevels[index]}px`,
                            '--frost-opacity': 0.24 + (tileBlurLevels[index] / 100)
                        };
                        return (
                            <span className='portrait-tile' key={index} style={tileStyle} aria-hidden='true' />
                        );
                    })}
                </div>
            </section>
        </main>
    );
};

export default ZodiacRevealLoader;
