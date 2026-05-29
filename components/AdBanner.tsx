/**
 * AdBanner — banner de publicidad con intervalos de aparición.
 *
 * Ciclo: aparece 30 s → se oculta 90 s → repite.
 * En __DEV__ usa IDs de prueba de Google; en producción usa los IDs reales de AdMob.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AD_VISIBLE_MS = 30_000;   // visible 30 segundos
const AD_HIDDEN_MS  = 90_000;   // oculto 90 segundos
const AD_HEIGHT     = 56;

// En desarrollo usa IDs de prueba de Google (no generan ingresos pero no violan políticas).
// En producción usa los IDs reales de AdMob.
const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'       // ← pendiente: crear app iOS en AdMob
    : 'ca-app-pub-1275055191844802/9584249117';      // Android ✅

export default function AdBanner() {
  const [show, setShow]         = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const animHeight  = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  // Ciclo: oculto AD_HIDDEN_MS → visible AD_VISIBLE_MS → oculto → ...
  useEffect(() => {
    const duration = show ? AD_VISIBLE_MS : AD_HIDDEN_MS;
    const timer = setTimeout(() => setShow((s) => !s), duration);
    return () => clearTimeout(timer);
  }, [show]);

  // Animación altura (no native driver) + opacidad (native driver)
  useEffect(() => {
    const toValue = show && adLoaded ? 1 : 0;
    Animated.timing(animHeight, {
      toValue: toValue * AD_HEIGHT,
      duration: 350,
      useNativeDriver: false,
    }).start();
    setTimeout(() => {
      Animated.timing(animOpacity, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, show ? 150 : 0);
  }, [show, adLoaded]);

  return (
    <Animated.View style={{ height: animHeight, overflow: 'hidden' }}>
      <Animated.View style={{ opacity: animOpacity }}>
        <BannerAd
          unitId={AD_UNIT_ID}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={() => setAdLoaded(false)}
        />
      </Animated.View>
    </Animated.View>
  );
}
