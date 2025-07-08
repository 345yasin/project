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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard as Edit, Save, X, User, Package, Calendar, ShoppingCart, CircleAlert as AlertCircle, Plus, Minus, Search } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import CurrencyIcon, { formatPrice, convertPrice, getCurrencySymbol } from '@/components/CurrencyIcon';

type Sale = Database['public']['Tables']['sales']['Row'] & {
  customers?: { name: string; surname: string; city: string; town: string };
  interviews?: { operator: string; interview_date: string };
  sale_items?: Array<{
    id: number;
    quantity: number;
    unit_price: number;
    products?: { name: string; category: string | null; image_url: string | null };
  }>;
};

type Product = Database['public']['Tables']['products']['Row'];

interface SaleItem {
  id?: number;
  product_id: number;
  product_name: string;
  product_category: string | null;
  quantity: number;
  unit_price: number;
}

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editData, setEditData] = useState({
    platform: 'phone' as 'phone' | 'f2f' | 'trendyol' | 'hepsiburada' | 'n11',
    shipping_cost: 0,
    pay_method: '',
    is_canceled: false,
  });
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    if (id) {
      fetchSale();
      fetchProducts();
    }
  }, [id]);

  const fetchSale = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name, surname, city, town),
          interviews (operator, interview_date),
          sale_items (
            id,
            quantity,
            unit_price,
            products (name, category, image_url)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setSale(data);
      setEditData({
        platform: data.platform as any,
        shipping_cost: data.shipping_cost || 0,
        pay_method: data.pay_method || '',
        is_canceled: data.is_canceled || false,
      });

      // Convert sale items for editing
      if (data.sale_items) {
        const items = data.sale_items.map(item => ({
          id: item.id,
          product_id: item.products ? 0 : 0, // We'll need to get this from products table
          product_name: item.products?.name || 'Unknown Product',
          product_category: item.products?.category || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));
        setSaleItems(items);
      }
    } catch (error) {
      console.error('Error fetching sale:', error);
      Alert.alert('Error', 'Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
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
    setShowProductModal(false);
  };

  const updateSaleItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setSaleItems(prev => prev.filter((_, i) => i !== index));
    } else {
      setSaleItems(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const updateSaleItemPrice = (index: number, price: number) => {
    setSaleItems(prev => prev.map((item, i) =>
      i === index ? { ...item, unit_price: price } : item
    ));
  };

  const handleSaveEdit = async () => {
    try {
      // Update sale
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          platform: editData.platform,
          shipping_cost: editData.shipping_cost,
          pay_method: editData.pay_method || null,
          is_canceled: editData.is_canceled,
        })
        .eq('id', id);

      if (saleError) throw saleError;

      // Delete existing sale items
      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);

      if (deleteError) throw deleteError;

      // Insert new sale items
      if (saleItems.length > 0) {
        const saleItemsData = saleItems.map(item => ({
          sale_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) throw itemsError;
      }

      setSale(prev => prev ? {
        ...prev,
        platform: editData.platform,
        shipping_cost: editData.shipping_cost,
        pay_method: editData.pay_method,
        is_canceled: editData.is_canceled,
      } : null);

      setEditing(false);
      fetchSale(); // Refresh to get updated data
      Alert.alert('Success', 'Sale updated successfully');
    } catch (error) {
      console.error('Error updating sale:', error);
      Alert.alert('Error', 'Failed to update sale');
    }
  };

  const calculateTotal = () => {
    if (!sale?.sale_items) return 0;
    const itemsTotal = sale.sale_items.reduce((total, item) => {
      const convertedPrice = convertPrice(item.unit_price, item.products?.category);
      return total + (item.quantity * convertedPrice);
    }, 0);
    return itemsTotal + (sale.shipping_cost || 0);
  };

  const calculateEditTotal = () => {
    const itemsTotal = saleItems.reduce((total, item) => {
      const convertedPrice = convertPrice(item.unit_price, item.product_category);
      return total + (item.quantity * convertedPrice);
    }, 0);
    return itemsTotal + editData.shipping_cost;
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

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) ||
      (product.category && product.category.toLowerCase().includes(query));
  });

  if (loading || !sale) {
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
        <Text style={styles.title}>Sale Details</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditing(true)}
        >
          <Edit size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sale Status */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              sale.is_canceled ? styles.canceledBadge : styles.activeBadge
            ]}>
              {sale.is_canceled ? (
                <AlertCircle size={24} color="#ef4444" />
              ) : (
                <ShoppingCart size={24} color="#10b981" />
              )}
              <Text style={[
                styles.statusText,
                sale.is_canceled ? styles.canceledText : styles.activeText
              ]}>
                {sale.is_canceled ? 'Sale Canceled' : 'Sale Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <TouchableOpacity
            style={styles.customerCard}
            onPress={() => router.push(`/customers/${sale.customer_id}`)}
          >
            <View style={styles.customerHeader}>
              <User size={20} color="#2563eb" />
              <Text style={styles.customerName}>
                {sale.customers ? 
                  `${sale.customers.name} ${sale.customers.surname}` : 
                  'Unknown Customer'
                }
              </Text>
            </View>
            {sale.customers && (
              <Text style={styles.customerLocation}>
                {sale.customers.city}, {sale.customers.town}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sale Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Sale Date</Text>
              <Text style={styles.detailValue}>{formatDate(sale.sale_date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Package size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Platform</Text>
              <View style={[
                styles.platformTag,
                { backgroundColor: getPlatformColor(sale.platform) + '20' }
              ]}>
                <Text style={[
                  styles.platformText,
                  { color: getPlatformColor(sale.platform) }
                ]}>
                  {sale.platform.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {sale.pay_method && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Package size={20} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{sale.pay_method}</Text>
              </View>
            </View>
          )}

          {sale.interviews && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => router.push(`/interviews/${sale.interview_id}`)}
            >
              <View style={styles.detailIcon}>
                <Package size={20} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Related Interview</Text>
                <Text style={[styles.detailValue, styles.linkText]}>
                  {formatDate(sale.interviews.interview_date)} - {sale.interviews.operator}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Sale Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({sale.sale_items?.length || 0})</Text>
          {sale.sale_items && sale.sale_items.length > 0 ? (
            sale.sale_items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => router.push(`/products/${item.products?.name}`)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>
                    {item.products?.name || 'Unknown Product'}
                  </Text>
                  {item.products?.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{item.products.category}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <View style={styles.priceContainer}>
                    <CurrencyIcon category={item.products?.category} size={16} color="#6b7280" />
                    <Text style={styles.itemPrice}>
                      {getCurrencySymbol(item.products?.category)}{item.unit_price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.itemTotal}>
                      ₺{(item.quantity * convertPrice(item.unit_price, item.products?.category)).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No items</Text>
          )}

          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                ₺{(calculateTotal() - (sale.shipping_cost || 0)).toFixed(2)}
              </Text>
            </View>
            {sale.shipping_cost && sale.shipping_cost > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping:</Text>
                <Text style={styles.totalValue}>₺{sale.shipping_cost.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalLabel}>Total:</Text>
              <Text style={[
                styles.finalTotalValue,
                sale.is_canceled && styles.canceledPrice
              ]}>
                ₺{calculateTotal().toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
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
            <Text style={styles.modalTitle}>Edit Sale</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Save size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Platform</Text>
              <View style={styles.platformContainer}>
                {['phone', 'f2f', 'trendyol', 'hepsiburada', 'n11'].map((platform) => (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      editData.platform === platform && styles.selectedPlatformButton
                    ]}
                    onPress={() => setEditData(prev => ({ ...prev, platform: platform as any }))}
                  >
                    <Text style={[
                      styles.platformButtonText,
                      editData.platform === platform && styles.selectedPlatformButtonText
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
                value={editData.pay_method}
                onChangeText={(text) => setEditData(prev => ({ ...prev, pay_method: text }))}
                placeholder="e.g., Credit Card, Cash, Bank Transfer"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Cost (TRY)</Text>
              <TextInput
                style={styles.input}
                value={editData.shipping_cost.toString()}
                onChangeText={(text) => setEditData(prev => ({ ...prev, shipping_cost: parseFloat(text) || 0 }))}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Products</Text>
                <TouchableOpacity
                  style={styles.addProductButton}
                  onPress={() => setShowProductModal(true)}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addProductText}>Add</Text>
                </TouchableOpacity>
              </View>

              {saleItems.length > 0 ? (
                saleItems.map((item, index) => (
                  <View key={index} style={styles.editItemCard}>
                    <View style={styles.editItemHeader}>
                      <Text style={styles.editItemName}>{item.product_name}</Text>
                      {item.product_category && (
                        <View style={styles.categoryTag}>
                          <Text style={styles.categoryText}>{item.product_category}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.editItemControls}>
                      <View style={styles.quantityContainer}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateSaleItemQuantity(index, item.quantity - 1)}
                        >
                          <Minus size={16} color="#6b7280" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateSaleItemQuantity(index, item.quantity + 1)}
                        >
                          <Plus size={16} color="#6b7280" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.priceInputContainer}>
                        <CurrencyIcon category={item.product_category} size={16} color="#6b7280" />
                        <TextInput
                          style={styles.priceInput}
                          value={item.unit_price.toString()}
                          onChangeText={(text) => updateSaleItemPrice(index, parseFloat(text) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <Text style={styles.editItemTotal}>
                      Total: ₺{(item.quantity * convertPrice(item.unit_price, item.product_category)).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No products added</Text>
              )}

              <View style={styles.editTotalContainer}>
                <Text style={styles.editTotalLabel}>Total Amount:</Text>
                <Text style={styles.editTotalAmount}>₺{calculateEditTotal().toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sale Status</Text>
              <View style={styles.statusButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    !editData.is_canceled && styles.selectedActiveButton
                  ]}
                  onPress={() => setEditData(prev => ({ ...prev, is_canceled: false }))}
                >
                  <ShoppingCart size={20} color={!editData.is_canceled ? "#ffffff" : "#10b981"} />
                  <Text style={[
                    styles.statusButtonText,
                    !editData.is_canceled && styles.selectedActiveButtonText
                  ]}>
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    editData.is_canceled && styles.selectedCanceledButton
                  ]}
                  onPress={() => setEditData(prev => ({ ...prev, is_canceled: true }))}
                >
                  <AlertCircle size={20} color={editData.is_canceled ? "#ffffff" : "#ef4444"} />
                  <Text style={[
                    styles.statusButtonText,
                    editData.is_canceled && styles.selectedCanceledButtonText
                  ]}>
                    Canceled
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => addSaleItem(item)}
              >
                <View style={styles.productModalItem}>
                  <View style={styles.productModalInfo}>
                    <Text style={styles.productModalName}>{item.name}</Text>
                    {item.category && (
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceContainer}>
                    <CurrencyIcon category={item.category} size={16} color="#2563eb" />
                    <Text style={styles.productModalPrice}>
                      {formatPrice(item.price, item.category)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            style={styles.modalList}
          />
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
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  canceledBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeText: {
    color: '#10b981',
  },
  canceledText: {
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
  platformTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
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
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  finalTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  canceledPrice: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
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
  editItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  editItemControls: {
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  editItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'right',
  },
  editTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 16,
  },
  editTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  editTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  selectedActiveButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  selectedCanceledButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedActiveButtonText: {
    color: '#ffffff',
  },
  selectedCanceledButtonText: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  productModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productModalInfo: {
    flex: 1,
    marginRight: 12,
  },
  productModalName: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
  },
  productModalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
});