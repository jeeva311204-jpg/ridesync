import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, db } from "./config";

export async function registerUser({ name, email, password, role, vehicleType, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  const profile = {
    uid: cred.user.uid,
    name,
    email,
    phone: phone || "",
    role: role === "driver" ? "driver" : "customer",
    vehicleType: vehicleType || "car",
    isAvailable: false,
    lat: null,
    lng: null,
    createdAt: Date.now(),
  };

  await set(ref(db, `users/${cred.user.uid}`), profile);
  return profile;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await get(ref(db, `users/${cred.user.uid}`));
  if (!snap.exists()) throw new Error("No profile found for this account");
  return snap.val();
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function updateUserProfileInfo(uid, { name, phone, vehicleType }) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (vehicleType !== undefined) updates.vehicleType = vehicleType;
  await update(ref(db, `users/${uid}`), updates);
  return updates;
}
