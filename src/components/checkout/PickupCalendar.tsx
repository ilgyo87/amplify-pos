import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUSINESS_HOURS } from '../../types/order';

interface PickupCalendarProps {
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  style?: any;
}

export function PickupCalendar({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  style
}: PickupCalendarProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Generate available dates (next 14 days, excluding Sundays)
  const availableDates = useMemo(() => {
    const dates: Array<{
      date: string;
      dayName: string;
      dayNumber: number;
      month: string;
      isToday: boolean;
      isTomorrow: boolean;
    }> = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays (day 0)
      if (date.getDay() !== 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          isToday: false,
          isTomorrow: i === 1
        });
      }
    }
    
    return dates;
  }, []);

  // Generate time slots based on business hours
  const getTimeSlots = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof BUSINESS_HOURS;
    const hours = BUSINESS_HOURS[dayName];
    
    if (!hours || 'closed' in hours) {
      return [];
    }

    const slots: Array<{
      time: string;
      display: string;
      available: boolean;
    }> = [];
    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);
    
    // Generate 30-minute intervals
    for (let hour = openHour; hour < closeHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === closeHour - 1 && minute >= closeMinute) break;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatTime(timeString);
        
        slots.push({
          time: timeString,
          display: displayTime,
          available: true // In a real app, this would check actual availability
        });
      }
    }
    
    return slots;
  };

  const formatTime = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const timeSlots = selectedDate ? getTimeSlots(selectedDate) : [];

  const renderDateCard = (dateInfo: any) => {
    const isSelected = selectedDate === dateInfo.date;
    
    return (
      <TouchableOpacity
        key={dateInfo.date}
        style={[
          styles.dateCard,
          isSelected && styles.selectedDateCard
        ]}
        onPress={() => onSelectDate(dateInfo.date)}
      >
        <Text style={[
          styles.dayName,
          isSelected && styles.selectedDateText
        ]}>
          {dateInfo.dayName}
        </Text>
        <Text style={[
          styles.dayNumber,
          isSelected && styles.selectedDateText
        ]}>
          {dateInfo.dayNumber}
        </Text>
        <Text style={[
          styles.month,
          isSelected && styles.selectedDateText
        ]}>
          {dateInfo.month}
        </Text>
        {dateInfo.isTomorrow && (
          <Text style={[
            styles.todayLabel,
            isSelected && styles.selectedDateText
          ]}>
            Tomorrow
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTimeSlot = (slot: any) => {
    const isSelected = selectedTime === slot.time;
    
    return (
      <TouchableOpacity
        key={slot.time}
        style={[
          styles.timeSlot,
          isSelected && styles.selectedTimeSlot,
          !slot.available && styles.unavailableTimeSlot
        ]}
        onPress={() => slot.available && onSelectTime(slot.time)}
        disabled={!slot.available}
      >
        <Text style={[
          styles.timeText,
          isSelected && styles.selectedTimeText,
          !slot.available && styles.unavailableTimeText
        ]}>
          {slot.display}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={24} color="#007AFF" />
        <Text style={styles.title}>Select Pickup Date & Time</Text>
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Date</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesContainer}
        >
          {availableDates.map(renderDateCard)}
        </ScrollView>
      </View>

      {/* Time Selection */}
      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Time</Text>
          {timeSlots.length > 0 ? (
            <View style={styles.timeSlotsGrid}>
              {timeSlots.map(renderTimeSlot)}
            </View>
          ) : (
            <View style={styles.closedContainer}>
              <Ionicons name="close-circle" size={32} color="#FF3B30" />
              <Text style={styles.closedText}>Closed on this day</Text>
            </View>
          )}
        </View>
      )}

      {/* Selected Summary */}
      {selectedDate && selectedTime && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryContent}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.summaryText}>
              Pickup: {availableDates.find(d => d.date === selectedDate)?.dayName} {availableDates.find(d => d.date === selectedDate)?.month} {availableDates.find(d => d.date === selectedDate)?.dayNumber} at {formatTime(selectedTime)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  datesContainer: {
    paddingHorizontal: 4,
  },
  dateCard: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 70,
  },
  selectedDateCard: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  month: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  selectedDateText: {
    color: 'white',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTimeSlot: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unavailableTimeSlot: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeText: {
    color: 'white',
  },
  unavailableTimeText: {
    color: '#999',
  },
  closedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  closedText: {
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 8,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
});