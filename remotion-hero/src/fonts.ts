import {continueRender, delayRender, staticFile} from 'remotion';

const AR =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LAT =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const FONT = "'Plex', system-ui, sans-serif";

let started = false;
export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('fonts');
  const faces: FontFace[] = [];
  for (const w of ['400', '500', '600', '700']) {
    faces.push(new FontFace('Plex', `url(${staticFile(`fonts/plex-ar-${w}.woff2`)}) format('woff2')`, {weight: w, unicodeRange: AR}));
    faces.push(new FontFace('Plex', `url(${staticFile(`fonts/plex-lat-${w}.woff2`)}) format('woff2')`, {weight: w, unicodeRange: LAT}));
  }
  Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l))))
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
