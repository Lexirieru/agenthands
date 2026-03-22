'use client';

import { SelfQRcodeWrapper } from '@selfxyz/qrcode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SelfQR(props: any) {
  return <SelfQRcodeWrapper {...props} />;
}
