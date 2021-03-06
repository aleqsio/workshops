import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

const size = 100;

export default ({ percentage, mainText, boundsTexts, colors,style, variant }) => {
  const maxHeight = useSharedValue(1);
  const gyroAnimatedStyles = useAnimatedStyle(() => {
    const topPointScreenY = percentage.value * maxHeight.value;
    const offset = 5000 - percentage.value * 5200;
    return {
      transform: [
        {
          translateX: -size / 2,
        },
        {
          translateY: offset + size / 2,
        },
        {
          scale: ((topPointScreenY + offset) / size) * 2,
        },
      ],
    };
  });
  const headerAnimatedStyles = useAnimatedStyle(() => {
    const topPointScreenY = percentage.value * maxHeight.value;
    return {
      transform: [
        {
          translateY: -topPointScreenY + (percentage.value > 0.5 ? 80 : -40),
        },
      ],
      color: (variant !=="stroke" && percentage.value > 0.5) ? colors[0] : colors[1],
    };
  });
  return (
    <View
      style={[styles.container,style]}
      onLayout={(event) => {
        maxHeight.value = event.nativeEvent.layout.height;
      }}
    >
      <Animated.View
        style={[
          styles.gyroCircle,
          variant ==="stroke" ? styles.strokedGyroCircle:{ backgroundColor: colors[1] },
          gyroAnimatedStyles,
        ]}
      />
      {boundsTexts && (
        <>
          <View style={styles.boundItem}>
            <Text style={{ color: colors[1], fontSize: 20 }}>
              {boundsTexts[0]}
            </Text>
          </View>
          <View style={styles.centerBox}></View>
          <View style={styles.boundItem}>
            <Text style={{ color: colors[0], fontSize: 20 }}>
              {boundsTexts[1]}
            </Text>
          </View>
        </>
      )}
      <Animated.Text style={[styles.characterText, headerAnimatedStyles]}>
        {mainText}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    flex: 1,
    display: "flex",
  },
  strokedGyroCircle: {
      borderStyle:"solid",
      borderWidth: 0.02,
  },
  centerBox: { flex: 0.4 },
  boundItem: {
    flex: 0.3,
    alignItems: "center",
    justifyContent: "center",
  },
  gyroCircle: {
    aspectRatio: 1,
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: size,
    borderRadius: size,
    height: size,
  },
  characterText: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    display: "flex",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 30,
  },
});
