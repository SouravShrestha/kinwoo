import { EMBED_QUERY, FEEDBACK_PATH, LEGAL_PATHS } from "@kinwoo/core/app";

import { siteOrigin } from "./site";

const LEGAL_ORIGIN = siteOrigin().replace(/\/+$/, "");

export const TERMS_URL = `${LEGAL_ORIGIN}${LEGAL_PATHS.terms}?${EMBED_QUERY}`;
export const PRIVACY_URL = `${LEGAL_ORIGIN}${LEGAL_PATHS.privacy}?${EMBED_QUERY}`;
export const FEEDBACK_URL = `${LEGAL_ORIGIN}${FEEDBACK_PATH}?${EMBED_QUERY}`;
