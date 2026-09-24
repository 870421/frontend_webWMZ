import { apiRequest } from './client.js';

export function getApiHealth() {
  return apiRequest('/health');
}

