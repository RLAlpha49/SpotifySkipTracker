/**
 * Dashboard Component Export Module
 *
 * Central export point for all dashboard-related components, providing
 * a clean public API for importing dashboard functionality throughout
 * the application. This module simplifies imports by enabling consumers
 * to access all dashboard components from a single import statement.
 *
 * Exported components:
 * - ArtistSummary: Artist-specific skip pattern visualization
 * - DashboardActions: Quick action buttons for common operations
 * - DashboardLayout: Responsive container for dashboard components
 * - RecentTracks: Recently skipped tracks display
 * - SessionOverview: Recent listening session metrics
 * - StatisticsSummary: Key listening statistics and metrics
 *
 * Usage example:
 * ```
 * import { DashboardLayout, StatisticsSummary } from "@/components/dashboard";
 * ```
 */

export { ArtistSummary } from "./ArtistSummary";
export { DashboardActions } from "./DashboardActions";
export { DashboardLayout } from "./DashboardLayout";
export { RecentTracks } from "./RecentTracks";
export { SessionOverview } from "./SessionOverview";
export { StatisticsSummary } from "./StatisticsSummary";
