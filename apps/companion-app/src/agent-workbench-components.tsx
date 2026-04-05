import React from 'react';
import {Text, View} from 'react-native';
import {useTheme} from '@opapp/ui-native-primitives';
import {baseStyles} from './agent-workbench-styles';

export function DetailField({
  label,
  value,
  valueTestID,
}: {
  label: string;
  value: string;
  valueTestID?: string;
}) {
  const {palette} = useTheme();

  return (
    <View
      style={[
        baseStyles.detailField,
        {
          backgroundColor: palette.canvasShade,
          borderColor: palette.border,
        },
      ]}>
      <Text style={[baseStyles.detailFieldLabel, {color: palette.inkSoft}]}>
        {label}
      </Text>
      <Text
        testID={valueTestID}
        style={[baseStyles.detailFieldValue, {color: palette.ink}]}>
        {value}
      </Text>
    </View>
  );
}
