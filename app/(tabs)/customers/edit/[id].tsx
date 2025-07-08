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
import { ArrowLeft, Plus, Minus, Save } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { SearchableInput } from '@/components/SearchableModal';

type Customer = Database['public']['Tables']['customers']['Row'];

interface City {
  id: number;
  name: string;
}

interface Town {
  id: number;
  city_id: number;
  name: string;
}

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone_numbers: [''],
    industry: '',
    city: '',
    town: '',
    address_name: '',
    address: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchCities();
    }
  }, [id]);

  useEffect(() => {
    if (selectedCityId) {
      fetchTowns(selectedCityId);
    }
  }, [selectedCityId]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setCustomer(data);
      setFormData({
        name: data.name,
        surname: data.surname,
        phone_numbers: data.phone_numbers || [''],
        industry: data.industry || '',
        city: data.city,
        town: data.town,
        address_name: data.address_name || '',
        address: data.address,
        email: data.email || '',
        notes: data.notes || '',
      });

      // Find city ID for the customer's city
      const cityData = await supabase
        .from('turkey_cities')
        .select('id')
        .eq('name', data.city)
        .single();
      
      if (cityData.data) {
        setSelectedCityId(cityData.data.id);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      Alert.alert('Error', 'Failed to load customer data');
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('turkey_cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchTowns = async (cityId: number) => {
    try {
      const { data, error } = await supabase
        .from('turkey_towns')
        .select('*')
        .eq('city_id', cityId)
        .order('name', { ascending: true });

      if (error) throw error;
      setTowns(data || []);
    } catch (error) {
      console.error('Error fetching towns:', error);
    }
  };

  const handleCitySelect = (city: City) => {
    setFormData(prev => ({ ...prev, city: city.name || '', town: '' }));
    setSelectedCityId(city.id);
  };

  const handleTownSelect = (town: Town) => {
    setFormData(prev => ({ ...prev, town: town.name || '' }));
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: [...prev.phone_numbers, '']
    }));
  };

  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((_, i) => i !== index)
    }));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.map((phone, i) => 
        i === index ? value : phone
      )
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.surname || !formData.city || !formData.town || !formData.address) {
      Alert.alert('Error', 'Please fill in all required fields (marked with *)');
      return;
    }

    setLoading(true);
    try {
      const phoneNumbers = formData.phone_numbers.filter(phone => phone.trim() !== '');
      
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          surname: formData.surname,
          phone_numbers: phoneNumbers.length > 0 ? phoneNumbers : null,
          industry: formData.industry || null,
          city: formData.city,
          town: formData.town,
          address_name: formData.address_name || null,
          address: formData.address,
          email: formData.email || null,
          notes: formData.notes || null,
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Customer updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert('Error', 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) {
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
          onPress={() => {
            Alert.alert(
              'Discard Changes',
              'Are you sure you want to discard your changes?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() }
              ]
            );
          }}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Customer</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter customer name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Surname *</Text>
            <TextInput
              style={styles.input}
              value={formData.surname}
              onChangeText={(text) => setFormData(prev => ({ ...prev, surname: text }))}
              placeholder="Enter customer surname"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Numbers</Text>
            {formData.phone_numbers.map((phone, index) => (
              <View key={index} style={styles.phoneInputContainer}>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={(text) => updatePhoneNumber(index, text)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
                {formData.phone_numbers.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoneNumber(index)}
                  >
                    <Minus size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addPhoneButton} onPress={addPhoneNumber}>
              <Plus size={20} color="#2563eb" />
              <Text style={styles.addPhoneText}>Add Phone Number</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Industry</Text>
            <TextInput
              style={styles.input}
              value={formData.industry}
              onChangeText={(text) => setFormData(prev => ({ ...prev, industry: text }))}
              placeholder="Enter industry"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <SearchableInput
              data={cities}
              onSelect={handleCitySelect}
              renderItem={(city) => (
                <View style={styles.locationItem}>
                  <Text style={styles.locationName}>{city.name}</Text>
                </View>
              )}
              searchKey={(city) => city.name || ''}
              placeholder={formData.city || "Select city"}
              title="Select City"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Town *</Text>
            <SearchableInput
              data={towns}
              onSelect={handleTownSelect}
              renderItem={(town) => (
                <View style={styles.locationItem}>
                  <Text style={styles.locationName}>{town.name}</Text>
                </View>
              )}
              searchKey={(town) => town.name || ''}
              placeholder={formData.town || "Select town"}
              title="Select Town"
              style={[styles.input, !formData.city && styles.disabledInput]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Name</Text>
            <TextInput
              style={styles.input}
              value={formData.address_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address_name: text }))}
              placeholder="e.g., Home, Office"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Enter full address"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Enter any additional notes"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
            }
  )
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
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneInput: {
    flex: 1,
    marginRight: 12,
  },
  removeButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
  },
  addPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  addPhoneText: {
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  locationItem: {
    paddingVertical: 4,
  },
  locationName: {
    fontSize: 16,
    color: '#1f2937',
  },
});