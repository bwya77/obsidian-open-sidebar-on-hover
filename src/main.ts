import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface OpenSidebarHoverSettings {
  leftSidebar: boolean;
  rightSidebar: boolean;
  syncLeftRight: boolean;
  enforceSameDelay: boolean;
  sidebarDelay: number;
  sidebarExpandDelay: number;
  leftSideBarPixelTrigger: number;
  rightSideBarPixelTrigger: number;
  overlayMode: boolean;
  expandCollapseSpeed: number;
  leftSidebarMaxWidth: number;
  rightSidebarMaxWidth: number;
}

const DEFAULT_SETTINGS: OpenSidebarHoverSettings = {
  leftSidebar: true,
  rightSidebar: true,
  syncLeftRight: false,
  enforceSameDelay: true,
  sidebarDelay: 150,
  sidebarExpandDelay: 10,
  leftSideBarPixelTrigger: 20,
  rightSideBarPixelTrigger: 20,
  overlayMode: false,
  expandCollapseSpeed: 370,
  leftSidebarMaxWidth: 325,
  rightSidebarMaxWidth: 325,
};

export default class OpenSidebarHover extends Plugin {
  settings: OpenSidebarHoverSettings;
  isHoveringLeft = false;
  isHoveringRight = false;
  leftSplit: any;
  rightSplit: any;
  leftRibbon: any;
  leftSplitMouseEnterHandler: () => void;
  rightSplitMouseEnterHandler: () => void;
  leftSplitMouseMoveHandler: () => void;
  rightSplitMouseMoveHandler: () => void;
  
  // Event handler for document clicks
  documentClickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Make sure leftSplit and rightSplit are initialized
    if (!this.leftSplit || !this.rightSplit) return;
    
    const leftSplitEl = this.leftSplit.containerEl;
    const rightSplitEl = this.rightSplit.containerEl;
    
