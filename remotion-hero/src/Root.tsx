import React from 'react';
import {Composition} from 'remotion';
import {Chat, DURATION} from './Chat';

export const Root: React.FC = () => (
  <>
    <Composition id="ChatAR" component={Chat} durationInFrames={DURATION} fps={30} width={540} height={1170} defaultProps={{lang: 'ar' as const}} />
    <Composition id="ChatEN" component={Chat} durationInFrames={DURATION} fps={30} width={540} height={1170} defaultProps={{lang: 'en' as const}} />
  </>
);
