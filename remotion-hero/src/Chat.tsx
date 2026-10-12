import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {FONT, loadFonts} from './fonts';
import {Lang, STR} from './strings';

loadFonts();

// ——— الألوان (واجهة واتساب الفاتحة مع هوية نبضة) ———
const C = {
  header: '#075E54',
  headerInk: '#FFFFFF',
  wall: '#EFE7DD',
  me: '#D9FDD3',
  bot: '#FFFFFF',
  ink: '#111B21',
  meta: '#667781',
  tick: '#53BDEB',
  green: '#25D366',
  teal: '#0B8F7A',
  line: '#E9EDEF',
};

// ——— الخط الزمني (30fps) ———
const T = {
  me1: 14,
  type1: [36, 74] as const,
  bot1: 74,
  product: 92,
  me2: 168,
  type2: [190, 226] as const,
  bot2: 226,
  me3: 300,
  type3: [322, 360] as const,
  bot3: 360,
  order: 378,
  out: 486, // بداية التلاشي للحلقة
};
export const DURATION = 540;

const useEnter = (at: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 15, stiffness: 170, mass: 0.7}});
  return {visible: frame >= at, s};
};

const Ticks: React.FC = () => (
  <svg width="22" height="14" viewBox="0 0 16 11" style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d="M11.07.65 5.2 6.52 3.4 4.72l-.94.94 2.74 2.74 6.8-6.8-.93-.95Z" fill={C.tick} />
    <path d="M15.07.65 9.2 6.52l-.73-.73-.94.94 1.67 1.67 6.8-6.8-.93-.95Z" fill={C.tick} />
  </svg>
);

const Meta: React.FC<{time: string; me?: boolean; abs?: boolean}> = ({time, me, abs}) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, color: C.meta, whiteSpace: 'nowrap',
      ...(abs ? {position: 'absolute' as const, insetInlineEnd: 14, bottom: 8} : {}),
    }}
  >
    <span>{time}</span>
    {me && <Ticks />}
  </span>
);

const Bubble: React.FC<{at: number; me?: boolean; children: React.ReactNode; pad?: number; width?: number}> = ({at, me, children, pad = 14, width}) => {
  const {visible, s} = useEnter(at);
  if (!visible) return null;
  const y = interpolate(s, [0, 1], [26, 0]);
  const sc = interpolate(s, [0, 1], [0.9, 1]);
  return (
    <div
      style={{
        alignSelf: me ? 'flex-end' : 'flex-start',
        maxWidth: width ? undefined : '80%',
        width,
        background: me ? C.me : C.bot,
        color: C.ink,
        borderRadius: 18,
        borderStartStartRadius: me ? 18 : 4,
        borderStartEndRadius: me ? 4 : 18,
        padding: `${pad}px ${pad + 4}px ${pad - 4}px`,
        position: 'relative',
        fontSize: 25,
        lineHeight: 1.5,
        boxShadow: '0 1.5px 1px rgba(11,20,26,.13)',
        opacity: s,
        transform: `translateY(${y}px) scale(${sc})`,
        transformOrigin: me ? 'bottom left' : 'bottom right',
      }}
    >
      {children}
    </div>
  );
};

const Typing: React.FC<{from: number; to: number}> = ({from, to}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const inS = interpolate(frame, [from, from + 6], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{alignSelf: 'flex-start', background: C.bot, borderRadius: 18, borderStartStartRadius: 4, padding: '20px 24px', display: 'flex', gap: 8, opacity: inS, boxShadow: '0 1.5px 1px rgba(11,20,26,.13)'}}>
      {[0, 1, 2].map((i) => {
        const p = Math.sin((frame - from) / 3.2 - i * 0.9);
        return <div key={i} style={{width: 12, height: 12, borderRadius: 6, background: '#8696A0', opacity: 0.45 + 0.55 * Math.max(0, p), transform: `translateY(${-Math.max(0, p) * 6}px)`}} />;
      })}
    </div>
  );
};

const Bottle: React.FC = () => (
  <svg viewBox="0 0 400 230" width="100%" height="230" style={{display: 'block'}}>
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0B3D35" />
        <stop offset="1" stopColor="#14705F" />
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#E9C46A" stopOpacity=".95" />
        <stop offset=".5" stopColor="#F6DFA0" stopOpacity=".95" />
        <stop offset="1" stopColor="#C9973A" stopOpacity=".95" />
      </linearGradient>
      <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1B1B1B" />
        <stop offset=".5" stopColor="#4A4A4A" />
        <stop offset="1" stopColor="#111" />
      </linearGradient>
      <radialGradient id="glow" cx=".5" cy=".55" r=".5">
        <stop offset="0" stopColor="#25D366" stopOpacity=".35" />
        <stop offset="1" stopColor="#25D366" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="400" height="230" fill="url(#bg)" />
    <circle cx="200" cy="130" r="120" fill="url(#glow)" />
    <ellipse cx="200" cy="206" rx="70" ry="9" fill="#000" opacity=".25" />
    <rect x="186" y="34" width="28" height="18" rx="3" fill="#C9973A" />
    <rect x="176" y="14" width="48" height="26" rx="6" fill="url(#cap)" />
    <rect x="146" y="52" width="108" height="150" rx="22" fill="url(#glass)" />
    <rect x="160" y="62" width="14" height="128" rx="7" fill="#fff" opacity=".35" />
    <rect x="168" y="108" width="64" height="44" rx="6" fill="#0B3D35" opacity=".85" />
    <rect x="180" y="122" width="40" height="4" rx="2" fill="#E9C46A" />
    <rect x="186" y="132" width="28" height="3" rx="1.5" fill="#E9C46A" opacity=".7" />
  </svg>
);

