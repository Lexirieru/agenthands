/** @module fonts */
import localFont from 'next/font/local';

/**
 * Parasitype — the AgentHands brand display typeface.
 * Loaded from local `.otf` files (weights 200–700) and exposed as
 * the `--font-parasitype` CSS custom property used by Tailwind's
 * `font-heading` and `font-label` utilities.
 *
 * @since 1.0.0
 */
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

/**
 * Courier New — monospace fallback used for on-chain identifiers such as
 * Celo wallet addresses, IPFS CIDs, and task IDs throughout the AgentHands UI.
 *
 * @since 1.0.0
 */
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

/**
 * Space-separated CSS variable string injected into `<html className>` by
 * RootLayout, making both font variables available to every Tailwind class
 * in the app (e.g. `font-heading` → `var(--font-parasitype)`).
 */
export const fontsVariable = fonts.map((f) => f.variable).join(' ');
