import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PollCard({ navigation }: any) {
  return (
    <TouchableOpacity
        style={styles.card}
        onPress={() =>
            navigation.navigate('PoolDetail', {
            name: 'Champions League 2026',
            })
        }
        >
        <View style={styles.header}>
            <Text style={styles.title}>Champions League 2026</Text>
            <View style={styles.badge}>
            <Text style={styles.badgeText}>Champions</Text>
            </View>
        </View>

        <Text style={styles.info}>👥 24 participantes</Text>
        <Text style={styles.code}>Código: CH2026</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    badge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#2563EB',
        fontSize: 12,
    },
    info: {
        color: '#475569',
        fontSize: 12,
    },
    code: {
        color: '#94A3B8',
        fontSize: 12,
    },
});