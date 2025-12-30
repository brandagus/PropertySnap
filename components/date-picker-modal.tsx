import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/use-colors";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  minimumDate,
  maximumDate,
  title = "Select Date",
}: DatePickerModalProps) {
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && date) {
        setSelectedDate(date);
        onSelect(date);
        onClose();
      } else if (event.type === "dismissed") {
        onClose();
      }
    } else if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedDate);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // For Android, show the native picker directly
  if (Platform.OS === "android") {
    if (!visible) return null;
    
    return (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // For iOS and Web, show a modal with the picker
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose}>
              <Text style={[styles.headerButton, { color: colors.muted }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {title}
            </Text>
            <Pressable onPress={handleConfirm}>
              <Text style={[styles.headerButton, { color: colors.primary }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <View style={styles.dateDisplay}>
            <Text style={[styles.selectedDate, { color: colors.foreground }]}>
              {formatDate(selectedDate)}
            </Text>
          </View>

          {Platform.OS === "web" ? (
            // Web fallback - simple date input
            <View style={styles.webPickerContainer}>
              <input
                type="date"
                value={selectedDate.toISOString().split("T")[0]}
                min={minimumDate?.toISOString().split("T")[0]}
                max={maximumDate?.toISOString().split("T")[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + "T12:00:00");
                  setSelectedDate(newDate);
                }}
                style={{
                  fontSize: 18,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  width: "100%",
                }}
              />
            </View>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={styles.picker}
            />
          )}

          {/* Quick select options */}
          <View style={styles.quickOptions}>
            <Text style={[styles.quickLabel, { color: colors.muted }]}>
              Quick Select
            </Text>
            <View style={styles.quickButtons}>
              {[
                { label: "Tomorrow", days: 1 },
                { label: "3 Days", days: 3 },
                { label: "1 Week", days: 7 },
                { label: "2 Weeks", days: 14 },
              ].map((option) => {
                const optionDate = new Date();
                optionDate.setDate(optionDate.getDate() + option.days);
                const isSelected =
                  selectedDate.toDateString() === optionDate.toDateString();

                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setSelectedDate(optionDate)}
                    style={[
                      styles.quickButton,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        {
                          color: isSelected ? "#FFFFFF" : colors.foreground,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  dateDisplay: {
    alignItems: "center",
    paddingVertical: 16,
  },
  selectedDate: {
    fontSize: 18,
    fontWeight: "500",
  },
  picker: {
    height: 200,
  },
  webPickerContainer: {
    padding: 20,
    alignItems: "center",
  },
  quickOptions: {
    padding: 16,
    paddingTop: 8,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
