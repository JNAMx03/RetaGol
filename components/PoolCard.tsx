import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Pool } from '../context/AppContext';

// Liga → verde marca | Copa → dorado | Champions/UCL → azul marino (color UCL)
const TYPE_COLORS: Record<string, string> = {
  liga: '#149435',
  copa: '#EAB308',
  champions: '#0369A1',
};

const TYPE_LABELS: Record<string, string> = {
  liga: 'Liga',
  copa: 'Copa',
  champions: 'Champions',
};

interface Props {
  pool: Pool;
  onPress: () => void;
}

export default function PoolCard({ pool, onPress }: Props) {
  const badgeColor = TYPE_COLORS[pool.type] ?? '#64748B';
  const badgeLabel = TYPE_LABELS[pool.type] ?? pool.type;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>{pool.name}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {'👥 '}{pool.participants} participante{pool.participants !== 1 ? 's' : ''}
        {'  •  Código '}{pool.code}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
  },
});
