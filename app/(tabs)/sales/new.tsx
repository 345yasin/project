import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Minus, User, Package, Calendar } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import DatePicker from '@/components/DatePicker';

type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'] & {
  customers?: { name: string; surname: string };
};

interface SaleItem {
  product_id: number;
  product_name: string;
  product_category: string | null;
  quantity: number;
  unit_price: number;
}

export default function NewSaleScreen() {
  const router = useRouter();
  const { selectedCustomerId, selectedProductId, addToSale } = useLocalSearchParams<{
    selectedCustomerId?: string;
    selectedProductId?: string;
    addToSale?: string;
  }>();
  
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  
  const [formData, setFormData] = useState({
    customer_id: selectedCustomerId || '',
    interview_id: '',
    sale_date: new Date(),
    platform: 'phone' as 'phone' | 'f2f' | 'trendyol' | 'hepsiburada' | 'n11',
    shipping_cost: 0,
    pay_method: '',
    is_canceled: false,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    fetchInterviews();
    if (selectedCustomerId) {
      fetchCustomer(selectedCustomerId);
    }
    if (selectedProductId && addToSale === 'true') {
      fetchAndAddProduct(selectedProductId);
    }
  }, [selectedCustomerId, selectedProductId, addToSale]);

  useEffect(() => {
    if (formData.customer_id) {
      const customerInterviews = interviews.filter(interview => 
        interview.customer_id === formData.customer_id
      );
      setFilteredInterviews(customerInterviews);
    } else {
      setFilteredInterviews([]);
    }
  }, [formData.customer_id, interviews]);

  const fetchInterviews = async () => {
    try {
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          customers (name, surname)
        `)
        .order('interview_date', { ascending: false });

      if (interviewsError) throw interviewsError;
      setInterviews(interviewsData || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setSelectedCustomer(data);
      setFormData(prev => ({ ...prev, customer_id: customerId }));
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const fetchAndAddProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      addSaleItem(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleCustomerSelect = () => {
    Alert.alert(
      'Leave Sale Form',
      'Are you sure you want to leave? Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => {
          router.push('/customers?selectMode=true&returnTo=sales/new');
        }}
      ]
    );
  };

  const handleInterviewSelect = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormData(prev => ({ ...prev, interview_id: interview.id }));
  };

  const addSaleItem = (product: Product) => {
    const existingItem = saleItems.find(item => item.product_id === product.id);
    if (existingItem) {
      setSaleItems(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setSaleItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        quantity: 1,
        unit_price: product.price,
      }]);
    }
  };

  const updateSaleItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setSaleItems(prev => prev.filter(item => item.product_id !== productId));
    } else {
      setSaleItems(prev => prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const updateSaleItemPrice = (productId: number, price: number) => {
    setSaleItems(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, unit_price: price }
        : item
    ));
  };

  const calculateTotal = () => {
    const itemsTotal = saleItems.reduce((total, item) => {
      const convertedPrice = item.product_category === 'Lazer Hastanesi' ? item.unit_price : item.unit_price * 40;
      return total + (item.quantity * convertedPrice);
    }, 0);
    return itemsTotal + formData.shipping_cost;
  };

  const handleSave = async () => {
    if (!formData.customer_id || saleItems.length === 0) {
      Alert.alert('Error', 'Please select a customer and add at least one product');
      return;
    }

    setLoading(true);
    try {
      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: formData.customer_id,
          interview_id: formData.interview_id || null,
          sale_date: formData.sale_date.toISOString(),
          platform: formData.platform,
          shipping_cost: formData.shipping_cost,
          pay_method: formData.pay_method || null,
          is_canceled: formData.is_canceled,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = saleItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      Alert.alert('Success', 'Sale created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>New Sale</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sale Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer *</Text>
              <TouchableOpacity
                style={styles.selectionButton}
                onPress={handleCustomerSelect}
              >
                <User size={20} color="#6b7280" />
                <Text style={[
                  styles.selectionButtonText,
                  !selectedCustomer && styles.placeholderText
                ]}>
                  {selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.surname}` : "Select customer"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Related Interview</Text>
              <View style={styles.interviewContainer}>
                {filteredInterviews.length > 0 ? (
                  filteredInterviews.map((interview) => (
                    <TouchableOpacity
                      key={interview.id}
                      style={[
                        styles.interviewButton,
                        selectedInterview?.id === interview.id && styles.selectedInterviewButton
                      ]}
                      onPress={() => handleInterviewSelect(interview)}
                    >
                      <Text style={[
                        styles.interviewButtonText,
                        selectedInterview?.id === interview.id && styles.selectedInterviewButtonText
                      ]}>
                        {new Date(interview.interview_date || '').toLocaleDateString('tr-TR')} - {interview.operator}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noInterviewsText}>
                    {formData.customer_id ? 'No interviews found for this customer' : 'Select a customer first'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sale Date</Text>
              <DatePicker
                value={formData.sale_date}
                onChange={(date) => setFormData(prev => ({ ...prev, sale_date: date }))}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Platform *</Text>
              <View style={styles.platformContainer}>
                {['phone', 'f2f', 'trendyol', 'hepsiburada', 'n11'].map((platform) => (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      formData.platform === platform && styles.selectedPlatformButton
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, platform: platform as any }))}
                  >
                    <Text style={[
                      styles.platformButtonText,
                      formData.platform === platform && styles.selectedPlatformButtonText
                    ]}>
                      {platform.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <TextInput
                style={styles.input}
                value={formData.pay_method}
                onChangeText={(text) => setFormData(prev => ({ ...prev, pay_method: text }))}
                placeholder="e.g., Credit Card, Cash, Bank Transfer"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Cost (TRY)</Text>
              <TextInput
                style={styles.input}
                value={formData.shipping_cost.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, shipping_cost: parseFloat(text) || 0 }))}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push('/products?selectMode=true&returnTo=sales/new&addToSale=true')}
              >
                <Plus size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {saleItems.length > 0 ? (
              saleItems.map((item, index) => (
                <View key={item.product_id} style={styles.saleItemCard}>
                  <View style={styles.saleItemHeader}>
                    <Text style={styles.saleItemName}>{item.product_name}</Text>
                    {item.product_category && (
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryText}>{item.product_category}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.saleItemControls}>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateSaleItemQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus size={16} color="#6b7280" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateSaleItemQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.priceInput}
                      value={item.unit_price.toString()}
                      onChangeText={(text) => updateSaleItemPrice(item.product_id, parseFloat(text) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.saleItemTotal}>
                    Total: ₺{(item.quantity * (item.product_category === 'Lazer Hastanesi' ? item.unit_price : item.unit_price * 40)).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No products added</Text>
            )}

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₺{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Creating...' : 'Create Sale'}
            </Text>
          </TouchableOpacity>
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
  placeholder: {
    width: 32,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addProductButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 8,
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
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  interviewContainer: {
    gap: 8,
  },
  interviewButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedInterviewButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  interviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedInterviewButtonText: {
    color: '#ffffff',
  },
  noInterviewsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  platformContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedPlatformButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  platformButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedPlatformButtonText: {
    color: '#ffffff',
  },
  saleItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  saleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleItemName: {
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
  saleItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 30,
    textAlign: 'center',
  },
  priceInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1f2937',
    width: 100,
    textAlign: 'right',
  },
  saleItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});