import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Package, ArrowUpDown, ArrowLeft, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import FilterModal from '@/components/FilterModal';
import CurrencyIcon, { formatPrice, convertPrice } from '@/components/CurrencyIcon';
import { useRouter, useLocalSearchParams } from 'expo-router';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductsScreen() {
  const router = useRouter();
  const { selectMode, returnTo, addToSale } = useLocalSearchParams<{
    selectMode?: string;
    returnTo?: string;
    addToSale?: string;
  }>();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [filters, setFilters] = useState({
    category: null,
    priceRange: { min: null, max: null },
  });

  const isSelectMode = selectMode === 'true';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const limit = 1000;
      const allProducts: Product[] = [];

      let from = 0;
      let to = limit - 1;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .range(from, to)
          .order('name', { ascending: true });

        if (error) throw error;

        if (data) {
          allProducts.push(...data);
          from += limit;
          to += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }

      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching all products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const sortProductsByPrice = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      const priceA = convertPrice(a.price, a.category);
      const priceB = convertPrice(b.price, b.category);
      
      return newSortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });
    
    setProducts(sortedProducts);
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(query) ||
      (product.category && product.category.toLowerCase().includes(query)) ||
      product.price.toString().includes(query);
    
    const matchesCategory = !filters.category || product.category === filters.category;
    
    const convertedPrice = convertPrice(product.price, product.category);
    const matchesPriceRange = (!filters.priceRange.min || convertedPrice >= filters.priceRange.min) &&
      (!filters.priceRange.max || convertedPrice <= filters.priceRange.max);
    
    return matchesSearch && matchesCategory && matchesPriceRange;
  });

  // Get unique categories for filters
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  const filterConfig = [
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      options: categories.map(cat => ({ label: cat.name, value: cat.name })),
    },
    {
      key: 'priceRange',
      label: 'Price Range (TRY)',
      type: 'priceRange' as const,
    },
  ];

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleProductSelect = (product: Product) => {
    if (isSelectMode && returnTo) {
      if (addToSale === 'true') {
        router.push(`/${returnTo}?selectedProductId=${product.id}&addToSale=true`);
      } else if (returnTo.includes('addToDiscussed=true')) {
        router.push(`/${returnTo}&selectedProductId=${product.id}`);
      } else {
        router.push(`/${returnTo}?selectedProductId=${product.id}`);
      }
    } else {
      router.push(`/products/${product.id}`);
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
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
        <Text style={styles.productName}>{item.name}</Text>
        {item.category && (
          <Text style={styles.productCategory}>{item.category}</Text>
        )}
        <View style={styles.priceContainer}>
          <CurrencyIcon category={item.category} size={16} color="#2563eb" />
          <Text style={styles.productPrice}>
            {formatPrice(item.price, item.category)}
          </Text>
        </View>
      </View>

      {isSelectMode && (
        <View style={styles.selectIndicator}>
          <Check size={16} color="#2563eb" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {isSelectMode && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {isSelectMode ? 'Select Product' : `Products (${filteredProducts.length})`}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={sortProductsByPrice}
          >
            <ArrowUpDown size={20} color="#6b7280" />
            <Text style={styles.sortButtonText}>
              {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, category, price..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Products"
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
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