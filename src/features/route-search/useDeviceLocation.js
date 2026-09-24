import { useEffect, useRef, useState } from 'react';

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
    return 'Location access was denied. Allow Location in this site’s browser settings, check your device’s location permissions, then press Use GPS again.';
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
  const latitude = position?.coords?.latitude;
  const longitude = position?.coords?.longitude;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
    label: 'Current location',
    source: 'device'
  };
}

export function useDeviceLocation({ onLocated }) {
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);
  const [geolocation, setGeolocation] = useState({
    status: 'idle',
    errorMessage: ''
  });

  function requestCurrentLocation(pointType = 'origin') {
    const id = ++requestId.current;
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

    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) {
      setGeolocation({
        status: 'denied',
        errorMessage:
          'Location is blocked by this page’s permissions policy. Open WeatherMapZ directly in a browser tab. If it is still blocked, the site administrator must enable geolocation.'
      });
      return;
    }

    setGeolocation({
      status: 'loading',
      errorMessage: ''
    });

    function handleSuccess(position) {
      if (id !== requestId.current) return;
      const point = createDevicePoint(position);

      if (!point) {
        setGeolocation({
          status: 'error',
          errorMessage: 'Your browser returned an invalid location. Please try again.'
        });
        return;
      }

      onLocated(pointType, point);
      setGeolocation({
        status: 'success',
        errorMessage: '',
        pointType
      });
    }

    function handleFinalError(error) {
      if (id !== requestId.current) return;
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
        if (id !== requestId.current) return;
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
    requestId.current += 1;
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
