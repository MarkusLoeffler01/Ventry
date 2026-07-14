// Profile picture mutations (gallery upload/set-primary/delete/reorder, or
// the OAuth-avatar import during onboarding) happen in components that don't
// share state with AppHeader's own independent fetch of the primary picture.
// Dispatching this lets AppHeader (or anything else showing a cached avatar)
// know to refetch, mirroring the `$sessionSignal` pattern already used for
// forcing useSession() consumers to refetch after an out-of-band write.
export const PROFILE_PICTURE_CHANGED_EVENT = "ventry:profile-picture-changed";

export function notifyProfilePictureChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PROFILE_PICTURE_CHANGED_EVENT));
    }
}
