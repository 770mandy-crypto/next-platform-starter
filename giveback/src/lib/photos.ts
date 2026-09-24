import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase, unwrap } from './supabase';

export type LocalPhoto = { uri: string; base64: string };

const MAX_EDGE = 1280;

// Phone photos are 3–8 MB. Downscaling to 1280px JPEG keeps each under
// ~300 KB: fast to upload on mobile data, and small enough to send to the AI.
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<LocalPhoto> {
  const scale = Math.min(1, MAX_EDGE / Math.max(asset.width || MAX_EDGE, asset.height || MAX_EDGE));
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (scale < 1) ctx.resize({ width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  return { uri: saved.uri, base64: saved.base64! };
}

export async function pickPhotos(limit: number): Promise<LocalPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map(prepare));
}

export async function takePhoto(): Promise<LocalPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('לא ניתנה הרשאה למצלמה');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;
  return prepare(result.assets[0]);
}

/** Uploads into the user's own folder; returns the storage path. */
export async function uploadPhoto(userId: string, photo: LocalPhoto) {
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  unwrap(
    await supabase.storage.from('item-photos').upload(path, decode(photo.base64), {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
    }),
  );
  return path;
}
