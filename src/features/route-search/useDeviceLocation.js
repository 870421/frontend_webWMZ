import { useState } from 'react';

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;
const PRECISE_GEOLOCATION_TIMEOUT_MS = 10000;
const FALLBACK_GEOLOCATION_TIMEOUT_MS = 20000;

function getGeolocationErrorMessage(error) {
  if (!error) {
    return 'Unable to get your current location.';
  }

  if (error.code === GEOLOCATION_PERMISSION_DENIED) {
    return 'Location permission was denied.';
  }

  if (error.code === GEOLOCATION_POSITION_UNAVAILABLE) {
    return 'Your current location is unavailable. Check that location services are enabled for your browser and operating system.';
  }

  if (error.code === GEOLOCATION_TIMEOUT) {
    return 'Location request timed out.';
  }

  return 'Unable to get your current location.';
}

export function createDevicePoint(position) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    label: 'Current location',
    source: 'device'
  };
}

export function useDeviceLocation({ onLocated }) {
  const [geolocation, setGeolocation] = useState({
    status: 'idle',
    errorMessage: ''
  });

  function requestCurrentLocation(pointType = 'origin') {
    if (window.isSecureContext === false) {
      setGeolocation({
        status: 'error',
        errorMessage:
          'Location access requires HTTPS or localhost. Open the app on localhost or use HTTPS.'
      });
      return;
    }

    if (!navigator.geolocation) {
      setGeolocation({
        status: 'unsupported',
        errorMessage: 'Your browser does not support location access.'
      });
      return;
    }

    setGeolocation({
      status: 'loading',
      errorMessage: ''
    });

    function handleSuccess(position) {
      const point = createDevicePoint(position);

      onLocated(pointType, point);
      setGeolocation({
        status: 'success',
        errorMessage: '',
        pointType
      });
    }

    function handleFinalError(error) {
      setGeolocation({
        status: error?.code === GEOLOCATION_PERMISSION_DENIED ? 'denied' : 'error',
        errorMessage: getGeolocationErrorMessage(error)
      });
    }

    function requestFallbackLocation() {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleFinalError, {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: FALLBACK_GEOLOCATION_TIMEOUT_MS
      });
    }

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => {
        if (
          error?.code === GEOLOCATION_POSITION_UNAVAILABLE ||
          error?.code === GEOLOCATION_TIMEOUT
        ) {
          requestFallbackLocation();
          return;
        }

        handleFinalError(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: PRECISE_GEOLOCATION_TIMEOUT_MS
      }
    );
  }

  function clearGeolocationMessage() {
    setGeolocation({
      status: 'idle',
      errorMessage: '',
      pointType: null
    });
  }

  return {
    clearGeolocationMessage,
    geolocation,
    requestCurrentLocation
  };
}
