import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Filter } from 'lucide-react-native';
import DatePicker from '@/components/DatePicker';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  filters: any;
  onFiltersChange: (filters: any) => void;
  filterConfig: FilterConfig[];
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'dateRange' | 'text' | 'multiSelect' | 'priceRange';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
}

export default function FilterModal({
  visible,
  onClose,
  title,
  filters,
  onFiltersChange,
  filterConfig,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {};
    filterConfig.forEach(config => {
      if (config.type === 'dateRange') {
        resetFilters[config.key] = { start: null, end: null };
      } else if (config.type === 'priceRange') {
        resetFilters[config.key] = { min: null, max: null };
      } else if (config.type === 'multiSelect') {
        resetFilters[config.key] = [];
      } else {
        resetFilters[config.key] = null;
      }
    });
    setLocalFilters(resetFilters);
  };

  const renderFilter = (config: FilterConfig) => {
    const value = localFilters[config.key];

    switch (config.type) {
      case 'select':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  value === null && styles.selectedOption
                ]}
                onPress={() => handleFilterChange(config.key, null)}
              >
                <Text style={[
                  styles.optionText,
                  value === null && styles.selectedOptionText
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {config.options?.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    value === option.value && styles.selectedOption
                  ]}
                  onPress={() => handleFilterChange(config.key, option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    value === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'multiSelect':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <View style={styles.optionsContainer}>
              {config.options?.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    value?.includes(option.value) && styles.selectedOption
                  ]}
                  onPress={() => {
                    const currentValues = value || [];
                    const newValues = currentValues.includes(option.value)
                      ? currentValues.filter(v => v !== option.value)
                      : [...currentValues, option.value];
                    handleFilterChange(config.key, newValues);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    value?.includes(option.value) && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'date':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <DatePicker
              value={value || new Date()}
              onChange={(date) => handleFilterChange(config.key, date)}
              style={styles.datePicker}
            />
            {value && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleFilterChange(config.key, null)}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'dateRange':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>From</Text>
                <DatePicker
                  value={value?.start || new Date()}
                  onChange={(date) => handleFilterChange(config.key, { ...value, start: date })}
                  style={styles.datePicker}
                />
              </View>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>To</Text>
                <DatePicker
                  value={value?.end || new Date()}
                  onChange={(date) => handleFilterChange(config.key, { ...value, end: date })}
                  style={styles.datePicker}
                />
              </View>
            </View>
            {(value?.start || value?.end) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleFilterChange(config.key, { start: null, end: null })}
              >
                <Text style={styles.clearButtonText}>Clear Date Range</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'priceRange':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceRangeItem}>
                <Text style={styles.priceRangeLabel}>Min Price</Text>
                <TextInput
                  style={styles.priceInput}
                  value={value?.min?.toString() || ''}
                  onChangeText={(text) => handleFilterChange(config.key, { ...value, min: parseFloat(text) || null })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceRangeItem}>
                <Text style={styles.priceRangeLabel}>Max Price</Text>
                <TextInput
                  style={styles.priceInput}
                  value={value?.max?.toString() || ''}
                  onChangeText={(text) => handleFilterChange(config.key, { ...value, max: parseFloat(text) || null })}
                  placeholder="∞"
                  keyboardType="numeric"
                />
              </View>
            </View>
            {(value?.min || value?.max) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleFilterChange(config.key, { min: null, max: null })}
              >
                <Text style={styles.clearButtonText}>Clear Price Range</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'text':
        return (
          <View style={styles.filterGroup} key={config.key}>
            <Text style={styles.filterLabel}>{config.label}</Text>
            <TextInput
              style={styles.textInput}
              value={value || ''}
              onChangeText={(text) => handleFilterChange(config.key, text)}
              placeholder={config.placeholder}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filterConfig.map(renderFilter)}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  resetText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  datePicker: {
    marginBottom: 8,
  },
  dateRangeContainer: {
    gap: 16,
  },
  dateRangeItem: {
    gap: 8,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceRangeItem: {
    flex: 1,
    gap: 8,
  },
  priceRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priceInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});