    // If clicking outside sidebar areas and they're expanded, collapse them
    if (!leftSplitEl.contains(target) && !rightSplitEl.contains(target)) {
      if (!this.leftSplit.collapsed && this.settings.leftSidebar) {
        this.collapseLeft();
      }
      if (!this.rightSplit.collapsed && this.settings.rightSidebar) {
        this.collapseRight();
      }
    }
  };

  async onload() {
    await this.loadSettings();

    // Apply overlay mode class if enabled in settings
    if (this.settings.overlayMode) {
      document.body.classList.add("sidebar-overlay-mode");
    }
    
    // Add global CSS class to implement the suggested JS-CSS approach
    document.body.classList.add("open-sidebar-hover-plugin");

    // Set CSS variables for animation speeds and max widths
    this.applyCSSVariables();
    this.app.workspace.onLayoutReady(() => {
      this.leftSplit = this.app.workspace.leftSplit;
      this.rightSplit = this.app.workspace.rightSplit;

      this.leftRibbon = this.app.workspace.leftRibbon;
      
      // Apply width settings immediately to the sidebars if they exist
      this.applySidebarWidth(this.leftSplit, this.settings.leftSidebarMaxWidth);
      this.applySidebarWidth(this.rightSplit, this.settings.rightSidebarMaxWidth);

      // add event listeners - IMPORTANT: REMOVE IN UNLOAD()
      document.addEventListener("mousemove", this.mouseMoveHandler);
      
      // Enhanced implementation with hover class for right split
      this.rightSplitMouseMoveHandler = () => this.rightSplit.containerEl.addClass('hovered');
      this.rightSplit.containerEl.addEventListener(
        "mousemove", 
        this.rightSplitMouseMoveHandler
      );
      this.rightSplit.containerEl.addEventListener(
        "mouseleave",
        this.rightSplitMouseLeaveHandler
      );
      this.rightSplitMouseEnterHandler = () => { 
        this.isHoveringRight = true; 
        this.rightSplit.containerEl.addClass('hovered');
      };
      this.rightSplit.containerEl.addEventListener(
        "mouseenter",
        this.rightSplitMouseEnterHandler
      );
      
      // Enhanced implementation with hover class for left split
      (this.leftRibbon as any).containerEl.addEventListener(
        "mouseenter",
        this.leftRibbonMouseEnterHandler
      );
      this.leftSplitMouseMoveHandler = () => this.leftSplit.containerEl.addClass('hovered');
      this.leftSplit.containerEl.addEventListener(
        "mousemove", 
        this.leftSplitMouseMoveHandler
      );
      this.leftSplit.containerEl.addEventListener(
        "mouseleave",
        this.leftSplitMouseLeaveHandler
      );
      this.leftSplitMouseEnterHandler = () => { 
        this.isHoveringLeft = true; 
        this.leftSplit.containerEl.addClass('hovered');
      };
      this.leftSplit.containerEl.addEventListener(
        "mouseenter",
        this.leftSplitMouseEnterHandler
      );
      
      // Add a document-wide click handler to help with collapse issues
      document.addEventListener("click", this.documentClickHandler);
    });

    this.addSettingTab(new SidebarHoverSettingsTab(this.app, this));
  }

  onunload() {
    this.saveSettings();

    // Remove overlay mode class if it was added
    document.body.classList.remove("sidebar-overlay-mode");
    
    // Remove the global CSS class
    document.body.classList.remove("open-sidebar-hover-plugin");

    // remove all event listeners
    document.removeEventListener("mousemove", this.mouseMoveHandler);
    document.removeEventListener("click", this.documentClickHandler);
    
    // Clean up right split event listeners
    this.rightSplit.containerEl.removeEventListener(
      "mouseleave",
      this.rightSplitMouseLeaveHandler
    );
    this.rightSplit.containerEl.removeEventListener(
      "mouseenter",
      this.rightSplitMouseEnterHandler
    );
    
    // Also remove the new mousemove listener for hover class
    if (this.rightSplit && this.rightSplit.containerEl) {
      const oldMousemove = () => this.rightSplit.containerEl.addClass('hovered');
      this.rightSplit.containerEl.removeEventListener("mousemove", oldMousemove);
    }
    
    // Clean up left split event listeners
    (this.leftRibbon as any).containerEl.removeEventListener(
      "mouseenter",
      this.leftRibbonMouseEnterHandler
    );
    this.leftSplit.containerEl.removeEventListener(
      "mouseleave",
      this.leftSplitMouseLeaveHandler
    );
    this.leftSplit.containerEl.removeEventListener(
      "mouseenter",
      this.leftSplitMouseEnterHandler
    );
    
    // Also remove the new mousemove listener for hover class
    if (this.leftSplit && this.leftSplit.containerEl) {
      const oldMousemove = () => this.leftSplit.containerEl.addClass('hovered');
      this.leftSplit.containerEl.removeEventListener("mousemove", oldMousemove);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Helper method to apply CSS variables
  applyCSSVariables() {
    document.documentElement.style.setProperty('--sidebar-expand-collapse-speed', `${this.settings.expandCollapseSpeed}ms`);
    document.documentElement.style.setProperty('--sidebar-expand-delay', `${this.settings.sidebarExpandDelay}ms`);
    document.documentElement.style.setProperty('--left-sidebar-max-width', `${this.settings.leftSidebarMaxWidth}px`);
    document.documentElement.style.setProperty('--right-sidebar-max-width', `${this.settings.rightSidebarMaxWidth}px`);
    
    // Try to also use Obsidian's CSS variables if they exist
    document.body.style.setProperty('--sidebar-width', `${this.settings.leftSidebarMaxWidth}px`);
    document.body.style.setProperty('--right-sidebar-width', `${this.settings.rightSidebarMaxWidth}px`);
  }
  
  // Try to apply sidebar width using various methods
  applySidebarWidth(split: any, width: number) {
    if (!split || !split.containerEl) return;
    
    // Set transition first to ensure smooth animation
    const transitionValue = `width var(--sidebar-expand-collapse-speed) ease, max-width var(--sidebar-expand-collapse-speed) ease`;
    split.containerEl.style.transition = transitionValue;
    
    // Direct style manipulation
    split.containerEl.style.width = `${width}px`;
    split.containerEl.style.maxWidth = `${width}px`;
    
    // Try various Obsidian internal methods
    const methodsToTry = ['resize', 'setWidth', 'setSize', 'onResize'];
    for (const method of methodsToTry) {
      if (typeof split[method] === 'function') {
        try {
        split[method](width);
        break; // Stop if we found a working method
        } catch (e) {
          // Method failed, try the next one
        }
      }
    }
  }

  // -- Non-Obsidian API --------------------------
  // Helpers
  getEditorWidth = () => this.app.workspace.containerEl.clientWidth;

  expandRight() {
    // Start animation by expanding
    this.rightSplit.expand();
    this.isHoveringRight = true;
    
    // Wait a short time to ensure the expansion animation starts
    setTimeout(() => {
      // Then apply the width with our helper method
      this.applySidebarWidth(this.rightSplit, this.settings.rightSidebarMaxWidth);
    }, 50); // Small delay to let expansion animation start
  }
  expandLeft() {
    // Start animation by expanding
    this.leftSplit.expand();
    this.isHoveringLeft = true;
    
    // Wait a short time to ensure the expansion animation starts
    setTimeout(() => {
      // Then apply the width with our helper method
      this.applySidebarWidth(this.leftSplit, this.settings.leftSidebarMaxWidth);
    }, 50); // Small delay to let expansion animation start
  }
  expandBoth() {
    this.expandRight();
    this.expandLeft();
  }
  collapseRight() {
    this.rightSplit.collapse();
    this.isHoveringRight = false;
  }
  collapseLeft() {
    this.leftSplit.collapse();
    this.isHoveringLeft = false;
  }
  collapseBoth() {
    this.collapseRight();
    this.collapseLeft();
  }
  // Event handlers
  mouseMoveHandler = (event: MouseEvent) => {
    const mouseX = event.clientX;
    
    // Handle right sidebar hover
    if (this.settings.rightSidebar) {
      if (!this.isHoveringRight && this.rightSplit.collapsed) {
        const editorWidth = this.getEditorWidth();

        this.isHoveringRight =
          mouseX >= editorWidth - this.settings.rightSideBarPixelTrigger;

        if (this.isHoveringRight && this.rightSplit.collapsed) {
          setTimeout(() => {
            if (this.isHoveringRight) {
              if (this.settings.syncLeftRight) {
                this.expandBoth();
              } else {
                this.expandRight();
              }
            }
          }, this.settings.sidebarExpandDelay);
        }

        setTimeout(() => {
          if (!this.isHoveringRight) {
            this.collapseRight();
          }
        }, this.settings.sidebarDelay);
      }
    }
    
    // Handle left sidebar hover
    if (this.settings.leftSidebar) {
      if (!this.isHoveringLeft && this.leftSplit.collapsed) {
        // Check if mouse is in the left trigger area
        this.isHoveringLeft = mouseX <= this.settings.leftSideBarPixelTrigger;

        if (this.isHoveringLeft && this.leftSplit.collapsed) {
          setTimeout(() => {
            if (this.isHoveringLeft) {
              if (this.settings.syncLeftRight) {
                this.expandBoth();
              } else {
                this.expandLeft();
              }
            }
          }, this.settings.sidebarExpandDelay);
        }

        setTimeout(() => {
          if (!this.isHoveringLeft) {
            this.collapseLeft();
          }
        }, this.settings.sidebarDelay);
      }
    }
  };

  rightSplitMouseLeaveHandler = (event: MouseEvent) => {
    // Don't process if we're leaving to the tab header container or a menu
    const target = event.relatedTarget as HTMLElement;
    if (target && (target.closest('.workspace-tab-header-container-inner') || target?.hasClass('menu') || target?.classList?.contains('menu') || target?.closest('.menu'))) {
      return;
    }
    
    if (this.settings.rightSidebar) {
      this.isHoveringRight = false;
      // Remove the hovered class
      this.rightSplit.containerEl.removeClass('hovered');

      setTimeout(() => {
        if (!this.isHoveringRight) {
          if (this.settings.syncLeftRight && this.settings.leftSidebar) {
            this.collapseBoth();
          } else {
            this.collapseRight();
          }
        }
      }, this.settings.sidebarDelay);
    }
  };

  leftSplitMouseLeaveHandler = (event: MouseEvent) => {
    // Don't process if we're leaving to the tab header container or a menu
    const target = event.relatedTarget as HTMLElement;
    if (target && (target.closest('.workspace-tab-header-container-inner') || target?.hasClass('menu') || target?.classList?.contains('menu') || target?.closest('.menu'))) {
      return;
    }

    if (this.settings.leftSidebar) {
      this.isHoveringLeft = false;
      // Remove the hovered class
      this.leftSplit.containerEl.removeClass('hovered');

      setTimeout(() => {
        if (!this.isHoveringLeft) {
          if (this.settings.syncLeftRight && this.settings.rightSidebar) {
            this.collapseBoth();
          } else {
            this.collapseLeft();
          }
        }
      }, this.settings.sidebarDelay);
    }
  };

  leftRibbonMouseEnterHandler = () => {
    if (this.settings.leftSidebar) {
      this.isHoveringLeft = true;
      setTimeout(() => {
        // Check if still hovering
        if (this.isHoveringLeft) {
          if (this.settings.syncLeftRight && this.settings.rightSidebar) {
            this.expandBoth();
          } else {
            this.expandLeft();
          }
        }
      }, this.settings.sidebarExpandDelay);
    }
  };
}

class SidebarHoverSettingsTab extends PluginSettingTab {
  plugin: OpenSidebarHover;

  constructor(app: App, plugin: OpenSidebarHover) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // BASIC SETTINGS (no heading)
    new Setting(containerEl)
      .setName("Left Sidebar Hover")
      .setDesc(
        "Enables the expansion and collapsing of the left sidebar on hover."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.leftSidebar).onChange(async (value) => {
          this.plugin.settings.leftSidebar = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Right Sidebar Hover")
      .setDesc(
        "Enables the expansion and collapsing of the right sidebar on hover. Only collapses the right panel unless you have a right ribbon."
      )
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.rightSidebar)
          .onChange(async (value) => {
            this.plugin.settings.rightSidebar = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sync Left and Right")
      .setDesc(
        "If enabled, hovering over the right sidebar will also expand the left sidebar at the same time, and vice versa. (Left and Right sidebar must both be enabled above)"
      )
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.syncLeftRight)
          .onChange(async (value) => {
            this.plugin.settings.syncLeftRight = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Overlay Mode")
      .setDesc(
        "When enabled, sidebars will slide over the main content without affecting the layout. When disabled, sidebars will expand by pushing content."
      )
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.overlayMode)
          .onChange(async (value) => {
            this.plugin.settings.overlayMode = value;
            
            // Update CSS class on body to toggle overlay mode
            if (value) {
              document.body.classList.add("sidebar-overlay-mode");
            } else {
              document.body.classList.remove("sidebar-overlay-mode");
            }
            
            await this.plugin.saveSettings();
          })
      );
      
    // BEHAVIOR SECTION
    new Setting(containerEl).setName("Behavior").setHeading();

    new Setting(containerEl)
      .setName("Left Sidebar Pixel Trigger")
      .setDesc(
        "Specify the number of pixels from the left edge of the editor that will trigger the left sidebar to open on hover (must be greater than 0)"
      )
      .addText((text) => {
        text
          .setPlaceholder("30")
          .setValue(this.plugin.settings.leftSideBarPixelTrigger.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!value || isNaN(v) || v < 1) {
              this.plugin.settings.leftSideBarPixelTrigger =
                DEFAULT_SETTINGS.leftSideBarPixelTrigger;
            } else {
              this.plugin.settings.leftSideBarPixelTrigger = v;
            }
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Right Sidebar Pixel Trigger")
      .setDesc(
        "Specify the number of pixels from the right edge of the editor that will trigger the right sidebar to open on hover (must be greater than 0)"
      )
      .addText((text) => {
        text
          .setPlaceholder("30")
          .setValue(this.plugin.settings.rightSideBarPixelTrigger.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!value || isNaN(v) || v < 1) {
              this.plugin.settings.rightSideBarPixelTrigger =
                DEFAULT_SETTINGS.rightSideBarPixelTrigger;
            } else {
              this.plugin.settings.rightSideBarPixelTrigger = v;
            }
            await this.plugin.saveSettings();
          });
      });

    // TIMING SECTION
    new Setting(containerEl).setName("Timing").setHeading();

    new Setting(containerEl)
      .setName("Sidebar Collapse Delay")
      .setDesc(
        "The delay in milliseconds before the sidebar collapses after the mouse has left. Enter '0' to disable delay."
      )
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(this.plugin.settings.sidebarDelay.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!v || isNaN(v) || v < 0) {
              this.plugin.settings.sidebarDelay = DEFAULT_SETTINGS.sidebarDelay;
            } else {
              this.plugin.settings.sidebarDelay = v;
            }
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Sidebar Expand Delay")
      .setDesc(
        "The delay in milliseconds before the sidebar expands after hovering. Default is 200ms."
      )
      .addText((text) => {
        text
          .setPlaceholder("200")
          .setValue(this.plugin.settings.sidebarExpandDelay.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!v || isNaN(v) || v < 0) {
              this.plugin.settings.sidebarExpandDelay = DEFAULT_SETTINGS.sidebarExpandDelay;
            } else {
              this.plugin.settings.sidebarExpandDelay = v;
            }
            // Apply the CSS variables immediately
            this.plugin.applyCSSVariables();
            await this.plugin.saveSettings();
          });
      });
      
    new Setting(containerEl)
      .setName("Expand/Collapse Animation Speed")
      .setDesc(
        "The speed of the sidebar expand/collapse animation in milliseconds."
      )
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(this.plugin.settings.expandCollapseSpeed?.toString() || "300")
          .onChange(async (value) => {
            const v = Number(value);
            if (!value || isNaN(v) || v < 0) {
              this.plugin.settings.expandCollapseSpeed = DEFAULT_SETTINGS.expandCollapseSpeed;
            } else {
              this.plugin.settings.expandCollapseSpeed = v;
            }
            // Apply the CSS variables immediately
            this.plugin.applyCSSVariables();
            await this.plugin.saveSettings();
          });
      });

    // APPEARANCE SECTION
    new Setting(containerEl).setName("Appearance").setHeading();

    new Setting(containerEl)
      .setName("Left Sidebar Maximum Width")
      .setDesc(
        "Specify the maximum width in pixels for the left sidebar when expanded"
      )
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(this.plugin.settings.leftSidebarMaxWidth.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!value || isNaN(v) || v < 100) {
              this.plugin.settings.leftSidebarMaxWidth = DEFAULT_SETTINGS.leftSidebarMaxWidth;
            } else {
              this.plugin.settings.leftSidebarMaxWidth = v;
            }
            // Apply the CSS variables immediately
            this.plugin.applyCSSVariables();
            
            // If sidebar is expanded, update it immediately
            if (this.plugin.leftSplit && !this.plugin.leftSplit.collapsed) {
              this.plugin.applySidebarWidth(this.plugin.leftSplit, this.plugin.settings.leftSidebarMaxWidth);
            }
            
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Right Sidebar Maximum Width")
      .setDesc(
        "Specify the maximum width in pixels for the right sidebar when expanded"
      )
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(this.plugin.settings.rightSidebarMaxWidth.toString())
          .onChange(async (value) => {
            const v = Number(value);
            if (!value || isNaN(v) || v < 100) {
              this.plugin.settings.rightSidebarMaxWidth = DEFAULT_SETTINGS.rightSidebarMaxWidth;
            } else {
              this.plugin.settings.rightSidebarMaxWidth = v;
            }
            // Apply the CSS variables immediately
            this.plugin.applyCSSVariables();
            
            // If sidebar is expanded, update it immediately
            if (this.plugin.rightSplit && !this.plugin.rightSplit.collapsed) {
              this.plugin.applySidebarWidth(this.plugin.rightSplit, this.plugin.settings.rightSidebarMaxWidth);
            }
            
            await this.plugin.saveSettings();
          });
      });
  }
}