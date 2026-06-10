// Shared return shape for all server-action form handlers. `error` surfaces a
// message to the form; `ok` signals success for actions that stay on the page
// (others redirect on success and simply return undefined).
export type ActionState = { error?: string; ok?: boolean } | undefined;
