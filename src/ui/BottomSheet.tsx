import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { colors, radius } from './theme';

/** Slides up from the bottom. Rendered inside a transparent-modal route, so no RN Modal is needed. */
export function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const h = Dimensions.get('window').height;
  const y = useRef(new Animated.Value(h)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [y, fade]);
  const close = () => {
    Animated.parallel([
      Animated.timing(y, { toValue: h, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ transform: [{ translateY: y }], backgroundColor: colors.card, borderTopLeftRadius: radius.card + 4, borderTopRightRadius: radius.card + 4, borderWidth: 1, borderColor: colors.border, maxHeight: h * 0.9 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
