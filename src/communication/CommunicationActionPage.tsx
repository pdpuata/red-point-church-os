import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type CommunicationAction = 'meal' | 'rsvp' | 'donation' | 'info';

export type CommunicationActionPageProps = {
  title: string;
  dateLabel: string;
  timeLabel?: string;
  intro?: string;
  meal?: { label?: string; priceLabel?: string; quicketUrl: string };
  rsvp?: { label?: string; onConfirm?: (coming: boolean) => void };
  donation?: { label?: string; url: string };
  info?: { label?: string; body: string };
  onDone?: (action: CommunicationAction) => void;
};

export default function CommunicationActionPage({
  title,
  dateLabel,
  timeLabel,
  intro = "We'd love to see you.",
  meal,
  rsvp,
  donation,
  info,
  onDone,
}: CommunicationActionPageProps) {
  const [mealBusy, setMealBusy] = useState(false);
  const [rsvpState, setRsvpState] = useState<boolean | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const hasActions = useMemo(() => !!(meal || rsvp || donation || info), [meal, rsvp, donation, info]);

  const openExternal = async (url: string, action: CommunicationAction) => {
    if (!url) return;
    setMealBusy(action === 'meal');
    try {
      await Linking.openURL(url);
      onDone?.(action);
    } finally {
      setMealBusy(false);
    }
  };

  const confirmRsvp = (coming: boolean) => {
    setRsvpState(coming);
    rsvp?.onConfirm?.(coming);
    onDone?.('rsvp');
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>RED POINT CHURCH</Text>
        <Text style={styles.small}>YOUR CHURCH, IN ONE PLACE.</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.date}>{dateLabel}</Text>
      {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
      <Text style={styles.intro}>{intro}</Text>

      {meal ? (
        <ActionCard
          emoji="🍽️"
          title={meal.label || 'Order a meal'}
          body={meal.priceLabel ? `${meal.priceLabel}\nPayment is handled securely by Quicket.` : 'Payment is handled securely by Quicket.'}
          onPress={() => openExternal(meal.quicketUrl, 'meal')}
          disabled={mealBusy}
          buttonLabel={mealBusy ? 'OPENING QUICKET…' : 'ORDER A MEAL'}
        />
      ) : null}

      {rsvp ? (
        <View style={styles.card}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.cardTitle}>{rsvp.label || "Tell us if you're coming"}</Text>
          {rsvpState === null ? (
            <View style={styles.stack}>
              <BigButton label="YES, I'M COMING" onPress={() => confirmRsvp(true)} />
              <BigButton label="NO, I CAN'T COME" secondary onPress={() => confirmRsvp(false)} />
            </View>
          ) : (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationTitle}>You're all done ✓</Text>
              <Text style={styles.confirmationBody}>{rsvpState ? "Thanks — we've recorded that you're coming." : "Thanks — we've recorded that you can't come."}</Text>
            </View>
          )}
        </View>
      ) : null}

      {donation ? (
        <ActionCard
          emoji="❤️"
          title={donation.label || 'Support the relief programme'}
          body="Give securely using the church's payment page."
          onPress={() => openExternal(donation.url, 'donation')}
          buttonLabel="SUPPORT RELIEF"
        />
      ) : null}

      {info ? (
        <View style={styles.card}>
          <Text style={styles.emoji}>ℹ️</Text>
          <Text style={styles.cardTitle}>{info.label || 'Sunday information'}</Text>
          {!showInfo ? (
            <BigButton label="VIEW INFORMATION" onPress={() => { setShowInfo(true); onDone?.('info'); }} />
          ) : (
            <Text style={styles.infoBody}>{info.body}</Text>
          )}
        </View>
      ) : null}

      {!hasActions ? <Text style={styles.intro}>There is nothing you need to do. We look forward to seeing you.</Text> : null}

      <View style={styles.help}>
        <Text style={styles.helpTitle}>Need help?</Text>
        <Text style={styles.helpBody}>You can ask someone you trust to help you complete this page. No account is required.</Text>
      </View>
    </ScrollView>
  );
}

function ActionCard({ emoji, title, body, onPress, buttonLabel, disabled }: { emoji: string; title: string; body: string; onPress: () => void; buttonLabel: string; disabled?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <BigButton label={buttonLabel} onPress={onPress} disabled={disabled} />
    </View>
  );
}

function BigButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, paddingBottom: 48, gap: 18 },
  brandBlock: { marginBottom: 10 },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  small: { marginTop: 4, fontSize: 11, opacity: 0.62, letterSpacing: 0.7 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  date: { fontSize: 21, fontWeight: '700', marginTop: -6 },
  time: { fontSize: 20, fontWeight: '600', marginTop: -10 },
  intro: { fontSize: 19, lineHeight: 28, opacity: 0.78 },
  card: { borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 22, padding: 22, gap: 12, backgroundColor: '#FFF' },
  emoji: { fontSize: 34 },
  cardTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  cardBody: { fontSize: 17, lineHeight: 25, opacity: 0.78 },
  stack: { gap: 12 },
  button: { minHeight: 64, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  secondaryButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#111' },
  buttonText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.4, color: '#FFF' },
  secondaryButtonText: { color: '#111' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  confirmation: { padding: 16, borderRadius: 16, backgroundColor: '#F2F2F2' },
  confirmationTitle: { fontSize: 22, fontWeight: '800' },
  confirmationBody: { fontSize: 17, lineHeight: 25, marginTop: 5 },
  infoBody: { fontSize: 18, lineHeight: 28 },
  help: { padding: 6, marginTop: 4 },
  helpTitle: { fontSize: 18, fontWeight: '800' },
  helpBody: { fontSize: 16, lineHeight: 24, opacity: 0.7, marginTop: 4 },
});
