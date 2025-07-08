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
import { Plus, Search, Filter, Phone, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import FilterModal from '@/components/FilterModal';

type Interview = Database['public']['Tables']['interviews']['Row'] & {
  customers?: { name: string; surname: string };
  products?: { name: string };
};

export default function InterviewsScreen() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: null,
    operator: null,
    dateRange: { start: null, end: null },
  });
  const router = useRouter();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          customers (name, surname),
          products (name)
        `)
        .order('interview_date', { ascending: false });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      Alert.alert('Error', 'Failed to load interviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInterviews();
  };

  const filteredInterviews = interviews.filter(interview => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = interview.operator.toLowerCase().includes(query) ||
      (interview.customers && 
       (`${interview.customers.name} ${interview.customers.surname}`)
         .toLowerCase().includes(query)) ||
      (interview.notes && interview.notes.toLowerCase().includes(query)) ||
      (interview.products && interview.products.name.toLowerCase().includes(query));

    const matchesStatus = !filters.status || 
      (filters.status === 'success' && interview.sale_succeeded) ||
      (filters.status === 'failed' && !interview.sale_succeeded);

    const matchesOperator = !filters.operator || interview.operator === filters.operator;

    const matchesDateRange = (!filters.dateRange.start || !filters.dateRange.end) ||
      (interview.interview_date && 
       new Date(interview.interview_date) >= filters.dateRange.start &&
       new Date(interview.interview_date) <= filters.dateRange.end);

    return matchesSearch && matchesStatus && matchesOperator && matchesDateRange;
  });

  // Get unique operators for filters
  const uniqueOperators = [...new Set(interviews.map(i => i.operator))];

  const filterConfig = [
    {
      key: 'status',
      label: 'Sale Result',
      type: 'select' as const,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      key: 'operator',
      label: 'Operator',
      type: 'select' as const,
      options: uniqueOperators.map(op => ({ label: op, value: op })),
    },
    {
      key: 'dateRange',
      label: 'Interview Date',
      type: 'dateRange' as const,
    },
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderInterviewCard = ({ item }: { item: Interview }) => (
    <TouchableOpacity
      style={styles.interviewCard}
      onPress={() => router.push(`/interviews/${item.id}`)}
    >
      <View style={styles.interviewHeader}>
        <View style={styles.interviewIcon}>
          <Phone size={20} color="#2563eb" />
        </View>
        <View style={styles.interviewInfo}>
          <Text style={styles.customerName}>
            {item.customers ? `${item.customers.name} ${item.customers.surname}` : 'Unknown Customer'}
          </Text>
          <Text style={styles.operatorName}>Operator: {item.operator}</Text>
          <Text style={styles.interviewDate}>{formatDate(item.interview_date)}</Text>
        </View>
        <View style={styles.statusIcon}>
          {item.sale_succeeded ? (
            <CheckCircle size={24} color="#10b981" />
          ) : (
            <XCircle size={24} color="#ef4444" />
          )}
        </View>
      </View>
      
      {item.products && (
        <View style={styles.productContainer}>
          <Text style={styles.productTag}>{item.products.name}</Text>
        </View>
      )}
      
      {item.notes && (
        <Text style={styles.interviewNotes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Interviews ({filteredInterviews.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/interviews/new')}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by operator, customer, notes..."
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
        data={filteredInterviews}
        renderItem={renderInterviewCard}
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
        title="Filter Interviews"
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
  interviewCard: {
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
  interviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  interviewIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  interviewInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  operatorName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  interviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusIcon: {
    marginLeft: 12,
  },
  productContainer: {
    marginBottom: 12,
  },
  productTag: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  interviewNotes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});