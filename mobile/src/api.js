import axios from 'axios';
import Constants from 'expo-constants';

export function getApiBaseUrl() {
  return Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api';
}

export function createApi() {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 25000,
    headers: { 'Content-Type': 'application/json' },
  });
}
