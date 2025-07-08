import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, Phone, ShoppingCart, Package, Plus } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  const quickActions = [
    {
      title: 'New Customer',
      subtitle: 'Add a new customer',
      icon: Users,
      color: '#2563eb',
      onPress: () => router.push('/customers/new'),
    },
    {
      title: 'New Interview',
      subtitle: 'Record a new interview',
      icon: Phone,
      color: '#059669',
      onPress: () => router.push('/interviews/new'),
    },
    {
      title: 'New Sale',
      subtitle: 'Create a new sale',
      icon: ShoppingCart,
      color: '#dc2626',
      onPress: () => router.push('/sales/new'),
    },
    {
      title: 'View Products',
      subtitle: 'Browse all products',
      icon: Package,
      color: '#7c3aed',
      onPress: () => router.push('/products'),
    },
  ];

  const navigationCards = [
    {
      title: 'Customers',
      count: 'Manage all customers',
      icon: Users,
      color: '#2563eb',
      onPress: () => router.push('/customers'),
    },
    {
      title: 'Interviews',
      count: 'View interview history',
      icon: Phone,
      color: '#059669',
      onPress: () => router.push('/interviews'),
    },
    {
      title: 'Sales',
      count: 'Track all sales',
      icon: ShoppingCart,
      color: '#dc2626',
      onPress: () => router.push('/sales'),
    },
    {
      title: 'Products',
      count: 'Product catalog',
      icon: Package,
      color: '#7c3aed',
      onPress: () => router.push('/products'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back! Here's what's happening.</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
                </View>
                <Plus size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigate</Text>
          <View style={styles.navigationGrid}>
            {navigationCards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={styles.navigationCard}
                onPress={card.onPress}
              >
                <View style={[styles.navigationIcon, { backgroundColor: card.color }]}>
                  <card.icon size={32} color="#ffffff" />
                </View>
                <Text style={styles.navigationTitle}>{card.title}</Text>
                <Text style={styles.navigationCount}>{card.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  navigationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationIcon: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  navigationCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});