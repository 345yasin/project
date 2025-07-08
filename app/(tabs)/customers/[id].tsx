import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard as Edit, Phone, Mail, MapPin, Package, Calendar, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Customer = Database['public']['Tables']['customers']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'] & {
  sale_items?: Array<{
    quantity: number;
    unit_price: number;
    products?: { name: string };
  }>;
};
type Interview = Database['public']['Tables']['interviews']['Row'] & {
  products?: { name: string };
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch customer sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            quantity,
            unit_price,
            products (name)
          )
        `)
        .eq('customer_id', id)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);

      // Fetch customer interviews - Fixed query without categories join
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          products (name)
        `)
        .eq('customer_id', id)
        .order('interview_date', { ascending: false });

      if (interviewsError) throw interviewsError;
      setInterviews(interviewsData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      Alert.alert('Error', 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Customer deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error deleting customer:', error);
      Alert.alert('Error', 'Failed to delete customer');
    }
  };

  const handlePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const calculateTotalPrice = (sale: Sale) => {
    if (!sale.sale_items) return 0;
    return sale.sale_items.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0) + (sale.shipping_cost || 0);
  };

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

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Customer Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/customers/edit/${id}`)}
          >
            <Edit size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerName}>
              {customer.name} {customer.surname}
            </Text>
            {customer.industry && (
              <View style={styles.industryTag}>
                <Text style={styles.industryText}>{customer.industry}</Text>
              </View>
            )}
          </View>

          <View style={styles.contactInfo}>
            {customer.phone_numbers && customer.phone_numbers.map((phone, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactItem}
                onPress={() => handlePhoneCall(phone)}
              >
                <Phone size={20} color="#2563eb" />
                <Text style={styles.contactText}>{phone}</Text>
              </TouchableOpacity>
            ))}

            {customer.email && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleEmail(customer.email!)}
              >
                <Mail size={20} color="#2563eb" />
                <Text style={styles.contactText}>{customer.email}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.contactItem}>
              <MapPin size={20} color="#6b7280" />
              <Text style={styles.contactText}>
                {customer.city}, {customer.town}
              </Text>
            </View>

            {customer.address_name && (
              <Text style={styles.addressName}>{customer.address_name}</Text>
            )}
            <Text style={styles.address}>{customer.address}</Text>
          </View>

          {customer.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notesText}>{customer.notes}</Text>
            </View>
          )}
        </View>

        {/* Sales History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales History ({sales.length})</Text>
          {sales.length > 0 ? (
            sales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={[styles.historyCard, sale.is_canceled && styles.canceledCard]}
                onPress={() => router.push(`/sales/${sale.id}`)}
              >
                <View style={styles.historyHeader}>
                  <Package size={16} color="#2563eb" />
                  <Text style={styles.historyDate}>{formatDate(sale.sale_date)}</Text>
                  <Text style={[
                    styles.historyPrice,
                    sale.is_canceled && styles.canceledPrice
                  ]}>
                    ₺{calculateTotalPrice(sale).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.historyPlatform}>{sale.platform.toUpperCase()}</Text>
                {sale.is_canceled && (
                  <Text style={styles.canceledLabel}>CANCELED</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No sales history</Text>
          )}
        </View>

        {/* Interview History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview History ({interviews.length})</Text>
          {interviews.length > 0 ? (
            interviews.map((interview) => (
              <TouchableOpacity
                key={interview.id}
                style={styles.historyCard}
                onPress={() => router.push(`/interviews/${interview.id}`)}
              >
                <View style={styles.historyHeader}>
                  <Phone size={16} color="#2563eb" />
                  <Text style={styles.historyDate}>{formatDate(interview.interview_date)}</Text>
                  <View style={[
                    styles.statusBadge,
                    interview.sale_succeeded ? styles.successBadge : styles.failBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      interview.sale_succeeded ? styles.successText : styles.failText
                    ]}>
                      {interview.sale_succeeded ? 'Success' : 'Failed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyOperator}>Operator: {interview.operator}</Text>
                {interview.products && (
                  <Text style={styles.historyCategory}>{interview.products.name}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No interview history</Text>
          )}
        </View>
      </ScrollView>

      {/* Half screen blank space at bottom */}
      <View style={styles.bottomSpacing} />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Customer</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete {customer.name} {customer.surname}? 
              This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteCustomer}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customerHeader: {
    marginBottom: 16,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  industryTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  industryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  contactInfo: {
    gap: 12,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#374151',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  address: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  canceledCard: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginLeft: 8,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  canceledPrice: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  historyPlatform: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  historyOperator: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  successBadge: {
    backgroundColor: '#d1fae5',
  },
  failBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: '#059669',
  },
  failText: {
    color: '#ef4444',
  },
  canceledLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});