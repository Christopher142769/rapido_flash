import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createApi, getApiBaseUrl } from './src/api';
import { ensureAndroidChannel, getExpoPushTokenForDevice } from './src/pushSetup';

const JWT_KEY = 'rapido_jwt';

export default function App() {
  const api = useMemo(() => createApi(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState(null);
  const [jwt, setJwt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [pushLine, setPushLine] = useState('');
  const [expoToken, setExpoToken] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(JWT_KEY);
        if (stored) setJwt(stored);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  const registerPushForJwt = useCallback(
    async (token) => {
      setPushLine('');
      await ensureAndroidChannel();
      const got = await getExpoPushTokenForDevice();
      if (got.error) {
        setPushLine(got.error);
        return;
      }
      setExpoToken(got.token);
      try {
        await api.post(
          '/push/mobile/register',
          { token: got.token, platform: Platform.OS },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPushLine('Notifications : enregistrées (priorité maximale sur Android).');
      } catch (e) {
        const msg = e.response?.data?.message || e.message || 'Erreur enregistrement push';
        setPushLine(msg);
      }
    },
    [api]
  );

  useEffect(() => {
    if (!jwt) {
      setPushLine('');
      setExpoToken(null);
      return;
    }
    registerPushForJwt(jwt);
  }, [jwt, registerPushForJwt]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((n) => {
      const title = n.request.content.title || 'Rapido';
      const body = n.request.content.body || '';
      if (body) {
        Alert.alert(title, body);
      }
    });
    return () => received.remove();
  }, []);

  const persistJwt = async (token) => {
    await AsyncStorage.setItem(JWT_KEY, token);
    setJwt(token);
  };

  const onLogin = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      if (data.requiresTwoFactor && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setCode('');
        Alert.alert('Validation', 'Un code a été envoyé par e-mail (compte restaurant / gestion).');
        return;
      }
      if (data.token) {
        await persistJwt(data.token);
        setChallengeToken(null);
        setCode('');
      }
    } catch (e) {
      Alert.alert('Connexion', e.response?.data?.message || e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const onVerify2fa = async () => {
    if (!challengeToken) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-dashboard-2fa', {
        challengeToken,
        code: code.trim(),
      });
      if (data.token) {
        await persistJwt(data.token);
        setChallengeToken(null);
        setCode('');
      }
    } catch (e) {
      Alert.alert('Code', e.response?.data?.message || e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    try {
      if (jwt && expoToken) {
        await api
          .post('/push/mobile/unregister', { token: expoToken }, { headers: { Authorization: `Bearer ${jwt}` } })
          .catch(() => {});
      }
    } finally {
      await AsyncStorage.removeItem(JWT_KEY);
      setJwt(null);
      setChallengeToken(null);
      setCode('');
      setExpoToken(null);
      setBusy(false);
    }
  };

  if (hydrating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5C4033" />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StatusBar style="dark" />
        <Text style={styles.title}>Rapido</Text>
        <Text style={styles.sub}>Application mobile (React Native / Expo)</Text>
        <Text style={styles.api}>API : {getApiBaseUrl()}</Text>

        {!jwt ? (
          <View style={styles.card}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@exemple.com"
            />
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {challengeToken ? (
              <>
                <Text style={styles.label}>Code e-mail (6 chiffres)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                />
                <Pressable
                  style={[styles.btn, busy && styles.btnDisabled]}
                  onPress={onVerify2fa}
                  disabled={busy}
                >
                  <Text style={styles.btnText}>Valider le code</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnOutline, { marginTop: 12 }, busy && styles.btnDisabled]}
                  onPress={() => {
                    setChallengeToken(null);
                    setCode('');
                  }}
                  disabled={busy}
                >
                  <Text style={styles.btnOutlineText}>Annuler</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={onLogin} disabled={busy}>
                <Text style={styles.btnText}>Se connecter</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.ok}>Connecté — les alertes serveur sont poussées sur cet appareil.</Text>
            {!!pushLine && <Text style={styles.push}>{pushLine}</Text>}
            <Pressable style={[styles.btnOutline, busy && styles.btnDisabled]} onPress={onLogout} disabled={busy}>
              <Text style={styles.btnOutlineText}>Déconnexion</Text>
            </Pressable>
          </View>
        )}

        {busy && <ActivityIndicator style={styles.spinner} color="#5C4033" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f6f3ef' },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f3ef' },
  title: { fontSize: 32, fontWeight: '800', color: '#3d2918' },
  sub: { marginTop: 6, fontSize: 15, color: '#5c4a3a' },
  api: { marginTop: 10, fontSize: 12, color: '#7a6554' },
  card: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#5C4033', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0d6cc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#fdfcfa',
  },
  btn: {
    backgroundColor: '#5C4033',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#5C4033',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOutlineText: { color: '#5C4033', fontSize: 16, fontWeight: '700' },
  ok: { fontSize: 15, color: '#3d2918', lineHeight: 22 },
  push: { marginTop: 12, fontSize: 14, color: '#5c4a3a', lineHeight: 20 },
  muted: { marginTop: 8, color: '#7a6554' },
  spinner: { marginTop: 20 },
});
