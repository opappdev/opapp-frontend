import React from 'react';
import { ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { FilterChip } from './FilterChip';
import { styles } from './FilterSection.styles';

export function FilterSection({
  label,
  items,
  style,
}: {
  label: string;
  items: { key: string; label: string; active: boolean; onPress: () => void }[];
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.filterSection, style]}>
      <Text style={[styles.filterSectionLabel, { color: palette.inkSoft }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterSectionRow}
      >
        {items.map((item) => (
          <FilterChip
            key={item.key}
            label={item.label}
            active={item.active}
            onPress={item.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
