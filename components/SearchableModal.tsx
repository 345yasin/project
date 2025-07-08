import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, ChevronDown, List } from 'lucide-react-native';

interface SearchableModalProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: T[];
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  searchKey: string | ((item: T) => string);
  placeholder?: string;
  selectedValue?: string;
  onInputChange?: (text: string) => void;
  showSearchIcon?: boolean;
}

export default function SearchableModal<T>({
  visible,
  onClose,
  title,
  data,
  onSelect,
  renderItem,
  searchKey,
  placeholder = "Search...",
  selectedValue,
  onInputChange,
  showSearchIcon = true,
}: SearchableModalProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<T[]>(data);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item => {
        const searchValue = typeof searchKey === 'function' 
          ? searchKey(item) 
          : (item as any)[searchKey];
        return searchValue?.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredData(filtered);
    }
  }, [searchQuery, data, searchKey]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onInputChange?.(text);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          {showSearchIcon && <Search size={20} color="#6b7280" />}
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>

        <FlatList
          data={filteredData}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              {renderItem(item)}
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
        />
      </SafeAreaView>
    </Modal>
  );
}

// Searchable Input Component with both text input and list selection
interface SearchableInputProps<T> {
  data: T[];
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  searchKey: string | ((item: T) => string);
  placeholder?: string;
  value?: string;
  title: string;
  style?: any;
  allowTextInput?: boolean; // New prop to allow typing
  onTextChange?: (text: string) => void; // Callback for text changes
}

export function SearchableInput<T>({
  data,
  onSelect,
  renderItem,
  searchKey,
  placeholder = "Select...",
  value,
  title,
  style,
  allowTextInput = false,
  onTextChange,
}: SearchableInputProps<T>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleTextChange = (text: string) => {
    setInputValue(text);
    onTextChange?.(text);
  };

  if (allowTextInput) {
    return (
      <View style={[styles.inputContainer, style]}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
        />
        <TouchableOpacity
          style={styles.listButton}
          onPress={() => setModalVisible(true)}
        >
          <List size={20} color="#6b7280" />
        </TouchableOpacity>

        <SearchableModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={title}
          data={data}
          onSelect={(item) => {
            onSelect(item);
            setModalVisible(false);
          }}
          renderItem={renderItem}
          searchKey={searchKey}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.inputContainer, style]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>

      <SearchableModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={title}
        data={data}
        onSelect={(item) => {
          onSelect(item);
          setModalVisible(false);
        }}
        renderItem={renderItem}
        searchKey={searchKey}
        placeholder={`Search ${title.toLowerCase()}...`}
      />
    </>
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
  list: {
    flex: 1,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  listButton: {
    marginLeft: 8,
    padding: 4,
  },
});