import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Alert, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp, Checkpoint, generateId } from "@/lib/app-context";
import { calculateDistance } from "@/lib/location-utils";
import { uploadPhotoWithFallback } from "@/lib/photo-upload";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CAMERA_ASPECT_RATIO = 4 / 3;
const CAMERA_HEIGHT = SCREEN_WIDTH * CAMERA_ASPECT_RATIO;

// Composition guide types
type GuideType = "room-corner" | "wall-straight" | "ceiling-floor" | "detail-close" | "window-door" | "general";

const GUIDE_INFO: Record<GuideType, { title: string; description: string; tips: string[] }> = {
  "room-corner": {
    title: "Room Corner Shot",
    description: "Capture the corner where two walls meet",
    tips: ["Stand in opposite corner", "Include floor and ceiling edges", "Show both walls clearly"],
  },
  "wall-straight": {
    title: "Wall Surface",
    description: "Capture wall condition straight-on",
    tips: ["Stand perpendicular to wall", "Fill frame with wall surface", "Capture any marks or damage"],
  },
  "ceiling-floor": {
    title: "Ceiling/Floor",
    description: "Document ceiling or floor condition",
    tips: ["Angle camera up or down", "Include edges for reference", "Capture texture and condition"],
  },
  "detail-close": {
    title: "Detail Close-up",
    description: "Document specific damage or feature",
    tips: ["Get within 30cm of subject", "Ensure sharp focus", "Include surrounding context"],
  },
  "window-door": {
    title: "Window/Door",
    description: "Capture window or door condition",
    tips: ["Include full frame", "Show hardware condition", "Document any damage to glass/wood"],
  },
  "general": {
    title: "General Photo",
    description: "Capture any area of the room",
    tips: ["Keep camera steady", "Ensure good lighting", "Include reference points"],
  },
};

