import { useEffect, useMemo, useRef, useState } from 'react';
import {
    getInitialRevealPhase,
    getTodayInputValue,
    getZodiacSign,
    REVEAL_STAGE_DURATIONS,
    validateRevealForm,
    ZODIAC_SIGNS
} from '../zodiac';
import { preloadPortrait, requestGeneratedPortrait } from '../portraitGeneration';
import './ZodiacRevealLoader.css';

const tileRevealOrder = [0, 6, 2, 4, 8, 1, 5, 3, 7];
const tileBlurLevels = [6, 18, 10, 26, 44, 32, 13, 38, 22];
const tileFrostLevels = [0.5, 0.54, 0.51, 0.58, 0.7, 0.61, 0.52, 0.64, 0.56];
const previewUnlockedTiles = new Set([0, 5, 6]);
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
    1: 'Preparing your celestial portrait…',
    2: 'Reading your zodiac alignment…',
    3: 'Mapping the planets at your birth…',
    4: 'Finding your strongest romantic connection…',
    5: 'Interpreting your soulmate’s energy…',
    6: 'Your destined portrait is ready to unlock',
    7: 'Your soulmate portrait is revealed'
};

const ZODIAC_SYMBOLS = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'];
const PLANET_NODES = [
    { symbol: '☉', x: 50, y: 28 },
    { symbol: '☽', x: 68, y: 38 },
    { symbol: '♀', x: 64, y: 63 },
    { symbol: '♂', x: 38, y: 68 },
    { symbol: '♃', x: 30, y: 43 }
];

const ZodiacWheelLayers = () => (
    <div className='celestial-wheels' aria-hidden='true'>
        <span className='celestial-wheel celestial-wheel--outer'>
            <img className='celestial-wheel__art' src='/images/celestial-wheels/outer.png' alt='' />
        </span>
        <span className='celestial-wheel celestial-wheel--middle'>
            <img className='celestial-wheel__art' src='/images/celestial-wheels/middle.png' alt='' />
        </span>
        <span className='celestial-wheel celestial-wheel--center'>
            <img className='celestial-wheel__art' src='/images/celestial-wheels/center.png' alt='' />
        </span>
    </div>
);

const PlanetConnections = () => (
    <div className='planet-map' aria-hidden='true'>
        <svg className='planet-map__lines' viewBox='0 0 100 100'>
            <path d='M50 28 L68 38 L64 63 L38 68 L30 43 Z' />
            <path d='M50 28 L64 63 M68 38 L38 68' />
        </svg>
        {PLANET_NODES.map((planet, index) => (
            <span
                className='planet-node'
                key={`${planet.symbol}-${index}`}
                style={{ '--planet-x': `${planet.x}%`, '--planet-y': `${planet.y}%`, '--planet-delay': `${index * 640}ms` }}
            >
                {planet.symbol}
            </span>
        ))}
    </div>
);

const RomanticAlignment = ({ sunSign }) => {
    const signIndex = Math.max(0, ZODIAC_SIGNS.findIndex(sign => sign.name === sunSign?.name));
    const oppositeIndex = (signIndex + 6) % ZODIAC_SIGNS.length;

    return (
        <div className='romantic-alignment' aria-hidden='true'>
            <svg viewBox='0 0 100 100'>
                <circle className='romantic-alignment__pulse' cx='50' cy='50' r='3.4' />
                <path className='romantic-alignment__line' d='M27 50 H73' />
            </svg>
            <span className='romantic-symbol romantic-symbol--left'>{ZODIAC_SYMBOLS[signIndex]}</span>
            <span className='romantic-symbol romantic-symbol--right'>{ZODIAC_SYMBOLS[oppositeIndex]}</span>
        </div>
    );
};

