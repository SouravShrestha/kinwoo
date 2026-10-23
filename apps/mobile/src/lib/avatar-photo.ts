import { AVATAR_UPLOAD_QUALITY, AVATAR_UPLOAD_SIZE } from "@kinwoo/client/profile";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// The system picker does the draggable square crop. Returns null when the user cancels.
export async function pickAvatarPhoto(): Promise<ArrayBuffer | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (picked.canceled) return null;

  const { uri, width, height } = picked.assets[0];
  // Some Android croppers return a slightly off-square image; trim to the centre square.
  const side = Math.min(width, height);
  const image = await ImageManipulator.manipulate(uri)
    .crop({
      originX: (width - side) / 2,
      originY: (height - side) / 2,
      width: side,
      height: side,
    })
    .resize({ width: AVATAR_UPLOAD_SIZE })
    .renderAsync();
  const { uri: jpegUri } = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: AVATAR_UPLOAD_QUALITY,
  });

  return (await fetch(jpegUri)).arrayBuffer();
}
