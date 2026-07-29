import { useEffect, useRef, useState } from "react";
import styles from "./ExactPickupLocationPicker.module.css";
import GoogleMapEmbed from "../GoogleMapEmbed/GoogleMapEmbed";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let googleMapsLoaderPromise = null;

const loadGoogleMaps = () => {
  if (!GOOGLE_KEY) return Promise.resolve(null);
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise;

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-nova-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.dataset.novaGoogleMaps = "1";
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
};

const geocodeWithNominatim = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Address search failed");
  const rows = await res.json();
  return rows.map((row) => ({
    label: row.display_name,
    lat: Number(row.lat),
    lng: Number(row.lon),
    placeId: null,
  }));
};

/**
 * Owner-only exact pickup point. Public city stays on the parent form (`address`).
 */
const ExactPickupLocationPicker = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapHostRef = useRef(null);

  const hasPoint =
    value.pickupLatitude != null &&
    value.pickupLatitude !== "" &&
    value.pickupLongitude != null &&
    value.pickupLongitude !== "" &&
    !Number.isNaN(Number(value.pickupLatitude)) &&
    !Number.isNaN(Number(value.pickupLongitude));

  const applyPoint = ({
    exactPickupAddress,
    pickupLatitude,
    pickupLongitude,
    googlePlaceId = null,
  }) => {
    onChange({
      exactPickupAddress,
      pickupLatitude,
      pickupLongitude,
      googlePlaceId,
    });
    setSearchQuery(exactPickupAddress || "");
    setSuggestions([]);
    setSearchError("");
  };

  useEffect(() => {
    if (value.exactPickupAddress) {
      setSearchQuery(value.exactPickupAddress);
    }
  }, [value.exactPickupAddress]);

  // Google Places Autocomplete + interactive map when API key is present.
  useEffect(() => {
    let cancelled = false;

    const setupGoogle = async () => {
      if (!GOOGLE_KEY || !autocompleteInputRef.current) return;
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !google?.maps) return;

        if (!autocompleteRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(
            autocompleteInputRef.current,
            {
              fields: ["formatted_address", "geometry", "place_id", "name"],
            },
          );
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location;
            if (!location) {
              setSearchError("Select a full address from the suggestions.");
              return;
            }
            applyPoint({
              exactPickupAddress:
                place.formatted_address || place.name || searchQuery,
              pickupLatitude: location.lat(),
              pickupLongitude: location.lng(),
              googlePlaceId: place.place_id || null,
            });
          });
          autocompleteRef.current = autocomplete;
        }

        if (mapHostRef.current && hasPoint) {
          const lat = Number(value.pickupLatitude);
          const lng = Number(value.pickupLongitude);
          const center = { lat, lng };

          if (!mapRef.current) {
            mapRef.current = new google.maps.Map(mapHostRef.current, {
              center,
              zoom: 15,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });
            markerRef.current = new google.maps.Marker({
              map: mapRef.current,
              position: center,
              draggable: true,
            });
            markerRef.current.addListener("dragend", () => {
              const pos = markerRef.current.getPosition();
              if (!pos) return;
              const nextLat = pos.lat();
              const nextLng = pos.lng();
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: { lat: nextLat, lng: nextLng } }, (results, status) => {
                const label =
                  status === "OK" && results?.[0]?.formatted_address
                    ? results[0].formatted_address
                    : value.exactPickupAddress || `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`;
                applyPoint({
                  exactPickupAddress: label,
                  pickupLatitude: nextLat,
                  pickupLongitude: nextLng,
                  googlePlaceId: results?.[0]?.place_id || value.googlePlaceId || null,
                });
              });
            });
          } else {
            mapRef.current.setCenter(center);
            markerRef.current.setPosition(center);
          }
        }
      } catch {
        setSearchError("Google Maps could not be loaded. Use search or current location.");
      }
    };

    setupGoogle();
    return () => {
      cancelled = true;
    };
  }, [hasPoint, value.pickupLatitude, value.pickupLongitude]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError("Enter an address to search.");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    try {
      if (GOOGLE_KEY && window.google?.maps) {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: query }, (predictions, status) => {
          setIsSearching(false);
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !predictions?.length
          ) {
            setSuggestions([]);
            setSearchError("No matching addresses found.");
            return;
          }
          setSuggestions(
            predictions.map((p) => ({
              label: p.description,
              placeId: p.place_id,
            })),
          );
        });
        return;
      }

      const rows = await geocodeWithNominatim(query);
      setSuggestions(rows);
      if (rows.length === 0) setSearchError("No matching addresses found.");
    } catch {
      setSearchError("Address search failed. Try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = async (item) => {
    if (item.lat != null && item.lng != null) {
      applyPoint({
        exactPickupAddress: item.label,
        pickupLatitude: item.lat,
        pickupLongitude: item.lng,
        googlePlaceId: item.placeId,
      });
      return;
    }

    if (GOOGLE_KEY && item.placeId && window.google?.maps) {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div"),
      );
      service.getDetails(
        { placeId: item.placeId, fields: ["formatted_address", "geometry", "place_id"] },
        (place, status) => {
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !place?.geometry?.location
          ) {
            setSearchError("Could not resolve that address.");
            return;
          }
          applyPoint({
            exactPickupAddress: place.formatted_address || item.label,
            pickupLatitude: place.geometry.location.lat(),
            pickupLongitude: place.geometry.location.lng(),
            googlePlaceId: place.place_id || item.placeId,
          });
        },
      );
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported in this browser.");
      return;
    }
    setIsLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          if (GOOGLE_KEY && window.google?.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              setIsLocating(false);
              const label =
                status === "OK" && results?.[0]?.formatted_address
                  ? results[0].formatted_address
                  : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              applyPoint({
                exactPickupAddress: label,
                pickupLatitude: lat,
                pickupLongitude: lng,
                googlePlaceId: results?.[0]?.place_id || null,
              });
            });
            return;
          }
          const rows = await geocodeWithNominatim(`${lat},${lng}`);
          setIsLocating(false);
          applyPoint({
            exactPickupAddress: rows[0]?.label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            pickupLatitude: lat,
            pickupLongitude: lng,
            googlePlaceId: null,
          });
        } catch {
          setIsLocating(false);
          applyPoint({
            exactPickupAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            pickupLatitude: lat,
            pickupLongitude: lng,
            googlePlaceId: null,
          });
        }
      },
      () => {
        setIsLocating(false);
        setSearchError("Could not read your current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const mapQuery = hasPoint
    ? `${value.pickupLatitude},${value.pickupLongitude}`
    : "";

  return (
    <div className={styles.ExactPickupLocationPicker}>
      <h3>Exact Pickup Location</h3>
      <p className={styles.helper}>
        The city is visible publicly. The exact pickup point is shared only with
        the requester after payment.
      </p>

      <div className={styles.field}>
        <label>Exact pickup point</label>
        <div className={styles.searchRow}>
          <input
            ref={autocompleteInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street address or place"
            autoComplete="off"
          />
          <button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? "…" : "Search"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((item) => (
              <li key={item.placeId || item.label}>
                <button type="button" onClick={() => selectSuggestion(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError && <p className={styles.error}>{searchError}</p>}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={useCurrentLocation} disabled={isLocating}>
          {isLocating ? "Locating…" : "Use my current location"}
        </button>
      </div>

      {value.exactPickupAddress && (
        <p className={styles.selected}>
          <span>Selected exact address:</span>
          {value.exactPickupAddress}
        </p>
      )}

      {hasPoint && (
        <div className={styles.mapBlock}>
          {GOOGLE_KEY ? (
            <div ref={mapHostRef} className={styles.mapHost} />
          ) : (
            <GoogleMapEmbed
              query={mapQuery}
              title="Exact pickup location"
              className={styles.mapEmbed}
            />
          )}
          <p className={styles.coordsHint}>
            {GOOGLE_KEY
              ? "Drag the marker to fine-tune the pickup point."
              : "Set VITE_GOOGLE_MAPS_API_KEY for an interactive draggable map."}
          </p>
        </div>
      )}

      <div className={styles.field}>
        <label>Pickup instructions (optional)</label>
        <textarea
          value={value.pickupInstructions || ""}
          onChange={(e) => onChange({ pickupInstructions: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="Building entrance, parking notes, intercom code…"
        />
      </div>
    </div>
  );
};

export default ExactPickupLocationPicker;
