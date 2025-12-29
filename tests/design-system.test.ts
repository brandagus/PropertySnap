import { describe, it, expect } from "vitest";

// Test the design system constants - only test theme colors since typography uses Platform.select
describe("Design System", () => {
  describe("Theme Colors", () => {
    it("should have burgundy as primary color", async () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.primary.light).toBe("#8B2635");
    });

    it("should have navy as foreground color", async () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.foreground.light).toBe("#1C2839");
    });

    it("should have ochre gold as accent color", async () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.accent.light).toBe("#C59849");
    });

    it("should have proper neutral colors", async () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.background.light).toBe("#FFFFFF");
      expect(themeConfig.themeColors.surface.light).toBe("#F9F7F4");
      expect(themeConfig.themeColors.muted.light).toBe("#6B6B6B");
      expect(themeConfig.themeColors.border.light).toBe("#E8E6E3");
    });

    it("should have proper status colors", async () => {
      const themeConfig = require("../theme.config.js");
      expect(themeConfig.themeColors.success.light).toBe("#2D5C3F");
      expect(themeConfig.themeColors.warning.light).toBe("#D97706");
      expect(themeConfig.themeColors.error.light).toBe("#991B1B");
    });

    it("should have consistent dark mode colors (same as light for professional look)", async () => {
      const themeConfig = require("../theme.config.js");
      // Dark mode uses same colors for consistent professional appearance
      expect(themeConfig.themeColors.primary.dark).toBe("#8B2635");
      expect(themeConfig.themeColors.foreground.dark).toBe("#1C2839");
    });
  });
});