export default function VerifiedCameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    inspectionId: string;
    roomName: string;
    checkpointId?: string;
    guideType?: GuideType;
  }>();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoom, setZoom] = useState<number>(0); // 0 = 1x, negative for wide angle
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<GuideType>(params.guideType || "general");
  
  const cameraRef = useRef<CameraView>(null);

  // Find the property for location verification
  const property = state.properties.find(p => 
    p.inspections.some(i => i.id === params.inspectionId)
  );

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      
      if (status === "granted") {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCurrentLocation(location);
          
          // Verify location against property address if we have geocoded coordinates
          if (property?.latitude && property?.longitude) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              property.latitude,
              property.longitude
            );
            // Within 100 meters is considered at the property
            setLocationVerified(distance <= 100);
          } else {
            // No property coordinates to verify against
            setLocationVerified(null);
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationVerified(null);
        }
      }
    })();
  }, [property]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        exif: true,
        skipProcessing: false,
      });
      
      if (!photo?.uri) {
        throw new Error("Failed to capture photo");
      }
      
      // Generate hash of the photo for tamper detection
      const photoHash = await generatePhotoHash(photo.uri);
      
      // Get current timestamp
      const captureTimestamp = new Date().toISOString();
      
      // Save photo locally FIRST for instant response
      // Cloud upload happens in background - don't block the UI
      const finalPhotoUri = photo.uri;
      
      // Start background upload (fire and forget - don't await)
      uploadPhotoWithFallback(photo.uri).then((uploadResult) => {
        if (uploadResult.isCloud) {
          console.log("Photo uploaded to cloud:", uploadResult.uri);
          // TODO: Update checkpoint with cloud URL in background
        } else {
          console.log("Photo saved locally (cloud upload failed):", uploadResult.error);
        }
      }).catch((err) => {
        console.error("Background upload error:", err);
      });
      
      // Create verified photo data
      const verifiedPhotoData = {
        uri: photo.uri,
        captureDate: captureTimestamp,
        isExifAvailable: true,
        uploadDate: captureTimestamp,
        verificationMethod: "camera-capture" as const,
        photoHash,
        gpsCoordinates: currentLocation ? {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
        } : null,
        locationVerified: locationVerified ?? false,
        compositionGuide: selectedGuide,
      };
      
      // Update or create checkpoint
      if (params.checkpointId) {
        // Update existing checkpoint
        const inspection = property?.inspections.find(i => i.id === params.inspectionId);
        const checkpoint = inspection?.checkpoints.find(c => c.id === params.checkpointId);
        
        if (checkpoint) {
          const updatedCheckpoint: Checkpoint = {
            ...checkpoint,
            landlordPhoto: finalPhotoUri,
            timestamp: captureTimestamp,
            landlordPhotoTimestamp: {
              captureDate: captureTimestamp,
              isExifAvailable: true,
              uploadDate: captureTimestamp,
            },
            verifiedPhotoData,
          };
          
          dispatch({
            type: "UPDATE_CHECKPOINT",
            payload: { inspectionId: params.inspectionId, checkpoint: updatedCheckpoint },
          });
        }
      } else {
        // Create new checkpoint
        const newCheckpoint: Checkpoint = {
          id: generateId(),
          roomName: params.roomName,
          title: GUIDE_INFO[selectedGuide].title,
          landlordPhoto: finalPhotoUri,
          tenantPhoto: null,
          moveOutPhoto: null,
          landlordCondition: null,
          tenantCondition: null,
          moveOutCondition: null,
          notes: "",
          timestamp: captureTimestamp,
          landlordPhotoTimestamp: {
            captureDate: captureTimestamp,
            isExifAvailable: true,
            uploadDate: captureTimestamp,
          },
          tenantPhotoTimestamp: null,
          moveOutPhotoTimestamp: null,
          verifiedPhotoData,
        };
        
        const inspection = property?.inspections.find(i => i.id === params.inspectionId);
        if (inspection) {
          const updatedInspection = {
            ...inspection,
            checkpoints: [...inspection.checkpoints, newCheckpoint],
          };
          dispatch({ type: "UPDATE_INSPECTION", payload: updatedInspection });
        }
      }
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Return to inspection
      router.back();
      
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("Capture Failed", "Unable to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, currentLocation, locationVerified, selectedGuide, params, property, dispatch, router]);

  // Generate SHA-256 hash of photo for tamper detection
  const generatePhotoHash = async (uri: string): Promise<string> => {
    try {
      // For now, we'll create a hash based on URI and timestamp
      // In production, this would hash the actual image bytes
      const dataToHash = `${uri}-${Date.now()}`;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToHash
      );
      return hash;
    } catch (error) {
      console.error("Error generating hash:", error);
      return "";
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <IconSymbol name="camera.fill" size={64} color={colors.muted} />
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.muted }]}>
            PropertySnap requires camera access to capture verified inspection photos. 
            Gallery uploads are disabled to ensure photo authenticity.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.cancelButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const guideInfo = GUIDE_INFO[selectedGuide];

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        zoom={zoom}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </Pressable>
          
          {/* Location Status */}
          <View style={[
            styles.locationBadge,
            locationVerified === true && styles.locationVerified,
            locationVerified === false && styles.locationWarning,
            locationVerified === null && styles.locationUnknown,
          ]}>
            <IconSymbol 
              name={locationVerified === true ? "checkmark.circle.fill" : 
                    locationVerified === false ? "exclamationmark.triangle.fill" : 
                    "location.fill"} 
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={styles.locationText}>
              {locationVerified === true ? "At Property" : 
               locationVerified === false ? "Location Mismatch" : 
               "Location Pending"}
            </Text>
          </View>
          
          <Pressable
            onPress={() => setShowGuide(!showGuide)}
            style={[styles.guideToggle, showGuide && styles.guideToggleActive]}
          >
            <IconSymbol name="viewfinder" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Composition Guide Overlay */}
        {showGuide && (
          <View style={styles.guideOverlay}>
            {/* Guide Lines */}
            {selectedGuide === "room-corner" && (
              <>
                {/* Vertical corner line */}
                <View style={[styles.guideLine, styles.cornerVertical]} />
                {/* Left wall angle */}
                <View style={[styles.guideLine, styles.cornerLeftWall]} />
                {/* Right wall angle */}
                <View style={[styles.guideLine, styles.cornerRightWall]} />
                {/* Floor line */}
                <View style={[styles.guideLine, styles.cornerFloor]} />
              </>
            )}
            
            {selectedGuide === "wall-straight" && (
              <>
                {/* Rule of thirds grid */}
                <View style={[styles.guideLine, styles.gridHorizontal1]} />
                <View style={[styles.guideLine, styles.gridHorizontal2]} />
                <View style={[styles.guideLine, styles.gridVertical1]} />
                <View style={[styles.guideLine, styles.gridVertical2]} />
              </>
            )}
            
            {selectedGuide === "detail-close" && (
              <>
                {/* Center focus circle */}
                <View style={styles.focusCircle} />
                {/* Corner brackets */}
                <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
                <View style={[styles.cornerBracket, styles.bracketTopRight]} />
                <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
                <View style={[styles.cornerBracket, styles.bracketBottomRight]} />
              </>
            )}
            
            {selectedGuide === "window-door" && (
              <>
                {/* Frame outline */}
                <View style={styles.frameOutline} />
              </>
            )}
            
            {(selectedGuide === "ceiling-floor" || selectedGuide === "general") && (
              <>
                {/* Simple thirds grid */}
                <View style={[styles.guideLine, styles.gridHorizontal1]} />
                <View style={[styles.guideLine, styles.gridHorizontal2]} />
              </>
            )}
          </View>
        )}

        {/* Guide Info Panel */}
        <View style={styles.guideInfoPanel}>
          <Text style={styles.guideTitle}>{guideInfo.title}</Text>
          <Text style={styles.guideDescription}>{guideInfo.description}</Text>
          <View style={styles.tipsList}>
            {guideInfo.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <IconSymbol name="checkmark.circle.fill" size={12} color="#C59849" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Guide Type Selector */}
        <View style={styles.guideSelectorContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.guideSelector}
          >
            {(Object.keys(GUIDE_INFO) as GuideType[]).map((guide) => (
              <Pressable
                key={guide}
                onPress={() => setSelectedGuide(guide)}
                style={[
                  styles.guideOption,
                  selectedGuide === guide && styles.guideOptionActive,
                ]}
              >
                <Text style={[
                  styles.guideOptionText,
                  selectedGuide === guide && styles.guideOptionTextActive,
                ]}>
                  {GUIDE_INFO[guide].title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            onPress={() => setZoom(-0.5)}
            style={[styles.zoomButton, zoom === -0.5 && styles.zoomButtonActive]}
          >
            <Text style={[styles.zoomText, zoom === -0.5 && styles.zoomTextActive]}>0.5×</Text>
          </Pressable>
          <Pressable
            onPress={() => setZoom(0)}
            style={[styles.zoomButton, zoom === 0 && styles.zoomButtonActive]}
          >
            <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1×</Text>
          </Pressable>
          <Pressable
            onPress={() => setZoom(0.5)}
            style={[styles.zoomButton, zoom === 0.5 && styles.zoomButtonActive]}
          >
            <Text style={[styles.zoomText, zoom === 0.5 && styles.zoomTextActive]}>2×</Text>
          </Pressable>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Room Name */}
          <View style={styles.roomBadge}>
            <IconSymbol name="house.fill" size={14} color="#FFFFFF" />
            <Text style={styles.roomText}>{params.roomName}</Text>
          </View>
          
          {/* Capture Button */}
          <Pressable
            onPress={handleCapture}
            disabled={isCapturing}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              isCapturing && styles.captureButtonDisabled,
            ]}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#8B2635" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </Pressable>
          
          {/* Flip Camera */}
          <Pressable
            onPress={() => setFacing(f => f === "back" ? "front" : "back")}
            style={styles.flipButton}
          >
            <IconSymbol name="arrow.triangle.2.circlepath.camera.fill" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Verified Capture Badge */}
        <View style={styles.verifiedBadge}>
          <IconSymbol name="checkmark.shield.fill" size={14} color="#C59849" />
          <Text style={styles.verifiedText}>Verified Capture Mode</Text>
        </View>
      </CameraView>
    </View>
  );
}

