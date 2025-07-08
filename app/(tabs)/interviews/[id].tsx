import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard as Edit, Save, X, Phone, User, Package, Calendar, CircleCheck as CheckCircle, Circle as XCircle, Plus, Minus } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Interview = Database['public']['Tables']['interviews']['Row'] & {
  customers?: { name: string; surname: string; city: string; town: string };
  products?: { name: string; price: number; category: string | null };
  sales?: Array<{ id: string; sale_date: string; platform: string }>;
};

type Product = Database['public']['Tables']['products']['Row'];

interface DiscussedProduct {
  id: number;
  name: string;
  category: string | null;
  price: number;
}

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedProductId, addToDiscussed } = useLocalSearchParams<{
    selectedProductId?: string;
    addToDiscussed?: string;
  }>();
  
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [discussedProducts, setDiscussedProducts] = useState<DiscussedProduct[]>([]);
  const [editData, setEditData] = useState({
    operator: '',
    notes: '',
    sale_succeeded: false,
  });

  useEffect(() => {
    if (id) {
      fetchInterview();
    }
    if (selectedProductId && addToDiscussed === 'true') {
      fetchAndAddDiscussedProduct(selectedProductId);
    }
  }, [id, selectedProductId, addToDiscussed]);

  const fetchInterview = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          customers (name, surname, city, town),
          products (name, price, category),
          sales!sales_interview_id_fkey (id, sale_date, platform)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setInterview(data);
      setEditData({
        operator: data.operator,
        notes: data.notes || '',
        sale_succeeded: data.sale_succeeded || false,
      });

      // Initialize discussed products with the main product
      if (data.products) {
        setDiscussedProducts([{
          id: data.product_id!,
          name: data.products.name,
          category: data.products.category,
          price: data.products.price,
        }]);
      }
    } catch (error) {
      console.error('Error fetching interview:', error);
      Alert.alert('Error', 'Failed to load interview');
    } finally {
      setLoading(false);
    }
  };

  const fetchAndAddDiscussedProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      // Check if product is already in discussed products
      const exists = discussedProducts.find(p => p.id === data.id);
      if (!exists) {
        setDiscussedProducts(prev => [...prev, {
          id: data.id,
          name: data.name,
          category: data.category,
          price: data.price,
        }]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const canEdit = () => {
    if (!interview || !user) return false;
    // User can edit if they are admin or if they are the operator of this interview
    return user.role === 'admin' || interview.operator === user.full_name || interview.operator === user.email;
  };

  const removeDiscussedProduct = (productId: number) => {
    setDiscussedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleSaveEdit = async () => {
    try {
      const wasSuccessful = interview?.sale_succeeded;
      const nowSuccessful = editData.sale_succeeded;

      // Update interview with first discussed product (for backward compatibility)
      const firstProductId = discussedProducts.length > 0 ? discussedProducts[0].id : null;
      
      const { error } = await supabase
        .from('interviews')
        .update({
          operator: editData.operator,
          notes: editData.notes || null,
          sale_succeeded: editData.sale_succeeded,
          product_id: firstProductId,
        })
        .eq('id', id);

      if (error) throw error;

      // If sale result changed from failed to success, create a sale
      if (!wasSuccessful && nowSuccessful && interview && firstProductId) {
        await createSaleFromInterview();
      }

      setInterview(prev => prev ? {
        ...prev,
        operator: editData.operator,
        notes: editData.notes,
        sale_succeeded: editData.sale_succeeded,
        product_id: firstProductId,
      } : null);

      setEditing(false);
      fetchInterview(); // Refresh to get updated data including potential new sale
      Alert.alert('Success', 'Interview updated successfully');
    } catch (error) {
      console.error('Error updating interview:', error);
      Alert.alert('Error', 'Failed to update interview');
    }
  };

  const createSaleFromInterview = async () => {
    if (!interview || discussedProducts.length === 0) return;

    try {
      const firstProduct = discussedProducts[0];

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: interview.customer_id,
          interview_id: interview.id,
          sale_date: new Date().toISOString(),
          platform: 'phone', // Default platform
          shipping_cost: 0,
          pay_method: null,
          is_canceled: false,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale item with the first discussed product
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: saleData.id,
          product_id: firstProduct.id,
          quantity: 1,
          unit_price: firstProduct.price,
        });

      if (itemError) throw itemError;

      Alert.alert(
        'Sale Created', 
        'A sale record has been automatically created for this successful interview.',
        [
          { text: 'View Sale', onPress: () => router.push(`/sales/${saleData.id}`) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Warning', 'Interview updated but failed to create sale record');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !interview) {
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
        <Text style={styles.title}>Interview Details</Text>
        {canEdit() && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Edit size={20} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Interview Status */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              interview.sale_succeeded ? styles.successBadge : styles.failBadge
            ]}>
              {interview.sale_succeeded ? (
                <CheckCircle size={24} color="#10b981" />
              ) : (
                <XCircle size={24} color="#ef4444" />
              )}
              <Text style={[
                styles.statusText,
                interview.sale_succeeded ? styles.successText : styles.failText
              ]}>
                {interview.sale_succeeded ? 'Sale Successful' : 'Sale Failed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <TouchableOpacity
            style={styles.customerCard}
            onPress={() => router.push(`/customers/${interview.customer_id}`)}
          >
            <View style={styles.customerHeader}>
              <User size={20} color="#2563eb" />
              <Text style={styles.customerName}>
                {interview.customers ? 
                  `${interview.customers.name} ${interview.customers.surname}` : 
                  'Unknown Customer'
                }
              </Text>
            </View>
            {interview.customers && (
              <Text style={styles.customerLocation}>
                {interview.customers.city}, {interview.customers.town}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Interview Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Phone size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Operator</Text>
              <Text style={styles.detailValue}>{interview.operator}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Interview Date</Text>
              <Text style={styles.detailValue}>{formatDate(interview.interview_date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Package size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Products Discussed</Text>
              {discussedProducts.length > 0 ? (
                discussedProducts.map((product) => (
                  <View key={product.id} style={styles.discussedProductItem}>
                    <TouchableOpacity 
                      onPress={() => router.push(`/products/${product.id}`)}
                      style={styles.productLink}
                    >
                      <Text style={[styles.detailValue, styles.linkText]}>
                        {product.name}
                      </Text>
                      {product.category && (
                        <Text style={styles.productCategory}>{product.category}</Text>
                      )}
                      <Text style={styles.productPrice}>
                        ₺{product.category === 'Lazer Hastanesi' ? product.price.toFixed(2) : (product.price * 40).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.detailValue}>No products discussed</Text>
              )}
            </View>
          </View>

          {interview.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notesText}>{interview.notes}</Text>
            </View>
          )}
        </View>

        {/* Related Sales */}
        {interview.sales && interview.sales.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Sales</Text>
            {interview.sales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={styles.saleCard}
                onPress={() => router.push(`/sales/${sale.id}`)}
              >
                <View style={styles.saleHeader}>
                  <Text style={styles.saleDate}>{formatDate(sale.sale_date)}</Text>
                  <View style={styles.platformTag}>
                    <Text style={styles.platformText}>{sale.platform.toUpperCase()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editing}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Interview</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Save size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Operator</Text>
              <TextInput
                style={styles.input}
                value={editData.operator}
                onChangeText={(text) => setEditData(prev => ({ ...prev, operator: text }))}
                placeholder="Enter operator name"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Products Discussed</Text>
                <TouchableOpacity
                  style={styles.addProductButton}
                  onPress={() => router.push(`/products?selectMode=true&returnTo=interviews/${id}&addToDiscussed=true`)}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addProductText}>Add</Text>
                </TouchableOpacity>
              </View>

              {discussedProducts.length > 0 ? (
                discussedProducts.map((product) => (
                  <View key={product.id} style={styles.discussedProductCard}>
                    <View style={styles.discussedProductHeader}>
                      <Text style={styles.discussedProductName}>{product.name}</Text>
                      {product.category && (
                        <View style={styles.categoryTag}>
                          <Text style={styles.categoryText}>{product.category}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeProductButton}
                        onPress={() => removeDiscussedProduct(product.id)}
                      >
                        <Minus size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.discussedProductPrice}>
                      ₺{product.category === 'Lazer Hastanesi' ? product.price.toFixed(2) : (product.price * 40).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No products discussed</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sale Result</Text>
              <View style={styles.resultContainer}>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    !editData.sale_succeeded && styles.selectedFailButton
                  ]}
                  onPress={() => setEditData(prev => ({ ...prev, sale_succeeded: false }))}
                >
                  <Text style={[
                    styles.resultButtonText,
                    !editData.sale_succeeded && styles.selectedFailButtonText
                  ]}>
                    Failed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    editData.sale_succeeded && styles.selectedSuccessButton
                  ]}
                  onPress={() => setEditData(prev => ({ ...prev, sale_succeeded: true }))}
                >
                  <Text style={[
                    styles.resultButtonText,
                    editData.sale_succeeded && styles.selectedSuccessButtonText
                  ]}>
                    Success
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editData.notes}
                onChangeText={(text) => setEditData(prev => ({ ...prev, notes: text }))}
                placeholder="Enter interview notes"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
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
  editButton: {
    backgroundColor: '#dbeafe',
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
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  successBadge: {
    backgroundColor: '#d1fae5',
  },
  failBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  successText: {
    color: '#10b981',
  },
  failText: {
    color: '#ef4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  customerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  customerLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  discussedProductItem: {
    marginBottom: 12,
  },
  productLink: {
    padding: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 8,
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
  saleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  platformTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addProductText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  discussedProductCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  discussedProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  discussedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  categoryTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  removeProductButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 6,
    marginLeft: 8,
  },
  discussedProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  resultContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectedFailButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  selectedSuccessButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedFailButtonText: {
    color: '#ffffff',
  },
  selectedSuccessButtonText: {
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});