const ProductCard: React.FC<{at: number; s: (typeof STR)['ar']; time: string}> = ({at, s, time}) => (
  <Bubble at={at} pad={8} width={400}>
    <div style={{borderRadius: 12, overflow: 'hidden'}}>
      <Bottle />
    </div>
    <div style={{padding: '12px 8px 2px'}}>
      <div style={{fontWeight: 700, fontSize: 25}}>{s.pTitle}</div>
      <div style={{color: C.meta, fontSize: 19}}>{s.pSub}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6}}>
        <span style={{fontWeight: 700, fontSize: 27, color: C.header}}>{s.pPrice}</span>
        <span style={{fontSize: 19, color: C.meta, textDecoration: 'line-through'}}>{s.pOld}</span>
        <span style={{marginInlineStart: 'auto'}}>
          <Meta time={time} />
        </span>
      </div>
    </div>
    <div style={{borderTop: `1px solid ${C.line}`, marginTop: 10, padding: '14px 0 8px', textAlign: 'center', color: C.teal, fontWeight: 600, fontSize: 23, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
      {s.pBtn}
    </div>
  </Bubble>
);

const OrderCard: React.FC<{at: number; s: (typeof STR)['ar']; time: string}> = ({at, s, time}) => {
  const frame = useCurrentFrame();
  // تعبئة شريط التقدّم بعد ظهور البطاقة
  const fill = interpolate(frame, [at + 8, at + 40], [0, 2 / 3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const pulse = 0.5 + 0.5 * Math.sin((frame - at) / 5);
  return (
    <Bubble at={at} pad={16} width={420}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
        <span style={{fontWeight: 700, fontSize: 25}}>{s.oTitle}</span>
        <span style={{background: 'rgba(37,211,102,.16)', color: '#0A7C3E', fontWeight: 700, fontSize: 18, padding: '5px 14px', borderRadius: 100}}>{s.oStatus}</span>
      </div>
      <div style={{position: 'relative', height: 26, margin: '0 14px'}}>
        <div style={{position: 'absolute', insetInline: 0, top: 11, height: 4, borderRadius: 2, background: C.line}} />
        <div style={{position: 'absolute', insetInlineStart: 0, top: 11, height: 4, borderRadius: 2, width: `${fill * 100}%`, background: C.green}} />
        {[0, 1, 2, 3].map((i) => {
          const done = fill >= i / 3 - 0.001;
          const current = i === 2 && done;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                insetInlineStart: `calc(${(i / 3) * 100}% - 13px)`,
                top: 0,
                width: 26,
                height: 26,
                borderRadius: 13,
                background: done ? C.green : '#fff',
                border: done ? 'none' : `3px solid ${C.line}`,
                boxSizing: 'border-box',
                boxShadow: current ? `0 0 0 ${4 + pulse * 6}px rgba(37,211,102,${0.28 - pulse * 0.18})` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {done && !current && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
              {current && <div style={{width: 8, height: 8, borderRadius: 4, background: '#fff'}} />}
            </div>
          );
        })}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', marginTop: 10, fontSize: 16, color: C.meta, textAlign: 'center', lineHeight: 1.3}}>
        {s.steps.map((x, i) => (
          <span key={i} style={{color: i <= 2 ? C.ink : C.meta, fontWeight: i === 2 ? 700 : 500}}>{x}</span>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 20, color: C.ink}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.header} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <span>{s.eta}</span>
        <span style={{marginInlineStart: 'auto'}}><Meta time={time} /></span>
      </div>
      <div style={{borderTop: `1px solid ${C.line}`, marginTop: 12, padding: '14px 0 2px', textAlign: 'center', color: C.teal, fontWeight: 600, fontSize: 23, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        {s.oBtn}
      </div>
    </Bubble>
  );
};

const Text: React.FC<{at: number; me?: boolean; text: string; time: string}> = ({at, me, text, time}) => (
  <Bubble at={at} me={me}>
    <span>{text}</span>
    <span style={{display: 'inline-block', width: me ? 118 : 92, height: 1}} />
    <Meta time={time} me={me} abs />
  </Bubble>
);

const StatusBar: React.FC = () => (
  <div style={{height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', color: '#fff', fontSize: 20, fontWeight: 600, direction: 'ltr', background: C.header}}>
    <span>9:41</span>
    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
      <svg width="26" height="16" viewBox="0 0 26 16" fill="#fff"><rect x="0" y="10" width="4" height="6" rx="1" /><rect x="7" y="7" width="4" height="9" rx="1" /><rect x="14" y="4" width="4" height="12" rx="1" /><rect x="21" y="0" width="4" height="16" rx="1" /></svg>
      <svg width="22" height="16" viewBox="0 0 24 18" fill="#fff"><path d="M12 18 0 5.4a17 17 0 0 1 24 0L12 18Z" /></svg>
      <svg width="34" height="17" viewBox="0 0 34 17" fill="none"><rect x=".5" y=".5" width="29" height="16" rx="4" stroke="#fff" opacity=".6" /><rect x="3" y="3" width="22" height="11" rx="2" fill="#fff" /><rect x="31" y="5.5" width="2.5" height="6" rx="1" fill="#fff" opacity=".6" /></svg>
    </div>
  </div>
);

const Header: React.FC<{s: (typeof STR)['ar']}> = ({s}) => {
  const frame = useCurrentFrame();
  const typing = [T.type1, T.type2, T.type3].some(([a, b]) => frame >= a && frame < b);
  return (
    <div style={{background: C.header, color: C.headerInk, height: 100, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', boxShadow: '0 2px 6px rgba(0,0,0,.12)', position: 'relative', zIndex: 2}}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" style={{transform: s.dir === 'rtl' ? 'scaleX(-1)' : undefined}}><path d="M15 18 9 12l6-6" /></svg>
      <div style={{width: 62, height: 62, borderRadius: 31, background: 'linear-gradient(140deg,#25D366,#0B8F7A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 27, fontWeight: 700}}>
          {s.store}
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1Z" fill="#25D366" /><path d="m8 12.2 2.7 2.7L16.2 9.4" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{fontSize: 19, opacity: 0.85, color: typing ? '#B8F5CF' : '#fff'}}>{typing ? s.typing : `${s.business} · ${s.online}`}</div>
      </div>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
    </div>
  );
};

const WALL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23C9BBA8' stroke-width='1.6' opacity='.45'%3E%3Ccircle cx='20' cy='22' r='7'/%3E%3Cpath d='M70 14l8 8-8 8-8-8z'/%3E%3Cpath d='M100 70c6 0 10 4 10 10'/%3E%3Cpath d='M22 84h16M30 76v16'/%3E%3Ccircle cx='76' cy='96' r='3'/%3E%3C/g%3E%3C/svg%3E")`;

export const Chat: React.FC<{lang: Lang}> = ({lang}) => {
  const s = STR[lang];
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [T.out, DURATION - 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const lift = interpolate(frame, [T.out, DURATION - 6], [0, -40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const chipIn = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{fontFamily: FONT, direction: s.dir, background: C.wall}}>
      <StatusBar />
      <Header s={s} />
      <div style={{position: 'absolute', top: 146, bottom: 96, insetInline: 0, backgroundImage: WALL, backgroundColor: C.wall, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, padding: '18px 22px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, opacity: fadeOut, transform: `translateY(${lift}px)`}}>
          <div style={{alignSelf: 'center', background: '#fff', color: C.meta, fontSize: 17, padding: '5px 16px', borderRadius: 10, boxShadow: '0 1px 1px rgba(0,0,0,.08)', opacity: chipIn, marginBottom: 'auto', marginTop: 6}}>{s.today}</div>
          <Text at={T.me1} me text={s.me1} time={s.t[0]} />
          <Typing from={T.type1[0]} to={T.type1[1]} />
          <Text at={T.bot1} text={s.bot1} time={s.t[1]} />
          <ProductCard at={T.product} s={s} time={s.t[1]} />
          <Text at={T.me2} me text={s.me2} time={s.t[2]} />
          <Typing from={T.type2[0]} to={T.type2[1]} />
          <Text at={T.bot2} text={s.bot2} time={s.t[3]} />
          <Text at={T.me3} me text={s.me3} time={s.t[4]} />
          <Typing from={T.type3[0]} to={T.type3[1]} />
          <Text at={T.bot3} text={s.bot3} time={s.t[5]} />
          <OrderCard at={T.order} s={s} time={s.t[5]} />
        </div>
      </div>
      {/* شريط الكتابة */}
      <div style={{position: 'absolute', bottom: 0, insetInline: 0, height: 96, background: C.wall, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 10px'}}>
        <div style={{flex: 1, height: 64, borderRadius: 32, background: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', color: '#8696A0', fontSize: 23, boxShadow: '0 1px 1px rgba(0,0,0,.06)'}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="9.5" r=".6" fill="#8696A0" /><circle cx="15" cy="9.5" r=".6" fill="#8696A0" /></svg>
          <span style={{flex: 1}}>{s.input}</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></svg>
        </div>
        <div style={{width: 64, height: 64, borderRadius: 32, background: '#00A884', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /></svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
