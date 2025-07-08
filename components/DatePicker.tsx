import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Calendar, X } from 'lucide-react-native';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  style?: any;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  style,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const [currentMonth, setCurrentMonth] = useState(new Date(value));
  const calendarDays = generateCalendarDays(currentMonth);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const selectDate = (date: Date) => {
    onChange(date);
    setShowPicker(false);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === value.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.text}>
          {formatDate(value)}
        </Text>
        <Calendar size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('prev')}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>
                {currentMonth.toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                })}
              </Text>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('next')}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPicker(false)}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendar}>
              {calendarDays.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.day,
                    !isCurrentMonth(date) && styles.otherMonth,
                    isToday(date) && styles.today,
                    isSelected(date) && styles.selected,
                  ]}
                  onPress={() => selectDate(date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth(date) && styles.otherMonthText,
                      isToday(date) && styles.todayText,
                      isSelected(date) && styles.selectedText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
  text: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    paddingVertical: 8,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  otherMonth: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: '#9ca3af',
  },
  today: {
    backgroundColor: '#dbeafe',
  },
  todayText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  selected: {
    backgroundColor: '#2563eb',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});