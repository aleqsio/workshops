import React, { useEffect, useState } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { DeviceMotion } from "expo-sensors";
import { useSharedValue, withTiming } from "react-native-reanimated";
import AnimatedTextCircle from "./AnimatedTextCircle";
import { useSubscription, useMutation } from "@apollo/client";
import { gql } from "graphql-tag";
import InputField from "./InputField";

const GYRO_POLL_INTERVAL = 50;

export default ({ name, signOut, onRestart }) => {
  const [guessSaved, setGuessSaved] = useState(false);
  const gyroRotation = useSharedValue(0);
  const correctPosition = useSharedValue(0);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(GYRO_POLL_INTERVAL);
    const listener = DeviceMotion.addListener((motion) => {
      if (guessSaved || !motion || !motion.rotation) return;
      gyroRotation.value = withTiming(
        Math.min(1, Math.max(0, motion.rotation.beta)),
        { duration: GYRO_POLL_INTERVAL }
      );
    });
    return () => listener.remove();
  }, [guessSaved]);

  const { data: gameStartedData } = useSubscription(
    gql`
      subscription OnGameStarted {
        gameStarted {
          category {
            positiveBound
            negativeBound
            positiveColor
            negativeColor
          }
          players {
            name
          }
          psychic {
            name
          }
          correctPosition
        }
      }
    `
  );
  const category =
    gameStartedData &&
    gameStartedData.gameStarted &&
    gameStartedData.gameStarted.category;
  const positiveColor = (category && category.positiveColor) || "#fff";
  const negativeColor = (category && category.negativeColor) || "#000";
  const isPsychic =
    gameStartedData &&
    gameStartedData.gameStarted &&
    gameStartedData.gameStarted.psychic &&
    gameStartedData.gameStarted.psychic.name == name;

  const { data: representativeProvidedData } = useSubscription(
    gql`
      subscription OnRepresentativeProvided {
        representativeProvided {
          representative
        }
      }
    `
  );
  const representative =
    representativeProvidedData &&
    representativeProvidedData.representativeProvided &&
    representativeProvidedData.representativeProvided.representative;

  const { data: gameEndedData } = useSubscription(
    gql`
      subscription OnGameEnded {
        gameEnded {
          players {
            name
          }
          scores {
            player {
              name
            }
            score
          }
        }
      }
    `
  );

  useEffect(() => {
    if (!gameStartedData) return;
    correctPosition.value = gameStartedData.gameStarted.correctPosition;
  }, [gameStartedData]);

  useEffect(() => {
    if (
      (gameStartedData &&
        !gameStartedData.gameStarted.players.find((p) => p.name === name)) ||
      (gameEndedData &&
        !gameEndedData.gameEnded.players.find((p) => p.name === name))
    ) {
      signOut();
    }
    if (gameEndedData) {
      setTimeout(() => onRestart(), 5000);
    }
  }, [gameEndedData, gameStartedData]);

  const PROVIDE_GUESS = gql`
    mutation ProvideGuess($position: Float!) {
      provideGuess(position: $position)
    }
  `;
  const [provideGuess] = useMutation(PROVIDE_GUESS);

  const submitAnswer = () => {
    if (isPsychic) return;
    setGuessSaved(true);
    provideGuess({ variables: { position: gyroRotation.value } });
  };
  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[styles.container, { backgroundColor: positiveColor }]}
      onPress={category && representative ? submitAnswer : () => null}
    >
      <View style={[styles.container, { backgroundColor: positiveColor }]}>
        {!isPsychic && gameEndedData && (
          <AnimatedTextCircle
            mainText={`${
              gameEndedData.gameEnded.scores.find((s) => s.player.name === name)
                .score
            } punktów`}
            percentage={correctPosition}
            colors={["#fff", "#fff"]}
          />
        )}
        <AnimatedTextCircle
          mainText={!guessSaved ? representative : "Twoja odpowiedz"}
          percentage={isPsychic ? correctPosition : gyroRotation}
          colors={[positiveColor, negativeColor]}
          boundsTexts={
            category && [category.positiveBound, category.negativeBound]
          }
          variant={guessSaved && "stroke"}
        />
      </View>
      {isPsychic && !representative && <InputField />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    backgroundColor: "white",
  },
  gyroCircle: {
    aspectRatio: 1,
    backgroundColor: "black",
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: 100,
    borderRadius: 100,
    height: 100,
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
