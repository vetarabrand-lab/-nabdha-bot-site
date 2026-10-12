# فيديو الهيرو — Remotion

مصدر فيديو محادثة واتساب في أعلى الصفحة الرئيسية (assets/hero/).

## إعادة التصدير بعد أي تعديل
```bash
cd remotion-hero
npm install
npx remotion studio src/index.ts          # معاينة وتعديل
npx remotion render src/index.ts ChatAR ../assets/hero/nabda-chat-ar.mp4 --codec=h264 --crf=26
npx remotion render src/index.ts ChatEN ../assets/hero/nabda-chat-en.mp4 --codec=h264 --crf=26
npx remotion still  src/index.ts ChatAR ../assets/hero/nabda-chat-ar.png --frame=470
```
النصوص في `src/strings.ts`، والتوقيتات في `T` داخل `src/Chat.tsx`.
