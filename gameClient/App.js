import { StatusBar } from 'expo-status-bar';
import React, { useState } from "react";
import { StyleSheet, View } from 'react-native';
import GameScreen from "./GameScreen";
import { setContext } from "@apollo/client/link/context";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";
import SignInScreen from './SignInScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState("");
  const [key,setKey] = useState("");

  const httpLink = createHttpLink({
    uri: "http://192.168.0.111:4000/graphql",
  });
  const wsLink = new WebSocketLink({
    uri: "ws://192.168.0.111:4000/graphql",
    options: {
      reconnect: true,
    },
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: token,
      },
    };
  });

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    authLink.concat(httpLink)
  );

  const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
  return (
    <ApolloProvider client={client}>
      <View style={styles.container}>
        {!token && (
          <SignInScreen setToken={setToken} name={name} setName={setName} />
        )}
        {token ? (
          <GameScreen key={key} onRestart={() => setKey(`${key}.`)} name={name} signOut={() => setToken(null)} />
        ) : null}
        <StatusBar style="auto" />
      </View>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
  },
});
