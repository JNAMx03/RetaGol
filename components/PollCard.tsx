import {View, Text, StyleSheet} from 'react-native';

export default function PollCard(){
    return(
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>Champions League 2026</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Champions</Text>
                </View>
            </View>

            <Text style={styles.info}>24 participantes</Text>
            <Text style={styles.code}>Code: CH2026</Text>
        </View>
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