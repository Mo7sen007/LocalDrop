export interface ConfigDto {
  server: {
    port: number;
  };
  tls: {
    tls_enabled: boolean;
    cert_file: string;
    key_file: string;
  };
  storage: {
    base_path: string;
    max_size: number;
  };
  auth: {
    authentication: boolean;
  };
  logging: {
    logging: boolean;
    logging_level: string;
  };
}
