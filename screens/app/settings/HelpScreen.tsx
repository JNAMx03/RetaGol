import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

const FAQ = [
  {
    q: '¿Cómo funciona la puntuación?',
    a: 'Cada predicción se compara con el resultado real:\n\n⭐ Marcador exacto → 5 pts\n🔵 Un equipo exacto → 2 pts\n🟡 Ganador/empate correcto → 1 pt\n🟡 Diferencia de goles correcta → 1 pt\n\nEl creador de la polla puede personalizar los puntos al crearla.',
  },
  {
    q: '¿Cómo creo una polla?',
    a: 'En la pantalla principal, toca "Crear Polla". Escoge un nombre, selecciona el torneo y personaliza la puntuación si quieres. Tus amigos pueden unirse usando el código que se genera automáticamente.',
  },
  {
    q: '¿Cómo me uno a una polla?',
    a: 'Toca "Unirse" en la pantalla principal e ingresa el código de 6–8 caracteres que te compartió el creador de la polla.',
  },
  {
    q: '¿Cuándo se actualizan los resultados?',
    a: 'Los resultados se sincronizan automáticamente con la API de football-data.org. También puedes forzar una actualización haciendo pull-to-refresh en la pestaña "Resultados" de cualquier polla.',
  },
  {
    q: '¿Puedo cambiar mis predicciones?',
    a: 'Sí, puedes editar tus predicciones en la pestaña "Predicciones" de cada polla. Recuerda guardar los cambios antes de que empiece el partido.',
  },
  {
    q: '¿Qué pasa si el partido no tiene resultado?',
    a: 'Los partidos sin resultado aún no cuentan para la clasificación ni para tus estadísticas. Aparecerán en la parte inferior de la lista de resultados.',
  },
];

export default function HelpScreen({ navigation }: any) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (i: number) => setExpanded(expanded === i ? null : i);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayuda y soporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* FAQ */}
        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
        <View style={styles.card}>
          {FAQ.map((item, i) => (
            <View key={i} style={i < FAQ.length - 1 ? styles.itemBorder : undefined}>
              <TouchableOpacity
                style={styles.faqRow}
                onPress={() => toggle(i)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqArrow}>{expanded === i ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Contacto */}
        <Text style={styles.sectionTitle}>Contacto</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL('mailto:soporte@retagol.app')}
            activeOpacity={0.7}
          >
            <View style={styles.contactIconBox}>
              <Text style={styles.contactIcon}>✉️</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Escribir al soporte</Text>
              <Text style={styles.contactDesc}>soporte@retagol.app</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#2563EB' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  faqArrow: { fontSize: 11, color: '#94A3B8' },
  faqA: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIcon: { fontSize: 18 },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  contactDesc: { fontSize: 12, color: '#64748B' },
  chevron: { fontSize: 22, color: '#CBD5E1' },
});
