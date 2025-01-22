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

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    })();
  }, []);

  const handleMapPress = (event: any) => {
    setSelectedLocation(event.nativeEvent.coordinate);
    openImagePicker();
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
  };

  const createNewList = () => {
    if (title.trim()) {
      const newList: List = {
        id: Date.now().toString(),
        name: title.trim(),
      };
      setLists([...lists, newList]);
      setShowListModal(false);
    }
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
      onPress={(event) => {
        // Check if the event has a coordinate (i.e., clicked on the map, not a marker)
        if (!event.nativeEvent.action) {
          setSelectedLocation(event.nativeEvent.coordinate);
          openImagePicker();
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
            e.stopPropagation();  // Prevent map onPress from triggering
          }}
        />
      ))}
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

      {/* Control Buttons */}
      <TouchableOpacity style={[styles.button, styles.listButton]} onPress={() => setShowListModal(true)}>
        <Ionicons name="list" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={handleCameraCapture}>
        <Ionicons name="camera" size={24} color="white" />
      </TouchableOpacity>

      {/* Tag Creation Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Tag</Text>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Category" value={selectedList} onChangeText={setSelectedList} />
            <TextInput style={styles.input} placeholder="Subtitle (optional)" value={subtitle} onChangeText={setSubtitle} />
            <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline />

            {/* Selected Images */}
            <FlatList data={selectedImages} horizontal renderItem={({ item }) => <Image source={{ uri: item }} style={styles.thumbnail} />} />

            <TouchableOpacity style={styles.submitButton} onPress={createNewTag}>
              <Text style={styles.submitButtonText}>Create Tag</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    top: 120,
    left: 20,
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
    height: '75%',  // Takes three-quarters of the screen
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'white',
    elevation: 10, // Shadow effect
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
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
});
