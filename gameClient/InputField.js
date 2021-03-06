import React, { useState } from "react";
import { StyleSheet, View, TextInput, Button } from "react-native";
import { gql, useMutation } from "@apollo/client";

const PROVIDE_REPRESENTATIVE = gql`
  mutation ProvideRepresentative($name: String!) {
    provideRepresentative(name: $name)
  }
`;

export default () => {
  const [provideRepresentative] = useMutation(PROVIDE_REPRESENTATIVE);
  const [name, setName] = useState("");
  return (
    <View style={styles.container}>
      <TextInput style={styles.input} onChangeText={setName} value={name} />
      <Button
        onPress={() => provideRepresentative({ variables: { name } })}
        title={"Zapisz reprezentanta"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#ddf",
    padding: 10,
    fontSize: 20,
  },
  container: { marginBottom: 20 },
});