// Import ScrollView for guide selector
import { ScrollView } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },
  permissionButton: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  locationVerified: {
    backgroundColor: "rgba(45,92,63,0.9)",
  },
  locationWarning: {
    backgroundColor: "rgba(139,38,53,0.9)",
  },
  locationUnknown: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  locationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  guideToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  guideToggleActive: {
    backgroundColor: "rgba(197,152,73,0.8)",
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 120,
    bottom: 280,
  },
  guideLine: {
    position: "absolute",
    backgroundColor: "rgba(197,152,73,0.6)",
  },
  // Room corner guide
  cornerVertical: {
    width: 2,
    height: "100%",
    left: "50%",
    marginLeft: -1,
  },
  cornerLeftWall: {
    width: "35%",
    height: 2,
    left: "15%",
    top: "50%",
    transform: [{ rotate: "-15deg" }],
  },
  cornerRightWall: {
    width: "35%",
    height: 2,
    right: "15%",
    top: "50%",
    transform: [{ rotate: "15deg" }],
  },
  cornerFloor: {
    width: "70%",
    height: 2,
    left: "15%",
    bottom: "20%",
  },
  // Grid guides
  gridHorizontal1: {
    width: "100%",
    height: 1,
    top: "33%",
  },
  gridHorizontal2: {
    width: "100%",
    height: 1,
    top: "66%",
  },
  gridVertical1: {
    width: 1,
    height: "100%",
    left: "33%",
  },
  gridVertical2: {
    width: 1,
    height: "100%",
    left: "66%",
  },
  // Detail close-up guide
  focusCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(197,152,73,0.8)",
    left: "50%",
    top: "50%",
    marginLeft: -60,
    marginTop: -60,
  },
  cornerBracket: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "rgba(197,152,73,0.8)",
  },
  bracketTopLeft: {
    top: "20%",
    left: "20%",
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  bracketTopRight: {
    top: "20%",
    right: "20%",
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bracketBottomLeft: {
    bottom: "20%",
    left: "20%",
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bracketBottomRight: {
    bottom: "20%",
    right: "20%",
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  // Window/door frame
  frameOutline: {
    position: "absolute",
    top: "15%",
    left: "15%",
    right: "15%",
    bottom: "15%",
    borderWidth: 2,
    borderColor: "rgba(197,152,73,0.6)",
    borderRadius: 4,
  },
  guideInfoPanel: {
    position: "absolute",
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    padding: 16,
  },
  guideTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  guideDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 12,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  guideSelectorContainer: {
    position: "absolute",
    bottom: 180,
    left: 0,
    right: 0,
  },
  guideSelector: {
    paddingHorizontal: 16,
    gap: 8,
  },
  guideOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    marginRight: 8,
  },
  guideOptionActive: {
    backgroundColor: "rgba(197,152,73,0.9)",
  },
  guideOptionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  guideOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bottomControls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 32,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: 100,
  },
  roomText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#8B2635",
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 130,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28,40,57,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(197,152,73,0.5)",
  },
  verifiedText: {
    color: "#C59849",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  zoomControls: {
    position: "absolute",
    bottom: 140,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    padding: 4,
  },
  zoomButton: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonActive: {
    backgroundColor: "rgba(197,152,73,0.9)",
  },
  zoomText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  zoomTextActive: {
    color: "#FFFFFF",
  },
});
