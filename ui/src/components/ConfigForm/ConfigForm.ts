import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { ConfigService } from "@services/config.service";
import { ServerConfigModel } from "@models/server-config.model";
import type { ConfigDto } from "@dto/config.dto";
import { toast } from "@state/toast.state";

export class ConfigForm {
  isLoading = signal<boolean>(true);
  alertMessage = signal<string>("");
  alertType = signal<string>("info");
  private initialConfig: ServerConfigModel | null = null;

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    const form = this.el.querySelector<HTMLFormElement>("[data-config-form]");
    const resetBtn = this.el.querySelector("[data-reset-btn]");
    const portInput = this.el.querySelector<HTMLInputElement>("[data-port]");
    const maxSizeInput = this.el.querySelector<HTMLInputElement>("[data-max-size]");
    const basePathInput = this.el.querySelector<HTMLInputElement>("[data-base-path]");
    const authCheckbox = this.el.querySelector<HTMLInputElement>("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector<HTMLInputElement>("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector<HTMLSelectElement>("[data-logging-level]");

    this.loadConfig();

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!this.initialConfig) return;

      const payload: ConfigDto = {
        server: { port: Number(portInput?.value) },
        tls: { tls_enabled: false, cert_file: "", key_file: "" },
        storage: {
          base_path: basePathInput?.value.trim() || "",
          max_size: Number(maxSizeInput?.value) * 1024 * 1024,
        },
        auth: { authentication: !!authCheckbox?.checked },
        logging: {
          logging: !!loggingCheckbox?.checked,
          logging_level: loggingLevelSelect?.value || "info",
        },
      };

      try {
        await ConfigService.updateConfig(payload);
        this.showAlert("Config saved. Some changes require a restart.", "success");
        this.initialConfig = ServerConfigModel.fromDto(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save config";
        this.showAlert(message, "error");
      }
    });

    resetBtn?.addEventListener("click", () => {
      if (!this.initialConfig) return;
      this.populateForm(this.initialConfig);
      this.showAlert("Changes reset.", "info");
    });

    effect(() => {
      const alertBox = this.el.querySelector<HTMLElement>("[data-alert]");
      if (alertBox) {
        const msg = this.alertMessage();
        alertBox.style.display = msg ? "block" : "none";
        if (msg) alertBox.textContent = msg;
      }
    });
  }

  private async loadConfig(): Promise<void> {
    try {
      const dto = await ConfigService.getConfig();
      this.initialConfig = ServerConfigModel.fromDto(dto);
      this.populateForm(this.initialConfig);
      this.isLoading.set(false);
    } catch {
      this.showAlert("Failed to load config. Please refresh.", "error");
    }
  }

  private populateForm(config: ServerConfigModel): void {
    const portInput = this.el.querySelector<HTMLInputElement>("[data-port]");
    const maxSizeInput = this.el.querySelector<HTMLInputElement>("[data-max-size]");
    const basePathInput = this.el.querySelector<HTMLInputElement>("[data-base-path]");
    const authCheckbox = this.el.querySelector<HTMLInputElement>("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector<HTMLInputElement>("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector<HTMLSelectElement>("[data-logging-level]");

    if (portInput) portInput.value = String(config.port);
    if (maxSizeInput) maxSizeInput.value = String(config.maxSizeMb);
    if (basePathInput) basePathInput.value = config.basePath;
    if (authCheckbox) authCheckbox.checked = config.authEnabled;
    if (loggingCheckbox) loggingCheckbox.checked = config.loggingEnabled;
    if (loggingLevelSelect) loggingLevelSelect.value = config.loggingLevel;
  }

  private showAlert(message: string, type: string): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    const alertBox = this.el.querySelector<HTMLElement>("[data-alert]");
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.textContent = message;
      alertBox.className = `retro-card-sm px-4 py-3 font-semibold alert-${type}`;
    }
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new ConfigForm(el, ctx);
  inst.init();
  return inst;
}
