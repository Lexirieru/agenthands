import localFont from 'next/font/local';

const parasitype = localFont({
  src: [
    { path: '../../public/fonts/parasitype/Parasitype-ExtraLight.otf', weight: '200' },
    { path: '../../public/fonts/parasitype/Parasitype-Light.otf', weight: '300' },
    { path: '../../public/fonts/parasitype/Parasitype-Regular.otf', weight: '400' },
    { path: '../../public/fonts/parasitype/Parasitype-Medium.otf', weight: '500' },
    { path: '../../public/fonts/parasitype/Parasitype-SemiBold.otf', weight: '600' },
    { path: '../../public/fonts/parasitype/Parasitype-Bold.otf', weight: '700' },
  ],
  variable: '--font-parasitype',
  display: 'swap',
});

const courierNew = localFont({
  src: [
    { path: '../../public/fonts/courierNew/CourierNewPSMT.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/courierNew/CourierNewPS-BoldMT.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/courierNew/CourierNewPS-ItalicMT.ttf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/courierNew/CourierNewPS-BoldItalicMT.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-courier-new',
  display: 'swap',
});

const fonts = [parasitype, courierNew];
export const fontsVariable = fonts.map((f) => f.variable).join(' ');
