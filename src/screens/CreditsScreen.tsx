import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { GlobalFonts } from '../styles/global';
import { getCreditBalance, getCreditLedger, formatCreditReason } from '../lib/credits';
import type { CreditLedgerEntry } from '../lib/credits';

export const CreditsScreen: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const [balanceData, ledgerData] = await Promise.all([
        getCreditBalance(),
        getCreditLedger(50),
      ]);
      setBalance(balanceData);
      setLedger(ledgerData);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCredits();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderLedgerItem = ({ item }: { item: CreditLedgerEntry }) => {
    const isPositive = item.delta > 0;
    
    return (
      <View style={styles.ledgerItem}>
        <View style={styles.ledgerLeft}>
          <Text style={styles.ledgerReason}>{formatCreditReason(item.reason)}</Text>
          <Text style={styles.ledgerDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.ledgerDelta, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{item.delta}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{balance}</Text>
        <Text style={styles.balanceUnit}>Credits</Text>
      </View>

      {/* Transaction History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Transaction History</Text>
      </View>

      {ledger.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptyHint}>
            Earn credits by referring friends or purchasing credit packages
          </Text>
        </View>
      ) : (
        <FlatList
          data={ledger}
          renderItem={renderLedgerItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.ledgerList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    margin: 20,
    marginTop: 60,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
    fontFamily: GlobalFonts.regular,
  },
  balanceValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: GlobalFonts.bold,
  },
  balanceUnit: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
    fontFamily: GlobalFonts.regular,
  },
  historyHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#000',
  },
  ledgerList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ledgerItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ledgerLeft: {
    flex: 1,
  },
  ledgerReason: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#000',
    marginBottom: 4,
  },
  ledgerDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: GlobalFonts.regular,
  },
  ledgerDelta: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    marginLeft: 16,
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#666',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: GlobalFonts.regular,
  },
});
