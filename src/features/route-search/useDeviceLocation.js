import { useEffect, useRef, useState } from 'react';

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;
const PRECISE_GEOLOCATION_TIMEOUT_MS = 10000;
const FALLBACK_GEOLOCATION_TIMEOUT_MS = 20000;

function getGeolocationErrorMessage(error) {
  if (!error) {
    return 'No se ha podido obtener tu ubicación actual.';
  }

  if (error.code === GEOLOCATION_PERMISSION_DENIED) {
    return 'Se ha denegado el acceso a la ubicación. Permítelo en la configuración del navegador y del dispositivo y vuelve a pulsar Usar GPS.';
  }

  if (error.code === GEOLOCATION_POSITION_UNAVAILABLE) {
    return 'Tu ubicación actual no está disponible. Comprueba que los servicios de ubicación estén activados en el navegador y el sistema operativo.';
  }

  if (error.code === GEOLOCATION_TIMEOUT) {
    return 'La solicitud de ubicación ha tardado demasiado.';
  }

  return 'No se ha podido obtener tu ubicación actual.';
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
    label: 'Ubicación actual',
    source: 'device',
  };
}

export function useDeviceLocation({ onLocated }) {
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );
  const [geolocation, setGeolocation] = useState({
    status: 'idle',
    errorMessage: '',
  });

  function requestCurrentLocation(pointType = 'origin') {
    requestId.current += 1;
    const id = requestId.current;
    if (window.isSecureContext === false) {
      setGeolocation({
        status: 'error',
        errorMessage:
          'El acceso a la ubicación requiere HTTPS o localhost. Abre la aplicación en localhost o utiliza HTTPS.',
      });
      return;
    }

    if (!navigator.geolocation) {
      setGeolocation({
        status: 'unsupported',
        errorMessage: 'Tu navegador no permite acceder a la ubicación.',
      });
      return;
    }

    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) {
      setGeolocation({
        status: 'denied',
        errorMessage:
          'La política de permisos de esta página bloquea la ubicación. Abre WeatherMapZ directamente en una pestaña. Si continúa bloqueada, el administrador debe habilitar la geolocalización.',
      });
      return;
    }

    setGeolocation({
      status: 'loading',
      errorMessage: '',
    });

    function handleSuccess(position) {
      if (id !== requestId.current) return;
      const point = createDevicePoint(position);

      if (!point) {
        setGeolocation({
          status: 'error',
          errorMessage: 'El navegador ha devuelto una ubicación no válida. Inténtalo de nuevo.',
        });
        return;
      }

      onLocated(pointType, point);
      setGeolocation({
        status: 'success',
        errorMessage: '',
        pointType,
      });
    }

    function handleFinalError(error) {
      if (id !== requestId.current) return;
      setGeolocation({
        status: error?.code === GEOLOCATION_PERMISSION_DENIED ? 'denied' : 'error',
        errorMessage: getGeolocationErrorMessage(error),
      });
    }

    function requestFallbackLocation() {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleFinalError, {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: FALLBACK_GEOLOCATION_TIMEOUT_MS,
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
        timeout: PRECISE_GEOLOCATION_TIMEOUT_MS,
      }
    );
  }

  function clearGeolocationMessage() {
    requestId.current += 1;
    setGeolocation({
      status: 'idle',
      errorMessage: '',
      pointType: null,
    });
  }

  return {
    clearGeolocationMessage,
    geolocation,
    requestCurrentLocation,
  };
}
