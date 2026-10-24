import { FEEDBACK_PATH, LEGAL_PATHS } from "@kinwoo/core/app";

import { siteOrigin } from "./site";

const LEGAL_ORIGIN = siteOrigin().replace(/\/+$/, "");

export const TERMS_URL = `${LEGAL_ORIGIN}${LEGAL_PATHS.terms}`;
export const PRIVACY_URL = `${LEGAL_ORIGIN}${LEGAL_PATHS.privacy}`;
export const FEEDBACK_URL = `${LEGAL_ORIGIN}${FEEDBACK_PATH}`;
