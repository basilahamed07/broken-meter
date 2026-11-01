import React from 'react';
import { Modal, View } from 'react-native';
import { formatRupees } from '../lib/money';
import { useApp } from '../state/AppContext';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Card } from './Card';
import { Text } from './Text';
import { colors } from './theme';

/** "Did the payment go through?" when the user returns from GPay and no SMS confirmed it. */
export function PendingPrompt() {
  const { pendingPrompt, resolvePending, snoozePending } = useApp();
  return (
    <Modal visible={!!pendingPrompt} transparent animationType="fade" onRequestClose={snoozePending}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 }}>
        <Card style={{ gap: 12 }}>
          <Text variant="title">Did the payment go through?</Text>
          <Text variant="body" style={{ color: colors.textSecondary }}>
            {pendingPrompt ? `${formatRupees(pendingPrompt.amount)}${pendingPrompt.payee ? ` to ${pendingPrompt.payee}` : ''}` : ''}
          </Text>
          <PrimaryButton label="Yes, it went through" onPress={() => pendingPrompt && resolvePending(pendingPrompt.id, true)} />
          <SecondaryButton label="No, it failed or I cancelled" onPress={() => pendingPrompt && resolvePending(pendingPrompt.id, false)} />
          <SecondaryButton label="Ask me later" onPress={snoozePending} />
        </Card>
      </View>
    </Modal>
  );
}
