import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Minus, User, Package, Calendar } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import DatePicker from '@/components/DatePicker';

type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface SaleItem {
  product_id: number;
  product_name: string;
  product_category: string | null;
  quantity: number;
  unit_price: number;
}

interface DiscussedProduct {
  id: number;
  name: string;
  category: string | null;
  price: number;
}

export default function NewInterviewScreen() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { selectedCustomerId, selectedProductId, addToDiscussed } = useLocalSearchParams<{
    selectedCustomerId?: string;
    selectedProductId?: string;
    addToDiscussed?: string;
  }>();
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [formData, setFormData] = useState({
    customer_id: selectedCustomerId || '',
    operator: user?.full_name || '',
    notes: '',
    sale_succeeded: false,
    interview_date: new Date(),
  });

  // Sale form data (shown when sale_succeeded is true)
  const [saleData, setSaleData] = useState({
    platform: 'phone' as 'phone' | 'f2f' | 'trendyol' | 'hepsiburada' | 'n11',
    shipping_cost: 0,
    pay_method: '',
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discussedProducts, setDiscussedProducts] = useState<DiscussedProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchUsers();
    if (selectedCustomerId) {
      fetchCustomer(selectedCustomerId);
    }
    if (selectedProductId && addToDiscussed === 'true') {
      fetchAndAddDiscussedProduct(selectedProductId);
    } else if (selectedProductId) {
      fetchAndAddSaleProduct(selectedProductId);
    }
  }, [selectedCustomerId, selectedProductId, addToDiscussed]);

  const fetchUsers = async () => {
    if (isAdmin) {
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('full_name', { ascending: true });

        if (usersError) throw usersError;
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
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

  const fetchAndAddSaleProduct = async (productId: string) => {
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
      'Leave Interview Form',
      'Are you sure you want to leave? Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => {
          router.push('/customers?selectMode=true&returnTo=interviews/new');
        }}
      ]
    );
  };

  const removeDiscussedProduct = (productId: number) => {
    setDiscussedProducts(prev => prev.filter(p => p.id !== productId));
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
    return itemsTotal + saleData.shipping_cost;
  };

  const handleSave = async () => {
    if (!formData.customer_id || !formData.operator) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.sale_succeeded && saleItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product for the sale');
      return;
    }

    setLoading(true);
    try {
      // Create interview with first discussed product (for backward compatibility)
      const firstProductId = discussedProducts.length > 0 ? discussedProducts[0].id : null;
      
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          customer_id: formData.customer_id,
          operator: formData.operator,
          notes: formData.notes || null,
          sale_succeeded: formData.sale_succeeded,
          interview_date: formData.interview_date.toISOString(),
          product_id: firstProductId,
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      // If sale succeeded, create sale record
      if (formData.sale_succeeded && saleItems.length > 0) {
        const { data: saleDataResult, error: saleError } = await supabase
          .from('sales')
          .insert({
            customer_id: formData.customer_id,
            interview_id: interviewData.id,
            sale_date: formData.interview_date.toISOString(),
            platform: saleData.platform,
            shipping_cost: saleData.shipping_cost,
            pay_method: saleData.pay_method || null,
            is_canceled: false,
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Create sale items
        const saleItemsData = saleItems.map(item => ({
          sale_id: saleDataResult.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) throw itemsError;
      }

      Alert.alert('Success', 'Interview created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating interview:', error);
      Alert.alert('Error', 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Discard Interview',
              'Are you sure you want to discard this interview? All changes will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() }
              ]
            );
          }}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>New Interview</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Information</Text>
          
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
            <Text style={styles.label}>Operator *</Text>
            {isAdmin ? (
              <View style={styles.operatorContainer}>
                {users.map((userProfile) => (
                  <TouchableOpacity
                    key={userProfile.id}
                    style={[
                      styles.operatorButton,
                      formData.operator === (userProfile.full_name || userProfile.email) && styles.selectedOperatorButton
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, operator: userProfile.full_name || userProfile.email }))}
                  >
                    <Text style={[
                      styles.operatorButtonText,
                      formData.operator === (userProfile.full_name || userProfile.email) && styles.selectedOperatorButtonText
                    ]}>
                      {userProfile.full_name || userProfile.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.operator}
                editable={false}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interview Date</Text>
            <DatePicker
              value={formData.interview_date}
              onChange={(date) => setFormData(prev => ({ ...prev, interview_date: date }))}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Products Discussed</Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push('/products?selectMode=true&returnTo=interviews/new&addToDiscussed=true')}
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
                  !formData.sale_succeeded && styles.selectedResultButton
                ]}
                onPress={() => setFormData(prev => ({ ...prev, sale_succeeded: false }))}
              >
                <Text style={[
                  styles.resultButtonText,
                  !formData.sale_succeeded && styles.selectedResultButtonText
                ]}>
                  Failed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.resultButton,
                  formData.sale_succeeded && styles.selectedSuccessButton
                ]}
                onPress={() => setFormData(prev => ({ ...prev, sale_succeeded: true }))}
              >
                <Text style={[
                  styles.resultButtonText,
                  formData.sale_succeeded && styles.selectedSuccessButtonText
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
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Enter interview notes"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Sale Information Panel - Only shown when sale succeeded */}
        {formData.sale_succeeded && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sale Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Platform *</Text>
              <View style={styles.platformContainer}>
                {['phone', 'f2f', 'trendyol', 'hepsiburada', 'n11'].map((platform) => (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      saleData.platform === platform && styles.selectedPlatformButton
                    ]}
                    onPress={() => setSaleData(prev => ({ ...prev, platform: platform as any }))}
                  >
                    <Text style={[
                      styles.platformButtonText,
                      saleData.platform === platform && styles.selectedPlatformButtonText
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
                value={saleData.pay_method}
                onChangeText={(text) => setSaleData(prev => ({ ...prev, pay_method: text }))}
                placeholder="e.g., Credit Card, Cash, Bank Transfer"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Cost (TRY)</Text>
              <TextInput
                style={styles.input}
                value={saleData.shipping_cost.toString()}
                onChangeText={(text) => setSaleData(prev => ({ ...prev, shipping_cost: parseFloat(text) || 0 }))}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Products *</Text>
                <TouchableOpacity
                  style={styles.addProductButton}
                  onPress={() => router.push('/products?selectMode=true&returnTo=interviews/new&addToSale=true')}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addProductText}>Add Product</Text>
                </TouchableOpacity>
              </View>

              {saleItems.length > 0 ? (
                saleItems.map((item) => (
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

              {saleItems.length > 0 && (
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>₺{calculateTotal().toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Creating...' : 'Create Interview'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
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
  disabledInput: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  operatorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  operatorButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedOperatorButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  operatorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedOperatorButtonText: {
    color: '#ffffff',
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
  selectedResultButton: {
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
  selectedResultButtonText: {
    color: '#ffffff',
  },
  selectedSuccessButtonText: {
    color: '#ffffff',
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