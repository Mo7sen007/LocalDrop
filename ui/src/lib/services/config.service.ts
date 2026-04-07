import { http } from "@services/http";
import type { ConfigDto } from "@dto/config.dto";

export const ConfigService = {
  async getConfig(): Promise<ConfigDto> {
    return http.get<ConfigDto>("/config/api");
  },

  async updateConfig(payload: ConfigDto): Promise<void> {
    await http.put("/config/api", JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