const EnergyPattern = () => (
    <div className='energy-reading' aria-hidden='true'>
        <svg className='energy-pattern' viewBox='0 0 100 100'>
            <circle className='energy-pattern__ring' cx='50' cy='50' r='24' />
            <path d='M35 55 C39 35 61 35 65 55' />
            <path d='M39 60 C42 44 58 44 61 60' />
            <path d='M43 63 C45 52 55 52 57 63' />
            <path d='M34 48 C42 29 64 34 68 51' />
            <path d='M46 66 C47 59 53 59 54 66' />
            <circle className='energy-pattern__core' cx='50' cy='50' r='4' />
        </svg>
        <div className='moon-phases'>
            {Array.from({ length: 8 }, (_, index) => <span className={`moon-phase moon-phase--${index + 1}`} key={index} />)}
        </div>
        <span className='element-mark element-mark--fire'>△ Fire</span>
        <span className='element-mark element-mark--earth'>▽ Earth</span>
        <span className='element-mark element-mark--air'>△ Air</span>
        <span className='element-mark element-mark--water'>▽ Water</span>
    </div>
);

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
    const [hasUnlockedPreview, setHasUnlockedPreview] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);
    const timers = useRef([]);
    const generationAbort = useRef();
    const revealRun = useRef(0);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = event => setReducedMotion(event.matches);
        setReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', updatePreference);

        return () => mediaQuery.removeEventListener('change', updatePreference);
    }, []);

    useEffect(() => () => {
        revealRun.current += 1;
        timers.current.forEach(window.clearTimeout);
        generationAbort.current?.abort();
    }, []);

    useEffect(() => {
        const updateVisibility = () => setIsDocumentVisible(document.visibilityState !== 'hidden');
        updateVisibility();
        document.addEventListener('visibilitychange', updateVisibility);
        return () => document.removeEventListener('visibilitychange', updateVisibility);
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
        timers.current = [];
        generationAbort.current?.abort();
        const controller = new AbortController();
        generationAbort.current = controller;
        const runId = revealRun.current + 1;
        revealRun.current = runId;
        const revealData = { name: validation.trimmedName, birthdate, portraitUrl: '' };
        setSubmittedData(revealData);
        setHasUnlockedPreview(false);
        setPhase(1);

        const generationInput = {
            name: validation.trimmedName,
            birthdate,
            soulmatePreference
        };

        const generationState = { status: 'pending' };
        const generationTask = (async () => {
            try {
                const generatedPortraitUrl = await requestGeneratedPortrait(
                    generationInput,
                    { signal: controller.signal }
                );
                await preloadPortrait(generatedPortraitUrl);
                if (revealRun.current !== runId) return;
                generationState.status = 'ready';
                setSubmittedData({ ...revealData, portraitUrl: generatedPortraitUrl });
            } catch {
                if (controller.signal.aborted || revealRun.current !== runId) return;
                generationState.status = 'error';
            }
        })();

        if (getInitialRevealPhase(reducedMotion) === 6) {
            await generationTask;
            if (generationState.status === 'ready' && revealRun.current === runId) {
                setPhase(6);
            } else if (generationState.status === 'error') {
                setSubmittedData(undefined);
                setPhase(0);
                setErrors({ ...nextErrors, generation: 'The portrait could not be generated. Please try again.' });
            }
            return;
        }

        const waitForStage = duration => new Promise(resolve => {
            const timer = window.setTimeout(resolve, duration);
            timers.current.push(timer);
        });
        const allStages = REVEAL_STAGE_DURATIONS.map((duration, index) => ({ phase: index + 1, duration }));
        let stages = allStages;
        let hasCompletedInitialSequence = false;

        while (revealRun.current === runId) {
            for (const stage of stages) {
                setPhase(stage.phase);
                await waitForStage(stage.duration);
                if (revealRun.current !== runId) return;

                if (generationState.status === 'error') {
                    revealRun.current += 1;
                    setSubmittedData(undefined);
                    setPhase(0);
                    setErrors({ ...nextErrors, generation: 'The portrait could not be generated. Please try again.' });
                    return;
                }

                if (hasCompletedInitialSequence && generationState.status === 'ready') {
                    setPhase(6);
                    return;
                }
            }

            hasCompletedInitialSequence = true;
            if (generationState.status === 'ready') {
                setPhase(6);
                return;
            }

            // Stage 1 is an entrance; longer generations loop the celestial reading stages.
            stages = allStages.slice(1);
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
        <main className={`reveal-shell phase-${phase} ${reducedMotion ? 'reduced-motion' : ''} ${isDocumentVisible ? '' : 'animations-paused'}`}>
            <p className='sr-only' role='status' aria-live='polite'>{phaseLabels[phase]}</p>
            <section className='reveal-stage' data-phase={phase} aria-label='Animated zodiac portrait reveal' aria-busy={phase <= 5}>
                <div className='paper-glow' aria-hidden='true' />
                {phase <= 5 && (
                    <p
                        className='generation-status'
                        key={phase}
                        style={{ '--copy-duration': `${REVEAL_STAGE_DURATIONS[phase - 1]}ms` }}
                    >
                        {phaseLabels[phase]}
                    </p>
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
                    <path className='chart-line chart-line--axis' d='M55 425 H945 M500 48 V802' />
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

                <ZodiacWheelLayers />
                <PlanetConnections />
                <RomanticAlignment sunSign={sunSign} />
                <EnergyPattern />

                <div
                    className='portrait-grid'
                    aria-label={`${phase === 7 ? 'Revealed' : 'Frosted'} portrait of ${submittedData.name}`}
                >
                    {submittedData.portraitUrl && (
                        <img className='portrait-grid__image' src={submittedData.portraitUrl} alt='' aria-hidden='true' />
                    )}
                    {Array.from({ length: 9 }, (_, index) => {
                        const revealIndex = tileRevealOrder.indexOf(index);
                        const tileStyle = {
                            '--tile-delay': `${revealIndex * 180}ms`,
                            '--tile-blur': `${tileBlurLevels[index]}px`,
                            '--frost-opacity': tileFrostLevels[index],
                            '--tile-column': index % 3,
                            '--tile-row': Math.floor(index / 3)
                        };
                        return (
                            <span
                                className={`portrait-tile ${hasUnlockedPreview && previewUnlockedTiles.has(index) ? 'portrait-tile--preview-unlocked' : ''}`}
                                key={index}
                                style={tileStyle}
                                aria-hidden='true'
                            >
                                {submittedData.portraitUrl && (
                                    <img className='portrait-tile__image' src={submittedData.portraitUrl} alt='' />
                                )}
                            </span>
                        );
                    })}
                </div>
                {phase === 6 && (
                    <button
                        className='unlock-reveal'
                        type='button'
                        onClick={() => {
                            if (hasUnlockedPreview) {
                                setPhase(7);
                                return;
                            }
                            setHasUnlockedPreview(true);
                        }}
                    >
                        <svg className='unlock-reveal__icon' viewBox='0 0 48 48' aria-hidden='true'>
                            <path d='M14 21v-5a10 10 0 0 1 19-4' />
                            <rect x='9' y='21' width='30' height='22' rx='6' />
                            <circle cx='24' cy='32' r='4' />
                        </svg>
                        <span>{hasUnlockedPreview ? 'Unlock All Blocks' : 'Unlock 3 Blocks'}</span>
                    </button>
                )}
            </section>
        </main>
    );
};

export default ZodiacRevealLoader;
