import type { ConfigDto } from "@dto/config.dto";

export class ServerConfigModel {
  port: number;
  basePath: string;
  maxSizeMb: number;
  authEnabled: boolean;
  loggingEnabled: boolean;
  loggingLevel: string;

  constructor(dto: ConfigDto) {
    this.port = dto.server.port;
    this.basePath = dto.storage.base_path;
    this.maxSizeMb = Math.max(1, Math.round(dto.storage.max_size / (1024 * 1024)));
    this.authEnabled = dto.auth.authentication;
    this.loggingEnabled = dto.logging.logging;
    this.loggingLevel = dto.logging.logging_level;
  }

  static fromDto(dto: ConfigDto): ServerConfigModel {
    return new ServerConfigModel(dto);
  }

  toPayload(): ConfigDto {
    return {
      server: { port: this.port },
      tls: { tls_enabled: false, cert_file: "", key_file: "" },
      storage: {
        base_path: this.basePath,
        max_size: this.maxSizeMb * 1024 * 1024,
      },
      auth: { authentication: this.authEnabled },
      logging: {
        logging: this.loggingEnabled,
        logging_level: this.loggingLevel,
      },
    };
  }
}
