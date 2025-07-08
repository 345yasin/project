import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, User, ArrowLeft, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FilterModal from '@/components/FilterModal';

type Customer = Database['public']['Tables']['customers']['Row'];

export default function CustomersScreen() {
  const router = useRouter();
  const { selectMode, returnTo } = useLocalSearchParams<{
    selectMode?: string;
    returnTo?: string;
  }>();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    industry: null,
    city: null,
    hasEmail: null,
  });

  const isSelectMode = selectMode === 'true';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleCustomerSelect = (customer: Customer) => {
    if (isSelectMode && returnTo) {
      router.push(`/${returnTo}?selectedCustomerId=${customer.id}`);
    } else {
      router.push(`/customers/${customer.id}`);
    }
  };

  const handleNewCustomer = () => {
    if (isSelectMode && returnTo) {
      router.push(`/customers/new?returnTo=${returnTo}`);
    } else {
      router.push('/customers/new');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = customer.name.toLowerCase().includes(query) ||
      customer.surname.toLowerCase().includes(query) ||
      customer.city.toLowerCase().includes(query) ||
      customer.town.toLowerCase().includes(query) ||
      (customer.industry && customer.industry.toLowerCase().includes(query)) ||
      (customer.email && customer.email.toLowerCase().includes(query)) ||
      (customer.address && customer.address.toLowerCase().includes(query)) ||
      (customer.phone_numbers && customer.phone_numbers.some(phone => 
        phone.toLowerCase().includes(query)
      ));

    const matchesIndustry = !filters.industry || customer.industry === filters.industry;
    const matchesCity = !filters.city || customer.city === filters.city;
    const matchesEmail = filters.hasEmail === null || 
      (filters.hasEmail === 'yes' && customer.email) ||
      (filters.hasEmail === 'no' && !customer.email);

    return matchesSearch && matchesIndustry && matchesCity && matchesEmail;
  });

  // Get unique industries and cities for filters
  const uniqueIndustries = [...new Set(customers.map(c => c.industry).filter(Boolean))];
  const uniqueCities = [...new Set(customers.map(c => c.city))];

  const filterConfig = [
    {
      key: 'industry',
      label: 'Industry',
      type: 'select' as const,
      options: uniqueIndustries.map(industry => ({ label: industry!, value: industry })),
    },
    {
      key: 'city',
      label: 'City',
      type: 'select' as const,
      options: uniqueCities.map(city => ({ label: city, value: city })),
    },
    {
      key: 'hasEmail',
      label: 'Has Email',
      type: 'select' as const,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
    },
  ];

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => handleCustomerSelect(item)}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerAvatar}>
          <User size={24} color="#2563eb" />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name} {item.surname}</Text>
          <Text style={styles.customerDetails}>
            {item.city}, {item.town}
          </Text>
          {item.industry && (
            <Text style={styles.customerIndustry}>{item.industry}</Text>
          )}
          {item.email && (
            <Text style={styles.customerEmail}>{item.email}</Text>
          )}
        </View>
        {isSelectMode && (
          <View style={styles.selectIndicator}>
            <Check size={16} color="#2563eb" />
          </View>
        )}
      </View>
      {item.phone_numbers && item.phone_numbers.length > 0 && (
        <Text style={styles.customerPhone}>{item.phone_numbers[0]}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {isSelectMode && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Alert.alert(
                'Cancel Selection',
                'Are you sure you want to cancel customer selection?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes', style: 'default', onPress: () => router.back() }
                ]
              );
            }}
          >
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {isSelectMode ? 'Select Customer' : `Customers (${filteredCustomers.length})`}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleNewCustomer}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, email, address, city..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Customers"
        filters={filters}
        onFiltersChange={setFilters}
        filterConfig={filterConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    backgroundColor: '#dbeafe',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerIndustry: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  customerPhone: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 4,
  },
});