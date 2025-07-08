import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Package } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import CurrencyIcon, { formatPrice } from '@/components/CurrencyIcon';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  title?: string;
  selectedProducts?: Product[];
}

export default function ProductSelectionModal({
  visible,
  onClose,
  onSelect,
  title = "Select Product",
  selectedProducts = [],
}: ProductSelectionModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    if (visible) {
      fetchProducts();
    }
  }, [visible]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(query) ||
      (product.category && product.category.toLowerCase().includes(query)) ||
      product.price.toString().includes(query);
    
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortOrder) return 0;
    
    const priceA = a.category === 'Lazer Hastanesi' ? a.price : a.price * 40;
    const priceB = b.category === 'Lazer Hastanesi' ? b.price : b.price * 40;
    
    return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
  });

  // Get unique categories
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handleProductSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  const isProductSelected = (product: Product) => {
    return selectedProducts.some(p => p.id === product.id);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        isProductSelected(item) && styles.selectedProductCard
      ]}
      onPress={() => handleProductSelect(item)}
    >
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Package size={32} color="#6b7280" />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.category && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
        <View style={styles.priceContainer}>
          <CurrencyIcon category={item.category} size={16} color="#2563eb" />
          <Text style={styles.productPrice}>
            {formatPrice(item.price, item.category)}
          </Text>
        </View>
      </View>
      
      {isProductSelected(item) && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, category, or price..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                !categoryFilter && styles.selectedFilterButton
              ]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={[
                styles.filterButtonText,
                !categoryFilter && styles.selectedFilterButtonText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {uniqueCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  categoryFilter === category && styles.selectedFilterButton
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text style={[
                  styles.filterButtonText,
                  categoryFilter === category && styles.selectedFilterButtonText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by price:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === 'asc' && styles.selectedSortButton
              ]}
              onPress={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
            >
              <Text style={[
                styles.sortButtonText,
                sortOrder === 'asc' && styles.selectedSortButtonText
              ]}>
                Low to High
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === 'desc' && styles.selectedSortButton
              ]}
              onPress={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
            >
              <Text style={[
                styles.sortButtonText,
                sortOrder === 'desc' && styles.selectedSortButtonText
              ]}>
                High to Low
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={sortedProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
        />
      </SafeAreaView>
    </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  searchInputContainer: {
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedFilterButton: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedFilterButtonText: {
    color: '#ffffff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedSortButton: {
    backgroundColor: '#2563eb',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedSortButtonText: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '48%',
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
  selectedProductCard: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  categoryTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});