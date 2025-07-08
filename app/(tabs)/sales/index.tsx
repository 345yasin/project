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
import { Plus, Search, Filter, ShoppingCart, CircleAlert as AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import FilterModal from '@/components/FilterModal';

type Sale = Database['public']['Tables']['sales']['Row'] & {
  customers?: { name: string; surname: string };
  sale_items?: Array<{
    quantity: number;
    unit_price: number;
    products?: { name: string };
  }>;
};

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: null,
    platform: null,
    dateRange: { start: null, end: null },
    priceRange: { min: null, max: null },
  });
  const router = useRouter();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name, surname),
          sale_items (
            quantity,
            unit_price,
            products (name)
          )
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      Alert.alert('Error', 'Failed to load sales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const calculateTotalPrice = (sale: Sale) => {
    if (!sale.sale_items) return 0;
    return sale.sale_items.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0) + (sale.shipping_cost || 0);
  };

  const filteredSales = sales.filter(sale => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (sale.customers && 
     (`${sale.customers.name} ${sale.customers.surname}`)
       .toLowerCase().includes(query)) ||
    sale.platform.toLowerCase().includes(query) ||
    (sale.pay_method && sale.pay_method.toLowerCase().includes(query)) ||
    (sale.sale_items && sale.sale_items.some(item => 
      item.products?.name.toLowerCase().includes(query)
    ));

    const matchesStatus = !filters.status || 
      (filters.status === 'active' && !sale.is_canceled) ||
      (filters.status === 'canceled' && sale.is_canceled);

    const matchesPlatform = !filters.platform || sale.platform === filters.platform;

    const matchesDateRange = (!filters.dateRange.start || !filters.dateRange.end) ||
      (sale.sale_date && 
       new Date(sale.sale_date) >= filters.dateRange.start &&
       new Date(sale.sale_date) <= filters.dateRange.end);

    const totalPrice = calculateTotalPrice(sale);
    const matchesPriceRange = (!filters.priceRange.min || totalPrice >= filters.priceRange.min) &&
      (!filters.priceRange.max || totalPrice <= filters.priceRange.max);

    return matchesSearch && matchesStatus && matchesPlatform && matchesDateRange && matchesPriceRange;
  });

  const filterConfig = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Canceled', value: 'canceled' },
      ],
    },
    {
      key: 'platform',
      label: 'Platform',
      type: 'select' as const,
      options: [
        { label: 'Phone', value: 'phone' },
        { label: 'Face to Face', value: 'f2f' },
        { label: 'Trendyol', value: 'trendyol' },
        { label: 'Hepsiburada', value: 'hepsiburada' },
        { label: 'N11', value: 'n11' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Sale Date',
      type: 'dateRange' as const,
    },
    {
      key: 'priceRange',
      label: 'Price Range',
      type: 'priceRange' as const,
    },
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'phone': return '#2563eb';
      case 'f2f': return '#059669';
      case 'trendyol': return '#f97316';
      case 'hepsiburada': return '#dc2626';
      case 'n11': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const renderSaleCard = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={[
        styles.saleCard,
        item.is_canceled && styles.canceledCard
      ]}
      onPress={() => router.push(`/sales/${item.id}`)}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleIcon}>
          {item.is_canceled ? (
            <AlertCircle size={20} color="#ef4444" />
          ) : (
            <ShoppingCart size={20} color="#2563eb" />
          )}
        </View>
        <View style={styles.saleInfo}>
          <Text style={styles.customerName}>
            {item.customers ? `${item.customers.name} ${item.customers.surname}` : 'Unknown Customer'}
          </Text>
          <Text style={styles.saleDate}>{formatDate(item.sale_date)}</Text>
          <View style={styles.platformContainer}>
            <View style={[
              styles.platformTag,
              { backgroundColor: getPlatformColor(item.platform) + '20' }
            ]}>
              <Text style={[
                styles.platformText,
                { color: getPlatformColor(item.platform) }
              ]}>
                {item.platform.toUpperCase()}
              </Text>
            </View>
            {item.is_canceled && (
              <View style={styles.canceledTag}>
                <Text style={styles.canceledText}>CANCELED</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[
            styles.totalPrice,
            item.is_canceled && styles.canceledPrice
          ]}>
            ₺{calculateTotalPrice(item).toFixed(2)}
          </Text>
        </View>
      </View>
      
      {item.sale_items && item.sale_items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsCount}>
            {item.sale_items.length} item{item.sale_items.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.itemsPreview}>
            {item.sale_items.map(saleItem => 
              saleItem.products?.name || 'Unknown Product'
            ).join(', ')}
          </Text>
        </View>
      )}
      
      {item.pay_method && (
        <Text style={styles.payMethod}>Payment: {item.pay_method}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales ({filteredSales.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/sales/new')}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, platform, products..."
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
        data={filteredSales}
        renderItem={renderSaleCard}
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
        title="Filter Sales"
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
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
  saleCard: {
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
  },
  canceledCard: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  saleInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  platformContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  platformTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
  },
  canceledTag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  canceledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  canceledPrice: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  itemsContainer: {
    marginBottom: 8,
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  itemsPreview: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  payMethod: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});