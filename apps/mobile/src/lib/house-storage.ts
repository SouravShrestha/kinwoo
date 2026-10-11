import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "@kinwoo/client/houses";

export const houseStorage: KeyValueStorage = AsyncStorage;
