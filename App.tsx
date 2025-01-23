import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { InteractionManager } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';

interface PhotoTag {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
  listName: string;
}

interface List {
  id: string;
  name: string;
}

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [photoTags, setPhotoTags] = useState<PhotoTag[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,  // Update every second
            distanceInterval: 1  // Update every meter
          },
          (newLocation) => {
            setLocation(newLocation);
          }
        );
      }
    })();

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleMapPress = () => {
    setRenderKey((prevKey) => prevKey + 1);
    setShowConfirmPrompt(true);

  };

  const openImagePicker = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImages(result.assets.map((asset) => asset.uri));
        setShowTagModal(true);
      }
    };

  const confirmTagLocation = async () => {

    await openImagePicker();

  };

  const hideAllUIElements = () => {
    setShowTagModal(false);
    setShowConfirmPrompt(false);
    setShowListModal(false);
    setShowFilterModal(false);
    setSelectedLocation(null);
    // Reset form state if needed
    resetForm();
  };

  const cancelTagLocation = () => {
    setSelectedLocation(null);
    setShowConfirmPrompt(false);
  };
  const handleCameraCapture = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const { coords } = await Location.getCurrentPositionAsync({});
        const { latitude: currentLat, longitude: currentLon } = coords;
        setSelectedLocation({ latitude: currentLat, longitude: currentLon });
        setSelectedImages([result.assets[0].uri]);
        setShowTagModal(true);
      }
    };

  const createNewTag = () => {
    if (selectedLocation && title && selectedList) {
      const newTag: PhotoTag = {
        id: Date.now().toString(),
        title,
        subtitle,
        description,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        images: selectedImages,
        listName: selectedList,
      };

      setPhotoTags([...photoTags, newTag]);
      resetForm();
    } else {
      Alert.alert('Missing information', 'Please fill in all required fields');
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDescription('');
    setSelectedList('');
    setSelectedImages([]);
    setSelectedLocation(null);
    setShowTagModal(false);
    setShowConfirmPrompt(false);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location?.coords.latitude || -32.993008,
          longitude: location?.coords.longitude || -68.868907,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        onPress={(event) => {
          if (showTagModal || showConfirmPrompt || showListModal || showFilterModal) {
            // If anything is showing, just hide everything
            hideAllUIElements();
            return; // Don't proceed with marker placement
          }

          // If nothing is showing, proceed with normal marker placement
          if (!event.nativeEvent.action) {
            setSelectedLocation(event.nativeEvent.coordinate);
            InteractionManager.runAfterInteractions(() => {
              setShowConfirmPrompt(true);
            });
          }
        }}
      >
        {photoTags.map((tag) => (
          <Marker
            key={tag.id}
            coordinate={{
              latitude: tag.latitude,
              longitude: tag.longitude,
            }}
            title={tag.title}
            description={tag.description}
            onPress={(e) => {
              e.stopPropagation(); // Prevent map onPress from triggering

              // Hide any other UI elements if needed
              setSelectedLocation(null);
              setShowConfirmPrompt(false);
              setShowTagModal(false);
              setShowListModal(false);
              setShowFilterModal(false);
            }}
          />
        ))}

        {/* Temporary Marker */}
        {selectedLocation && (
          <Marker
            key={`marker-${renderKey}`}  // Forces re-render when key changes
            coordinate={selectedLocation}
            pinColor="blue"
            title="New Tag"
          />
        )}
      </MapView>

      {/* Search Bar */}
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
      {/* Confirmation Prompt */}
      {showConfirmPrompt && (
        <View style={[styles.confirmPrompt, { position: 'absolute', zIndex: 10 }]}>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmTagLocation}>
            <Text style={styles.confirmButtonText}>Confirm Tag</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagCancelButton} onPress={cancelTagLocation}>
            <Text style={styles.tagCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}




      {/* Control Buttons */}
      <TouchableOpacity style={[styles.button, styles.listButton]} onPress={() => setShowListModal(true)}>
        <Ionicons name="list" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={handleCameraCapture}>
        <Ionicons name="camera" size={24} color="white" />
      </TouchableOpacity>

      {/* Tag Creation Modal */}
      <Modal visible={showTagModal} animationType="slide" transparent={true}>
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();  // Hide keyboard when clicking outside
            hideAllUIElements();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContainer}
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollViewContent}
              nestedScrollEnabled={true}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={Keyboard.dismiss}  // Hide keyboard when clicking inside modal but outside inputs
                >
                  <Text style={styles.modalTitle}>Create New Tag</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Title"
                    value={title}
                    onChangeText={setTitle}
                    returnKeyType="next"  // Shows "next" instead of "return" on keyboard
                    blurOnSubmit={false}  // Prevents keyboard from hiding on submit
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Category"
                    value={selectedList}
                    onChangeText={setSelectedList}
                    returnKeyType="next"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Subtitle (optional)"
                    value={subtitle}
                    onChangeText={setSubtitle}
                    returnKeyType="next"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    returnKeyType="done"  // Shows "done" on the last input
                  />

                  {/* Selected Images */}
                  <View
                  style={styles.imagesSection}
                  >
                    <FlatList
                      data={selectedImages}
                      style={styles.imageList}
                      horizontal={true}
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}  // Allow nested scrolling
                      keyboardShouldPersistTaps="handled"  // Handle taps correctly
                      contentContainerStyle={styles.imageListContent}
                      renderItem={({ item }) => (
                        <Image
                          source={{ uri: item }}
                          style={styles.thumbnail}
                        />
                      )}
                    />
                  </View >


                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity style={styles.submitButton} onPress={createNewTag}>
                  <Text style={styles.submitButtonText}>Create Tag</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  imagesSection: {
    height: 120,
    width: '100%',
    marginVertical: 10,
  },
  imageList: {
    flex: 1,
  },
  imageListContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  confirmPrompt: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
  },
  confirmButton: {
    flex: 1,
    marginRight: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  tagCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'red',
    alignItems: 'center',
  },
  confirmPromptModal: {
    flex: 1,
  },
  cancelButtonText: { color: 'red', fontSize: 16, fontWeight: 'bold' },
  tagCancelButtonText: { color: 'white', fontSize: 16 },
  map: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
  },
  searchInput: {
    fontSize: 16,
  },
  button: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButton: {
    top: 110,
    right: 20,
  },
  cameraButton: {
    bottom: 30,
    alignSelf: 'center',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',  // Ensures modal slides up from the bottom
  },
  modalContainer: {
    maxHeight: '80%', // Limit height to allow space for keyboard
    height:'80%',
    minHeight: '30%', // Ensure minimum height for content
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'white',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    // Optional: add shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
  }
});
