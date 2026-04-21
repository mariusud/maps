import { useCallback, useRef, useState } from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';
import {
  Camera,
  CircleLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { Feature, FeatureCollection, Point } from 'geojson';

import Bubble from '../common/Bubble';

const CENTER: [number, number] = [-73.9957, 40.7305];

const initialFeatures: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'point-a',
      geometry: { type: 'Point', coordinates: [-73.998, 40.728] },
      properties: { label: 'A' },
    },
    {
      type: 'Feature',
      id: 'point-b',
      geometry: { type: 'Point', coordinates: [-73.993, 40.733] },
      properties: { label: 'B' },
    },
    {
      type: 'Feature',
      id: 'point-c',
      geometry: { type: 'Point', coordinates: [-73.988, 40.728] },
      properties: { label: 'C' },
    },
  ],
};

const HITBOX = 30;

/**
 * Demonstrates map-level long-press drag: the same pattern used by apps
 * that need to drag ShapeSource features without the `draggable` prop.
 *
 * Long-press a circle to pick it up, drag to move it, release to drop.
 * This exercises the Android fix that prevents the map from panning
 * during the drag (onMove is consumed after MAP_LONG_CLICK fires).
 */
const LongPressDragShapeSource = () => {
  const mapRef = useRef<MapView>(null);
  const [features, setFeatures] = useState(initialFeatures);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState('Long-press a circle to drag it');

  const handleLongPress = useCallback(
    async (e: Feature) => {
      console.log('[LongPressDrag] onLongPress fired', JSON.stringify(e.properties));
      if (!mapRef.current) {
        console.log('[LongPressDrag] onLongPress: mapRef not ready, aborting');
        return;
      }
      const { screenPointX, screenPointY } = (e.properties ?? {}) as {
        screenPointX: number;
        screenPointY: number;
      };
      console.log(`[LongPressDrag] querying at screen (${screenPointX}, ${screenPointY}) with hitbox ±${HITBOX}`);

      const hits = await mapRef.current.queryRenderedFeaturesInRect(
        [
          screenPointY - HITBOX,
          screenPointX + HITBOX,
          screenPointY + HITBOX,
          screenPointX - HITBOX,
        ],
        [],
        ['long-press-drag-circles'],
      );

      console.log(`[LongPressDrag] queryRenderedFeaturesInRect returned ${hits?.features?.length ?? 0} hit(s)`);
      const hit = hits?.features[0] as Feature<Point> | undefined;
      if (!hit?.id) {
        console.log('[LongPressDrag] no feature hit, not starting drag');
        return;
      }

      console.log(`[LongPressDrag] picked feature id="${hit.id}" label="${hit.properties?.label}"`);
      setActiveId(String(hit.id));
      setStatus(
        `Dragging ${hit.properties?.label ?? hit.id} — release to drop`,
      );
    },
    [],
  );

  const onTouchMove = useCallback(
    async (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      if (!activeId) {
        console.log(`[LongPressDrag] onTouchMove at (${locationX.toFixed(1)}, ${locationY.toFixed(1)}) — no activeId, skipping`);
        return;
      }
      if (!mapRef.current) {
        console.log('[LongPressDrag] onTouchMove — mapRef not ready, skipping');
        return;
      }
      console.log(`[LongPressDrag] onTouchMove dragging "${activeId}" at screen (${locationX.toFixed(1)}, ${locationY.toFixed(1)})`);
      try {
        const coord = await mapRef.current.getCoordinateFromView([
          locationX,
          locationY,
        ]);
        if (!coord) {
          console.log('[LongPressDrag] getCoordinateFromView returned null');
          return;
        }
        console.log(`[LongPressDrag] getCoordinateFromView → [${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}]`);
        setFeatures((prev) => ({
          ...prev,
          features: prev.features.map((f) =>
            String(f.id) === activeId
              ? { ...f, geometry: { type: 'Point', coordinates: coord } }
              : f,
          ),
        }));
      } catch (err) {
        console.log('[LongPressDrag] getCoordinateFromView threw:', err);
      }
    },
    [activeId],
  );

  const onTouchEnd = useCallback(() => {
    console.log(`[LongPressDrag] onTouchEnd — activeId was "${activeId}"`);
    if (activeId) {
      const label = features.features.find((f) => String(f.id) === activeId)
        ?.properties?.label ?? activeId;
      setStatus(`Dropped ${label}`);
    }
    setActiveId(null);
  }, [activeId, features]);

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        onLongPress={handleLongPress}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Camera defaultSettings={{ centerCoordinate: CENTER, zoomLevel: 14 }} />
        <ShapeSource id="long-press-drag-source" shape={features}>
          <CircleLayer
            id="long-press-drag-circles"
            style={{
              circleRadius: 18,
              circleColor: [
                'case',
                ['==', ['to-string', ['id']], activeId ?? ''],
                '#f59e0b',
                '#3b82f6',
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: [
                'case',
                ['==', ['to-string', ['id']], activeId ?? ''],
                '#b45309',
                '#1d4ed8',
              ],
            }}
          />
          <SymbolLayer
            id="long-press-drag-labels"
            style={{
              textField: ['get', 'label'],
              textColor: '#ffffff',
              textSize: 14,
              textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            }}
          />
        </ShapeSource>
      </MapView>
      <Bubble>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
            Long-press Drag (map-level)
          </Text>
          <Text style={{ textAlign: 'center' }}>{status}</Text>
        </View>
      </Bubble>
    </>
  );
};

export default LongPressDragShapeSource;

/* end-example-doc */

/** @type ExampleWithMetadata['metadata'] */
const metadata = {
  title: 'Long-press Drag (map-level)',
  tags: [
    'MapView#onLongPress',
    'MapView#onTouchMove',
    'MapView#onTouchEnd',
    'MapView#getCoordinateFromView',
    'ShapeSource',
  ],
  docs: `
Demonstrates dragging ShapeSource features using map-level touch events.
Long-press a circle to pick it up — the active circle turns amber.
Drag to move it; the GeoJSON updates live via \`getCoordinateFromView\`.
Release to drop.

This pattern (onLongPress + onTouchMove + onTouchEnd on the Map) works
identically on iOS and Android. On Android, the map does not pan during
the drag because \`OnMoveListener.onMove\` consumes the gesture after a
MAP_LONG_CLICK is dispatched.
`,
};
(LongPressDragShapeSource as any).metadata = metadata;
