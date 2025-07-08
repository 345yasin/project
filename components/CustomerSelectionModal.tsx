import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, User, Plus, MapPin, Phone, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  title?: string;
}

interface NewCustomerData {
  name: string;
  surname: string;
  phone_numbers: string[];
  city: string;
  town: string;
  address: string;
  email: string;
}

export default function CustomerSelectionModal({
  visible,
  onClose,
  onSelect,
  title = "Select Customer",
}: CustomerSelectionModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    name: '',
    surname: '',
    phone_numbers: [''],
    city: '',
    town: '',
    address: '',
    email: '',
  });

  useEffect(() => {
    if (visible) {
      fetchCustomers();
    }
  }, [visible]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return customer.name.toLowerCase().includes(query) ||
      customer.surname.toLowerCase().includes(query) ||
      customer.city.toLowerCase().includes(query) ||
      customer.town.toLowerCase().includes(query) ||
      (customer.industry && customer.industry.toLowerCase().includes(query)) ||
      (customer.email && customer.email.toLowerCase().includes(query)) ||
      (customer.address && customer.address.toLowerCase().includes(query)) ||
      (customer.phone_numbers && customer.phone_numbers.some(phone => 
        phone.toLowerCase().includes(query)
      ));
  });

  const handleCustomerSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.surname || !newCustomerData.city || !newCustomerData.town || !newCustomerData.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const phoneNumbers = newCustomerData.phone_numbers.filter(phone => phone.trim() !== '');
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomerData.name,
          surname: newCustomerData.surname,
          phone_numbers: phoneNumbers.length > 0 ? phoneNumbers : null,
          city: newCustomerData.city,
          town: newCustomerData.town,
          address: newCustomerData.address,
          email: newCustomerData.email || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to customers list and select
      setCustomers(prev => [data, ...prev]);
      handleCustomerSelect(data);
      
      // Reset form
      setNewCustomerData({
        name: '',
        surname: '',
        phone_numbers: [''],
        city: '',
        town: '',
        address: '',
        email: '',
      });
      setShowNewCustomerForm(false);

      Alert.alert('Success', 'Customer created successfully!');
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Failed to create customer');
    }
  };

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
          <View style={styles.customerDetails}>
            <MapPin size={14} color="#6b7280" />
            <Text style={styles.customerLocation}>
              {item.city}, {item.town}
            </Text>
          </View>
          {item.phone_numbers && item.phone_numbers.length > 0 && (
            <View style={styles.customerDetails}>
              <Phone size={14} color="#6b7280" />
              <Text style={styles.customerPhone}>{item.phone_numbers[0]}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.customerDetails}>
              <Mail size={14} color="#6b7280" />
              <Text style={styles.customerEmail}>{item.email}</Text>
            </View>
          )}
          {item.industry && (
            <View style={styles.industryTag}>
              <Text style={styles.industryText}>{item.industry}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showNewCustomerForm) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowNewCustomerForm(false)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Customer</Text>
            <TouchableOpacity onPress={handleCreateNewCustomer}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.name}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, name: text }))}
                placeholder="Enter customer name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Surname *</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.surname}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, surname: text }))}
                placeholder="Enter customer surname"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.phone_numbers[0]}
                onChangeText={(text) => setNewCustomerData(prev => ({ 
                  ...prev, 
                  phone_numbers: [text] 
                }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.city}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, city: text }))}
                placeholder="Enter city"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Town *</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.town}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, town: text }))}
                placeholder="Enter town"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newCustomerData.address}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, address: text }))}
                placeholder="Enter full address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={newCustomerData.email}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

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
              placeholder="Search by name, phone, email, address, city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowNewCustomerForm(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  backText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  saveText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  addButton: {
    backgroundColor: '#2563eb',
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
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customerAvatar: {
    backgroundColor: '#dbeafe',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  customerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  industryTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  industryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  formContainer: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
});