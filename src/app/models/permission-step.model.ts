/**
 * Identifies which system permission/settings step is needed.
 * Used as a key for tracking skips and routing execution.
 */
export enum PermissionStepType {
  /** Android 13+ notification runtime permission (system dialog, not settings) */
  NOTIFICATION_PERMISSION = 'notification_permission',
  /** Android 12+ exact alarm permission (opens system settings) */
  EXACT_ALARM = 'exact_alarm',
  /** Battery optimization exemption (opens system dialog / settings) */
  BATTERY_OPTIMIZATION = 'battery_optimization',
  /** OEM-specific background permissions (opens OEM-specific settings) */
  OEM_BACKGROUND = 'oem_background',
}

/**
 * Describes a single permission step that requires user interaction.
 * Contains all information needed to display an explanatory alert.
 */
export interface PermissionStep {
  /** Unique identifier for this step */
  type: PermissionStepType;
  /** Alert header title */
  title: string;
  /** Main explanation: what the app needs and why */
  message: string;
  /** What the user will see next (settings screen description) */
  settingsScreenDescription: string;
  /** Manufacturer key for OEM steps (e.g., 'xiaomi', 'samsung') */
  manufacturer?: string;
}

/**
 * Result of the permission step check.
 * Groups steps by whether they require user confirmation.
 */
export interface PermissionCheckResult {
  /** Steps that need user confirmation before execution */
  steps: PermissionStep[];
  /** Steps that were already granted (no action needed) */
  granted: PermissionStepType[];
  /** Steps that are not applicable on this device */
  notApplicable: PermissionStepType[];
}
