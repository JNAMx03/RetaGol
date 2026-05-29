import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

const FAQ = [
  {
    q: '¿Cómo funciona la puntuación?',
    a: 'El sistema es aditivo: cada criterio que aciertes suma puntos de forma independiente. Valores por defecto:\n\n✅ Resultado correcto (gana/empata/pierde): +5 pts\n⚽ Goles del local exactos: +2 pts\n⚽ Goles del visitante exactos: +2 pts\n📐 Diferencia de goles exacta: +1 pt\n\nMáximo por partido con valores por defecto: 10 pts.\n\nEl creador de la polla puede personalizar cada valor y activar opciones especiales: doble puntos en fases eliminatorias o +1 bonus para el único que acierte el marcador exacto.',
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4EBD8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#149435' },
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
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBD8' },
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
});
