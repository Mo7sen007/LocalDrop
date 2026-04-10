import { init } from "@tinyfx/runtime";
import { SessionService } from "@services/session.service";

SessionService.checkAuth();
init();
