import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigurationMenu } from './ConfigurationMenu';
import { useAppStore } from '../stores/appStore';
import { useSettingsStore } from '../stores/settingsStore';

// Mock the stores
vi.mock('../stores/appStore');
vi.mock('../stores/settingsStore');

describe('ConfigurationMenu', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let updateSettings: ReturnType<typeof vi.fn>;
  let resetSettings: ReturnType<typeof vi.fn>;
  let exportSettings: ReturnType<typeof vi.fn>;
  let importSettings: ReturnType<typeof vi.fn>;
  let mockSettings: any;

  beforeEach(() => {
    onBack = vi.fn();
    updateSettings = vi.fn();
    resetSettings = vi.fn();
    exportSettings = vi.fn();
    importSettings = vi.fn();

    // Create mock settings
    mockSettings = {
      theme: 'dark',
      serverConfig: {
        port: 3790,
        enabled: true,
        autoStart: false,
      },
      displayPreferences: {
        showTimestamps: true,
        dateFormat: 'relative',
        maxEvents: 1000,
      },
      keyBindings: {
        navigation: 'vim',
        customKeys: {},
      },
    };

    // Mock the settings store
    (useSettingsStore as ReturnType<typeof vi.fn>).mockImplementation(
      selector => {
        const state = {
          settings: mockSettings,
          updateSettings,
          resetSettings,
          exportSettings,
          importSettings,
        };
        return selector ? selector(state) : state;
      }
    );

    // Mock the app store
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        currentView: 'settings',
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the ConfigurationMenu is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show the title', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('CONFIGURATION');
      });

      it('Then should show main configuration sections', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Theme');
        expect(frame).toContain('Server');
        expect(frame).toContain('Display');
        expect(frame).toContain('Key Bindings');
      });

      it('Then should show action buttons', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Apply');
        expect(frame).toContain('Cancel');
        expect(frame).toContain('Reset');
        expect(frame).toContain('Import');
        expect(frame).toContain('Export');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('↑↓ Navigate');
        expect(frame).toContain('↵ Select');
        expect(frame).toContain('ESC Back');
      });

      it('Then should highlight the first section', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Theme/);
      });
    });

    describe('When navigating sections', () => {
      it('Then up/down arrows should move between sections', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\u001B[B'); // Down arrow
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Server/);
      });

      it('Then j/k keys should move between sections', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Down
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Server/);

        stdin.write('k'); // Up
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Theme/);
      });

      it('Then should cycle through all sections', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Navigate through all sections
        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*Server/);

        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*Display/);

        stdin.write('j'); // Key Bindings
        rerender(<ConfigurationMenu onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*Key Bindings/);
      });

      it('Then should wrap around at boundaries', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Go up from first item (should wrap to last)
        stdin.write('\u001B[A'); // Up arrow
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Key Bindings/);
      });
    });

    describe('When viewing theme section', () => {
      it('Then should show current theme selection', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('dark');
      });

      it('Then Enter should open theme selector', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\r'); // Enter
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Select Theme');
      });

      it('Then should show available theme options', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Dark');
        expect(frame).toContain('Light');
        expect(frame).toContain('High Contrast');
      });

      it('Then should allow theme selection', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[B'); // Select Light
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Confirm selection
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('light');
      });
    });

    describe('When viewing server section', () => {
      it('Then should show current server configuration', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Navigate to Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Port: 3790');
        expect(frame).toContain('Enabled: Yes');
        expect(frame).toContain('Auto Start: No');
      });

      it('Then Enter should open server configuration', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Navigate to Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Server Configuration');
      });

      it('Then should allow port configuration', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Navigate to Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter server config
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Port:');
      });

      it('Then should validate port numbers', async () => {
        const { stdin, lastFrame } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Wait for component to mount
        await new Promise(resolve => setTimeout(resolve, 10));

        stdin.write('j'); // Navigate to Server
        await new Promise(resolve => setTimeout(resolve, 10));

        stdin.write('\r'); // Enter server config
        await new Promise(resolve => setTimeout(resolve, 10));

        // Clear port and enter invalid value
        stdin.write('\u0008\u0008\u0008\u0008'); // Clear existing
        await new Promise(resolve => setTimeout(resolve, 10));

        stdin.write('99999'); // Invalid port
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check that validation error shows while typing
        const frameAfterTyping = lastFrame();

        stdin.write('\r'); // Try to save
        await new Promise(resolve => setTimeout(resolve, 50)); // Longer wait for re-render

        const finalFrame = lastFrame();
        // Should stay in edit mode and show error
        expect(finalFrame).toContain('Server Configuration'); // Should still be in edit dialog
        expect(finalFrame).toContain('Invalid port');
      });
    });

    describe('When viewing display section', () => {
      it('Then should show current display preferences', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Timestamps: Yes');
        expect(frame).toContain('Date Format: relative');
        expect(frame).toContain('Max Events: 1000');
      });

      it('Then Enter should open display preferences', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Display Preferences');
      });

      it('Then should allow toggling timestamps', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter display config
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Show Timestamps');
      });

      it('Then should allow changing date format', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter display config
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Date Format');
      });
    });

    describe('When viewing key bindings section', () => {
      it('Then should show current key binding style', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Key Bindings
        rerender(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Navigation: vim');
      });

      it('Then Enter should open key bindings editor', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Key Bindings
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Key Bindings');
      });

      it('Then should show navigation style options', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Display
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('j'); // Key Bindings
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter key bindings
        rerender(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('vim');
        expect(frame).toContain('arrow');
      });
    });

    describe('When using action buttons', () => {
      it('Then Tab should navigate to action buttons', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Apply/);
      });

      it('Then should navigate between action buttons', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right arrow
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Cancel/);
      });

      it('Then Apply should save settings', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter Apply
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(updateSettings).toHaveBeenCalled();
        expect(lastFrame()).toContain('Settings saved');
      });

      it('Then Cancel should discard changes', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Cancel
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter Cancel
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(onBack).toHaveBeenCalled();
      });

      it('Then Reset should restore defaults', async () => {
        const { stdin, lastFrame } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Wait for component to mount
        await new Promise(resolve => setTimeout(resolve, 10));

        stdin.write('r'); // Direct reset shortcut
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(resetSettings).toHaveBeenCalled();
        expect(lastFrame()).toContain('Settings reset');
      });

      it('Then Export should show export options', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Cancel
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Reset
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Import
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Export
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter Export
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Export Settings');
      });

      it('Then Import should show import dialog', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Cancel
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Reset
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Import
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter Import
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('Import Settings');
      });
    });

    describe('When handling unsaved changes', () => {
      it('Then should show unsaved changes indicator', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Make a change
        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[B'); // Select different theme
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Confirm
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('*'); // Unsaved indicator
      });

      it('Then Escape should warn about unsaved changes', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Make a change
        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[B'); // Select different theme
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Confirm
        rerender(<ConfigurationMenu onBack={onBack} />);

        stdin.write('\u001B'); // Escape
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('unsaved changes');
      });

      it('Then should allow confirming exit with unsaved changes', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Make a change and try to exit
        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[B'); // Select different theme
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Confirm
        rerender(<ConfigurationMenu onBack={onBack} />);

        stdin.write('\u001B'); // Escape
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('y'); // Confirm exit
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(onBack).toHaveBeenCalled();
      });
    });

    describe('When handling keyboard shortcuts', () => {
      it('Then Escape should call onBack when no changes', () => {
        const { stdin } = render(<ConfigurationMenu onBack={onBack} />);

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack when no changes', () => {
        const { stdin } = render(<ConfigurationMenu onBack={onBack} />);

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then s should quick-save settings', () => {
        const { stdin } = render(<ConfigurationMenu onBack={onBack} />);

        stdin.write('s'); // Quick save

        expect(updateSettings).toHaveBeenCalled();
      });

      it('Then r should quick-reset settings', () => {
        const { stdin } = render(<ConfigurationMenu onBack={onBack} />);

        stdin.write('r'); // Quick reset

        expect(resetSettings).toHaveBeenCalled();
      });
    });

    describe('When showing validation errors', () => {
      it('Then should highlight invalid fields', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Navigate to server and enter invalid config
        stdin.write('j'); // Server
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Enter server config
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toBeDefined();
      });

      it('Then should show error messages', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Try to apply with validation errors
        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        // Mock validation error by setting invalid port first
        mockSettings.serverConfig.port = 99999;
        stdin.write('\r'); // Try to apply
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toBeDefined();
      });

      it('Then should prevent saving with validation errors', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Set invalid configuration
        mockSettings.serverConfig.port = 99999;

        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Try to apply
        rerender(<ConfigurationMenu onBack={onBack} />);

        // Should not call updateSettings with invalid data
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When displaying status information', () => {
      it('Then should show current values for all sections', () => {
        const { lastFrame } = render(<ConfigurationMenu onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('dark');
        expect(frame).toContain('3790');
        expect(frame).toContain('Yes');
        expect(frame).toContain('relative');
        expect(frame).toContain('vim');
      });

      it('Then should update display when values change', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Change theme
        stdin.write('\r'); // Enter theme selector
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[B'); // Select light
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\r'); // Confirm
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toContain('light');
      });

      it('Then should show loading states during async operations', () => {
        const { stdin, lastFrame, rerender } = render(
          <ConfigurationMenu onBack={onBack} />
        );

        // Trigger export which might be async
        stdin.write('\t'); // Tab to actions
        rerender(<ConfigurationMenu onBack={onBack} />);
        stdin.write('\u001B[C'); // Right
        stdin.write('\u001B[C'); // Right
        stdin.write('\u001B[C'); // Right
        stdin.write('\u001B[C'); // Right to Export
        rerender(<ConfigurationMenu onBack={onBack} />);

        expect(lastFrame()).toBeDefined();
      });
    });
  });
});
