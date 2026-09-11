import { useEffect, useState } from 'react';

/**
 * Is this a device someone taps with a finger, rather than clicks with a mouse?
 *
 * Used to decide whether to offer a camera button. Screen WIDTH would be the easy test and
 * the wrong one twice over: a laptop with a narrow window is not a camera, and a tablet held
 * in two hands is, at 1024px. What matters is the input device, which is exactly what
 * `pointer: coarse` reports -- and it is already how index.css decides to grow tap targets to
 * 44px, so the app has one answer to this question rather than two.
 *
 * Reactive, because the answer can change under a running page: a tablet gains a mouse when
 * it is docked, and the browser's own device emulation flips it while somebody is testing.
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (e) => setIsTouch(e.matches);

    // addEventListener on MediaQueryList is the modern form; addListener is the one Safari
    // understood until 14, which is still inside the range of iPhones walking into shops.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isTouch;
}
