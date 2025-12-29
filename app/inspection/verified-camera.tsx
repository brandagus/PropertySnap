/**
 * Verified Camera Capture Screen
 * Camera-only capture with composition guides for forensically reliable photos
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Text as SvgText, G } from 'react-native-svg';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { fonts } from '@/constants/typography';
import { createVerifiedPhoto, formatPhotoTimestamp } from '@/lib/photo-verification';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Composition guide types for different room areas
type GuideType = 'room-overview' | 'wall' | 'corner' | 'floor' | 'ceiling' | 'fixture' | 'none';

interface GuideConfig {
  title: string;
  description: string;
  tips: string[];
}

const GUIDE_CONFIGS: Record<GuideType, GuideConfig> = {
  'room-overview': {
    title: 'Room Overview',
    description: 'Capture the entire room from corner to corner',
    tips: [
      'Stand in doorway or corner',
      'Include floor, walls, and ceiling edges',
      'Ensure good lighting',
    ],
  },
  'wall': {
    title: 'Wall Section',
    description: 'Capture a full wall surface',
    tips: [
      'Stand perpendicular to wall',
      'Include corners on both sides',
      'Show any marks or damage clearly',
    ],
  },
  'corner': {
    title: 'Corner Detail',
    description: 'Capture where two walls meet',
    tips: [
      'Center the corner in frame',
      'Show condition of both walls',
      'Include ceiling and floor edges',
    ],
  },
  'floor': {
    title: 'Floor Surface',
    description: 'Capture flooring condition',
    tips: [
      'Angle camera downward',
      'Show texture and any damage',
      'Include edges where floor meets walls',
    ],
  },
  'ceiling': {
    title: 'Ceiling Surface',
    description: 'Capture ceiling condition',
    tips: [
      'Angle camera upward',
      'Include light fixtures if present',
      'Show any stains or damage',
    ],
  },
  'fixture': {
    title: 'Fixture/Feature',
    description: 'Capture specific item or fixture',
    tips: [
      'Center the item in frame',
      'Show full item plus surroundings',
      'Capture any model numbers if visible',
    ],
  },
  'none': {
    title: 'Free Capture',
    description: 'No guide overlay',
    tips: [],
  },
};

export default function VerifiedCameraScreen() {
  const params = useLocalSearchParams<{
    roomName?: string;
    checkpointName?: string;
    guideType?: string;
  }>();
  
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  
  const guideType = (params.guideType as GuideType) || 'room-overview';
  const guideConfig = GUIDE_CONFIGS[guideType];

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      
      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }
      
      // Get GPS coordinates if available
      let gpsCoords: { latitude: number; longitude: number } | undefined;
      if (locationPermission) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          gpsCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        } catch (e) {
          console.log('Could not get GPS location');
        }
      }
      
      // Create verified photo object
      const verifiedPhoto = await createVerifiedPhoto(photo.uri, 'camera', gpsCoords);
      
      // Return to inspection screen with verified photo data
      router.back();
      router.setParams({
        verifiedPhotoUri: verifiedPhoto.uri,
        verifiedPhotoHash: verifiedPhoto.hash,
        verifiedPhotoCapturedAt: verifiedPhoto.capturedAt,
        verifiedPhotoTimestamp: verifiedPhoto.capturedTimestamp.toString(),
        verifiedPhotoMethod: 'camera',
        verifiedPhotoGpsLat: gpsCoords?.latitude?.toString() || '',
        verifiedPhotoGpsLon: gpsCoords?.longitude?.toString() || '',
      });
      
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const toggleFlash = () => {
    setFlash(flash === 'off' ? 'on' : 'off');
  };

  const toggleGuide = () => {
    setShowGuide(!showGuide);
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B2635" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <IconSymbol name="camera.fill" size={64} color="#8B2635" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          PropertySnap needs camera access to capture verified inspection photos.
          Photos must be taken directly in the app for legal reliability.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </Pressable>
        <Pressable onPress={handleClose} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flash}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.topButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </Pressable>
          
          <View style={styles.topCenter}>
            <Text style={styles.roomName}>{params.roomName || 'Inspection'}</Text>
            <Text style={styles.checkpointName}>{params.checkpointName || 'Photo'}</Text>
          </View>
          
          <View style={styles.topRight}>
            <Pressable
              onPress={toggleFlash}
              style={({ pressed }) => [
                styles.topButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol
                name={flash === 'on' ? 'bolt.fill' : 'bolt.slash.fill'}
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
            <Pressable
              onPress={toggleGuide}
              style={({ pressed }) => [
                styles.topButton,
                showGuide && styles.topButtonActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="grid" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Composition Guide Overlay */}
        {showGuide && guideType !== 'none' && (
          <View style={styles.guideOverlay}>
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.65}>
              {/* Rule of thirds grid */}
              <G opacity={0.5}>
                {/* Vertical lines */}
                <Line
                  x1={SCREEN_WIDTH / 3}
                  y1={0}
                  x2={SCREEN_WIDTH / 3}
                  y2={SCREEN_HEIGHT * 0.65}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
                <Line
                  x1={(SCREEN_WIDTH * 2) / 3}
                  y1={0}
                  x2={(SCREEN_WIDTH * 2) / 3}
                  y2={SCREEN_HEIGHT * 0.65}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
                {/* Horizontal lines */}
                <Line
                  x1={0}
                  y1={(SCREEN_HEIGHT * 0.65) / 3}
                  x2={SCREEN_WIDTH}
                  y2={(SCREEN_HEIGHT * 0.65) / 3}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
                <Line
                  x1={0}
                  y1={(SCREEN_HEIGHT * 0.65 * 2) / 3}
                  x2={SCREEN_WIDTH}
                  y2={(SCREEN_HEIGHT * 0.65 * 2) / 3}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              </G>
              
              {/* Corner brackets for framing */}
              <G stroke="#C59849" strokeWidth={3}>
                {/* Top-left corner */}
                <Line x1={20} y1={20} x2={60} y2={20} />
                <Line x1={20} y1={20} x2={20} y2={60} />
                
                {/* Top-right corner */}
                <Line x1={SCREEN_WIDTH - 20} y1={20} x2={SCREEN_WIDTH - 60} y2={20} />
                <Line x1={SCREEN_WIDTH - 20} y1={20} x2={SCREEN_WIDTH - 20} y2={60} />
                
                {/* Bottom-left corner */}
                <Line x1={20} y1={SCREEN_HEIGHT * 0.65 - 20} x2={60} y2={SCREEN_HEIGHT * 0.65 - 20} />
                <Line x1={20} y1={SCREEN_HEIGHT * 0.65 - 20} x2={20} y2={SCREEN_HEIGHT * 0.65 - 60} />
                
                {/* Bottom-right corner */}
                <Line x1={SCREEN_WIDTH - 20} y1={SCREEN_HEIGHT * 0.65 - 20} x2={SCREEN_WIDTH - 60} y2={SCREEN_HEIGHT * 0.65 - 20} />
                <Line x1={SCREEN_WIDTH - 20} y1={SCREEN_HEIGHT * 0.65 - 20} x2={SCREEN_WIDTH - 20} y2={SCREEN_HEIGHT * 0.65 - 60} />
              </G>
              
              {/* Guide type specific overlay */}
              {guideType === 'corner' && (
                <G stroke="#C59849" strokeWidth={2} strokeDasharray="5,5">
                  {/* Diagonal line for corner alignment */}
                  <Line
                    x1={SCREEN_WIDTH / 2 - 50}
                    y1={20}
                    x2={SCREEN_WIDTH / 2 + 50}
                    y2={SCREEN_HEIGHT * 0.65 - 20}
                  />
                </G>
              )}
              
              {guideType === 'wall' && (
                <G stroke="#C59849" strokeWidth={2} strokeDasharray="5,5">
                  {/* Vertical center line for wall alignment */}
                  <Line
                    x1={SCREEN_WIDTH / 2}
                    y1={20}
                    x2={SCREEN_WIDTH / 2}
                    y2={SCREEN_HEIGHT * 0.65 - 20}
                  />
                </G>
              )}
            </Svg>
          </View>
        )}

        {/* Live Timestamp Badge */}
        <View style={styles.timestampBadge}>
          <IconSymbol name="checkmark.shield.fill" size={14} color="#2E7D32" />
          <Text style={styles.timestampText}>
            {formatPhotoTimestamp(currentTime)}
          </Text>
        </View>

        {/* Guide Info Panel */}
        {showGuide && guideType !== 'none' && (
          <View style={styles.guideInfoPanel}>
            <Text style={styles.guideTitle}>{guideConfig.title}</Text>
            <Text style={styles.guideDescription}>{guideConfig.description}</Text>
            {guideConfig.tips.length > 0 && (
              <View style={styles.tipsList}>
                {guideConfig.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.captureRow}>
            {/* Verification indicator */}
            <View style={styles.verificationIndicator}>
              <IconSymbol name="checkmark.shield.fill" size={20} color="#2E7D32" />
              <Text style={styles.verificationText}>Verified Capture</Text>
            </View>
            
            {/* Capture button */}
            <Pressable
              onPress={handleCapture}
              disabled={isCapturing}
              style={({ pressed }) => [
                styles.captureButton,
                pressed && { transform: [{ scale: 0.95 }] },
                isCapturing && { opacity: 0.5 },
              ]}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#8B2635" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </Pressable>
            
            {/* GPS indicator */}
            <View style={styles.gpsIndicator}>
              <IconSymbol
                name={locationPermission ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                size={20}
                color={locationPermission ? '#2E7D32' : '#9E9E9E'}
              />
              <Text style={[
                styles.gpsText,
                !locationPermission && { color: '#9E9E9E' }
              ]}>
                {locationPermission ? 'GPS On' : 'GPS Off'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.captureHint}>
            Photos captured here are timestamped and verified for legal use
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: '#1C2839',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#8B2635',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    padding: 16,
  },
  cancelButtonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: '#687076',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  topButtonActive: {
    backgroundColor: 'rgba(197,152,73,0.3)',
  },
  topCenter: {
    alignItems: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: 8,
  },
  roomName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkpointName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  guideOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
  },
  timestampBadge: {
    position: 'absolute',
    top: 110,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  timestampText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#1C2839',
    fontWeight: '500',
  },
  guideInfoPanel: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    padding: 16,
  },
  guideTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: '#C59849',
    marginBottom: 4,
  },
  guideDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipsList: {
    gap: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#C59849',
    marginRight: 8,
    width: 12,
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  verificationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  verificationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#C59849',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B2635',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  gpsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  captureHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
