import React, { useEffect } from "react";
import { StyleSheet, View, TextInput, Button } from "react-native";
import { gql, useMutation } from "@apollo/client";

const START_PLAYING = gql`
  mutation StartPlaying($name: String!) {
    startPlaying(name: $name) {
      token
    }
  }
`;

export default ({ setToken, setName, name }) => {
  const [startPlaying, { data, error }] = useMutation(START_PLAYING);
  useEffect(() => {
    if (!data) return;
    setToken(data.startPlaying.token);
  }, [data, error]);
  return (
    <View style={styles.container}>
      <TextInput style={styles.input} onChangeText={setName} value={name} />
      <Button
        onPress={() => startPlaying({ variables: { name } })}
        title={"Start playing"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    input: {
        backgroundColor:"#ddf",
        padding:10,
        fontSize:20,

    },
  container: {
    flex: 1,
    alignItems: "stretch",
    display: "flex",
    margin:10,
    justifyContent: "center",
  },

});
