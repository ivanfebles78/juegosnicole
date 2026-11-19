/* Horas del juego y textos en español e inglés. Se generan todas las horas en punto, y cuarto, y media
   y menos cuarto (48 en total); cada ronda elige 5 al azar. */
(function (P) {
  'use strict';

  const ES = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
  const EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const nextHour = (h) => (h % 12) + 1;
  const article = (h) => (h === 1 ? 'la' : 'las');

  function textEs(h, m) {
    if (m === 45) {
      const n = nextHour(h);
      return cap(`${article(n)} ${ES[n]} menos cuarto`);
    }
    const tail = { 0: 'en punto', 15: 'y cuarto', 30: 'y media' }[m];
    return cap(`${article(h)} ${ES[h]} ${tail}`);
  }

  function textEn(h, m) {
    if (m === 0) return cap(`${EN[h]} o'clock`);
    if (m === 15) return `Quarter past ${EN[h]}`;
    if (m === 30) return `Half past ${EN[h]}`;
    return `Quarter to ${EN[nextHour(h)]}`;
  }

  const TIMES = [];
  for (let h = 1; h <= 12; h++) {
    [0, 15, 30, 45].forEach((m) => {
      TIMES.push({ id: `t${h}-${m}`, hour: h, minute: m, numeric: `${h}:${String(m).padStart(2, '0')}`, es: textEs(h, m), en: textEn(h, m) });
    });
  }

  const I18N = {
    es: {
      title: 'Juego de las Horas',
      colNumeric: 'Reloj digital', colText: 'En palabras', colClock: 'Reloj con agujas',
      help: '🍕 Ayuda', newRound: '🔄 Nueva ronda', finish: '🏁 Terminar',
      start: 'Une cada hora: arrastra (o toca dos tarjetas) del reloj digital a las palabras, y de las palabras al reloj con agujas.',
      wrongColumn: 'Une tarjetas de columnas diferentes.',
      order: 'Primero une el reloj digital con las palabras, y luego las palabras con el reloj de agujas.',
      wrong: '¡Uy! Esas dos no son la misma hora. Inténtalo otra vez.',
      good: '¡Muy bien! Ahora une la tercera parte de esa hora.',
      triplet: '¡Perfecto! Has unido las 3 partes de la hora.',
      allDone: '¡Has unido todas las horas! 🎉',
      helpTitle: '¿Qué es «y cuarto», «y media»…?',
      helpIntro: 'Imagina que el reloj es una pizza cortada en 4 trozos. La aguja larga se va comiendo los trozos.',
      helpQuarter: '«y cuarto»: la aguja larga en el 3. Han pasado 15 minutos, un trozo.',
      helpHalf: '«y media»: la aguja larga en el 6. Han pasado 30 minutos, media pizza.',
      helpTo: '«menos cuarto»: la aguja larga en el 9. Faltan 15 minutos para la hora siguiente.',
      helpOclock: '«en punto»: la aguja larga en el 12. La pizza entera, 60 minutos.',
    },
    en: {
      title: 'Time Game',
      colNumeric: 'Digital clock', colText: 'In words', colClock: 'Analog clock',
      help: '🍕 Help', newRound: '🔄 New round', finish: '🏁 Finish',
      start: 'Match each time: drag (or tap two cards) from the digital clock to the words, and from the words to the analog clock.',
      wrongColumn: 'Connect cards from different columns.',
      order: 'First match the digital clock with the words, then the words with the analog clock.',
      wrong: 'Oops! Those two are not the same time. Try again.',
      good: 'Well done! Now match the third part of that time.',
      triplet: 'Perfect! You matched the 3 parts of the time.',
      allDone: 'You matched all the times! 🎉',
      helpTitle: 'What are "quarter past", "half past"…?',
      helpIntro: 'Imagine the clock is a pizza cut into 4 slices. The long hand eats the slices.',
      helpQuarter: '"quarter past": the long hand on 3. 15 minutes have passed, one slice.',
      helpHalf: '"half past": the long hand on 6. 30 minutes have passed, half the pizza.',
      helpTo: '"quarter to": the long hand on 9. 15 minutes until the next hour.',
      helpOclock: '"o\'clock": the long hand on 12. The whole pizza, 60 minutes.',
    },
  };

  P.HORAS = { TIMES, I18N };
})(window.Peques);
