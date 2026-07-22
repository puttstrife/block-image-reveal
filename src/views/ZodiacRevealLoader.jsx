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
import './ZodiacRevealLoader.css';

const tileRevealOrder = [0, 6, 2, 4, 8, 1, 5, 3, 7];
const portraitUrl = `${import.meta.env.BASE_URL}images/img19.jpg`;

const phaseLabels = {
    1: 'Preparing your celestial chart',
    2: 'Inscribing your identity',
    3: 'Revealing your zodiac',
    4: 'Your portrait is revealed'
};

const ZodiacRevealLoader = () => {
    const [name, setName] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [submittedData, setSubmittedData] = useState();
    const [errors, setErrors] = useState({});
    const [phase, setPhase] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const timers = useRef([]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = event => setReducedMotion(event.matches);
        setReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', updatePreference);

        return () => mediaQuery.removeEventListener('change', updatePreference);
    }, []);

    useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

    const sunSign = useMemo(
        () => submittedData ? getZodiacSign(submittedData.birthdate) : undefined,
        [submittedData]
    );

    const beginReveal = event => {
        event.preventDefault();
        const validation = validateRevealForm(name, birthdate);
        setErrors(validation.errors);

        if (!validation.isValid) {
            return;
        }

        timers.current.forEach(window.clearTimeout);
        setSubmittedData({ name: validation.trimmedName, birthdate });

        const initialPhase = getInitialRevealPhase(reducedMotion);
        setPhase(initialPhase);

        if (initialPhase === 4) {
            return;
        }

        timers.current = [
            window.setTimeout(() => setPhase(2), REVEAL_TIMINGS.identity),
            window.setTimeout(() => setPhase(3), REVEAL_TIMINGS.zodiac),
            window.setTimeout(() => setPhase(4), REVEAL_TIMINGS.portrait)
        ];
    };

    if (!submittedData) {
        return (
            <main className='reveal-shell reveal-shell--form'>
                <section className='identity-card' aria-labelledby='identity-title'>
                    <p className='identity-card__eyebrow'>A celestial portrait</p>
                    <h1 id='identity-title'>Begin your reveal</h1>
                    <p className='identity-card__intro'>Enter the details that will be inscribed into your chart.</p>
                    <form className='identity-form' onSubmit={beginReveal} noValidate>
                        <label htmlFor='reveal-name'>Your name</label>
                        <input
                            id='reveal-name'
                            name='name'
                            type='text'
                            value={name}
                            maxLength='80'
                            autoComplete='name'
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? 'reveal-name-error' : undefined}
                            onChange={event => setName(event.target.value)}
                        />
                        {errors.name && <p className='form-error' id='reveal-name-error'>{errors.name}</p>}

                        <label htmlFor='reveal-birthdate'>Birthdate</label>
                        <input
                            id='reveal-birthdate'
                            name='birthdate'
                            type='date'
                            value={birthdate}
                            max={getTodayInputValue()}
                            aria-invalid={Boolean(errors.birthdate)}
                            aria-describedby={errors.birthdate ? 'reveal-birthdate-error' : undefined}
                            onChange={event => setBirthdate(event.target.value)}
                        />
                        {errors.birthdate && <p className='form-error' id='reveal-birthdate-error'>{errors.birthdate}</p>}

                        <button type='submit'>Reveal my portrait</button>
                    </form>
                </section>
            </main>
        );
    }

    return (
        <main className={`reveal-shell phase-${phase} ${reducedMotion ? 'reduced-motion' : ''}`}>
            <p className='sr-only' role='status' aria-live='polite'>{phaseLabels[phase]}</p>
            <section className='reveal-stage' data-phase={phase} aria-label='Animated zodiac portrait reveal'>
                <div className='paper-glow' aria-hidden='true' />
                <svg className='chart-geometry' viewBox='0 0 1000 850' aria-hidden='true'>
                    <defs>
                        <filter id='paper-noise'>
                            <feTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='3' stitchTiles='stitch' />
                        </filter>
                    </defs>
                    <rect className='paper-noise' width='1000' height='850' />
                    <rect className='chart-line chart-line--frame' x='55' y='48' width='890' height='754' />
                    <path className='chart-line chart-line--diamond' d='M500 78 L850 425 L500 772 L150 425 Z' />
                    <circle className='chart-line chart-line--circle' cx='500' cy='425' r='188' />
                    <path className='chart-line chart-line--axis' d='M55 425 H945 M500 48 V802 M250 175 L750 675 M750 175 L250 675' />
                    <circle className='zodiac-orbit zodiac-orbit--outer' cx='500' cy='425' r='337' />
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
                </svg>

                <div className='identity-inscription' aria-hidden={phase >= 3}>
                    <p className='inscribed-name'>{submittedData.name}</p>
                    <p className='inscribed-date'>{formatBirthdate(submittedData.birthdate)}</p>
                </div>

                <div className='zodiac-symbols' aria-label={`Sun sign: ${sunSign.name}`}>
                    {ZODIAC_SIGNS.map((sign, index) => {
                        const angle = index * 30 - 90;
                        const radians = angle * Math.PI / 180;
                        const position = {
                            '--sign-x': `${50 + Math.cos(radians) * 37}%`,
                            '--sign-y': `${50 + Math.sin(radians) * 41}%`,
                            '--sign-delay': `${index * 70}ms`
                        };
                        return (
                            <span
                                className={`zodiac-symbol ${sign.name === sunSign.name ? 'zodiac-symbol--active' : ''}`}
                                key={sign.name}
                                style={position}
                                title={sign.name}
                            >
                                <span aria-hidden='true'>{sign.symbol}</span>
                                <span className='sr-only'>{sign.name}</span>
                            </span>
                        );
                    })}
                    <p className='sun-sign-label'>{sunSign.symbol} {sunSign.name}</p>
                </div>

                <div
                    className='portrait-grid'
                    aria-label={`Frosted portrait of ${submittedData.name}`}
                    style={{ '--portrait-url': `url("${portraitUrl}")` }}
                >
                    {Array.from({ length: 9 }, (_, index) => {
                        const row = Math.floor(index / 3);
                        const column = index % 3;
                        const revealIndex = tileRevealOrder.indexOf(index);
                        const tileStyle = {
                            '--portrait-x': `${column * 50}%`,
                            '--portrait-y': `${row * 50}%`,
                            '--tile-delay': `${revealIndex * 180}ms`
                        };
                        return (
                            <span className='portrait-tile' key={index} style={tileStyle}>
                                <span className='portrait-tile__image' />
                                <span className='portrait-tile__frost' />
                            </span>
                        );
                    })}
                </div>
            </section>
        </main>
    );
};

export default ZodiacRevealLoader;
