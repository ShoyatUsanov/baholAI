// Compatibility shim — the app layout now lives in AppLayout (Sidebar + Topbar).
// Existing imports (`Layout` default, `PageHeader`, `homeFor`) keep working.
export { default, PageHeader, homeFor } from './AppLayout';
